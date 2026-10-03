/**
 * BscScan verification orchestration (SERVER-ONLY).
 *
 * Accepts ONLY { chainId, txHash } and proves everything server-side:
 * receipt success, TokenCreated from the expected factory, V1 provenance
 * on-chain, then deterministic input reconstruction, then a single
 * upstream submission. The BscScan key is touched only after every proof
 * passes. External/arbitrary contracts are rejected before any key use.
 *
 * All chain access, storage, fetch and time are injected, so tests run
 * fully deterministic with fakes — no network, no key, no database.
 */

import {
  BscScanError,
  checkVerificationStatus,
  isContractSourceVerified,
  submitVerification,
  type FetchImpl,
} from "./bscscan";
import {
  buildStandardJson,
  encodeTokenConstructorArgs,
  reconstructTokenConfig,
  type ProvenDeploymentEvidence,
} from "./inputs";
import { V1_GENERATOR } from "../manage/classification";
import { verifyDeployment, type ChainReader, type QuoteSnapshotInput } from "../deployments/verify";
import type { VerificationStore } from "./store";

export type VerifyServiceErrorCode =
  | "invalid-request"
  | "rate-limited"
  | "chain-unavailable"
  | "rpc-unavailable"
  | "tx-missing"
  | "tx-reverted"
  | "factory-mismatch"
  | "event-missing"
  | "non-bnbtokermaker"
  | "evidence-incomplete"
  | "indexing-delay"
  | "guid-unknown"
  | "status-unknown"
  | "timeout"
  | "upstream-unavailable"
  | "malformed-response"
  | "already-verified"
  | "verification-pending"
  | "verification-failed"
  | "attempts-exhausted"
  | "operator-unavailable"
  | "unavailable";

export class VerifyServiceError extends Error {
  readonly code: VerifyServiceErrorCode;
  readonly httpStatus: number;
  readonly retryable: boolean;
  constructor(code: VerifyServiceErrorCode, httpStatus: number, retryable: boolean, detail: string) {
    super(`Verification ${code}: ${detail}`);
    this.name = "VerifyServiceError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.retryable = retryable;
  }
}

/** Minimum ms between upstream status polls for one contract (anti-amplification). */
export const STATUS_POLL_MIN_INTERVAL_MS = 45_000;
/** Hard cap on upstream I/O per contract before automatic polling stops. */
export const MAX_VERIFICATION_ATTEMPTS = 25;
/** Terminal upstream/server codes: never auto-resubmit. */
const TERMINAL_CODES = new Set([
  "compiler-mismatch",
  "submission-rejected",
  "config-missing-key",
]);

export type PublicVerificationState = {
  chainId: number;
  contractAddress: string;
  status: "not_started" | "submitting" | "pending" | "verified" | "failed";
  alreadyKnown: boolean;
  attempts: number;
  lastErrorCode: string | null;
  verifiedAt: string | null;
};

export type VerifyServiceDeps = {
  /** Required by requestVerification; unused by status polling. */
  chain?: ChainReader;
  /** Required by requestVerification; unused by status polling. */
  expectedFactory?: `0x${string}` | null;
  /** Required by requestVerification; unused by status polling. */
  quoteForFeatures?: (
    featureIds: string[]
  ) => QuoteSnapshotInput | Promise<QuoteSnapshotInput>;
  /** Required by requestVerification; unused by status polling. */
  readTokenViews?: (token: `0x${string}`) => Promise<Record<string, unknown> | null>;
  store: VerificationStore;
  fetchImpl?: FetchImpl;
  nowMs?: () => number;
  /**
   * Test-only recovery tuning (delays/sleep). Production omits this and
   * gets the conservative defaults (3 attempts, 400/800 ms real backoff).
   */
  viewRecovery?: {
    maxAttempts?: number;
    delaysMs?: readonly number[];
    sleep?: (ms: number) => Promise<void>;
  };
};

function serviceError(
  code: VerifyServiceErrorCode,
  httpStatus: number,
  retryable: boolean,
  detail: string
): VerifyServiceError {
  return new VerifyServiceError(code, httpStatus, retryable, detail);
}

function isTxHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

function publicState(input: {
  chainId: number;
  contractAddress: string;
  status: PublicVerificationState["status"];
  alreadyKnown: boolean;
  attempts: number;
  lastErrorCode: string | null;
  verifiedAt: Date | null;
}): PublicVerificationState {
  return {
    chainId: input.chainId,
    contractAddress: input.contractAddress,
    status: input.status,
    alreadyKnown: input.alreadyKnown,
    attempts: input.attempts,
    lastErrorCode: input.lastErrorCode,
    verifiedAt: input.verifiedAt ? input.verifiedAt.toISOString() : null,
  };
}

function asAddress(value: unknown): `0x${string}` | null {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value)
    ? (value.toLowerCase() as `0x${string}`)
    : null;
}

/**
 * Prove the hinted transaction is a genuine factory deployment and return
 * the derived facts. Throws sanitized VerifyServiceError otherwise.
 * No key use, no writes.
 */
async function proveDeployment(
  chainId: number,
  txHash: `0x${string}`,
  deps: {
    chain: ChainReader;
    expectedFactory: `0x${string}` | null;
    quoteForFeatures: (
      featureIds: string[]
    ) => QuoteSnapshotInput | Promise<QuoteSnapshotInput>;
  }
) {
  if (!deps.expectedFactory) {
    throw serviceError("chain-unavailable", 503, false, "no factory configured for this chain");
  }
  let record;
  try {
    record = await verifyDeployment({
      hint: { chainId, txHash },
      chain: deps.chain,
      expectedFactory: deps.expectedFactory,
      quoteForFeatures: deps.quoteForFeatures,
    });
  } catch (error) {
    const code =
      error instanceof Error && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code === "tx-missing") throw serviceError("tx-missing", 404, true, "transaction not found yet");
    if (code === "receipt-missing") throw serviceError("tx-missing", 404, true, "receipt not available yet");
    if (code === "tx-reverted") throw serviceError("tx-reverted", 422, false, "transaction did not succeed");
    if (code === "factory-mismatch" || code === "fee-mismatch") {
      throw serviceError("factory-mismatch", 422, false, "not a genuine factory deployment");
    }
    if (code === "event-missing") throw serviceError("event-missing", 422, false, "no TokenCreated event");
    throw serviceError("rpc-unavailable", 503, true, "chain reads unavailable");
  }
  return record;
}

/**
 * Prove V1 provenance on-chain and reconstruct the exact constructor
 * values. All 22 fields must be present with correct types; anything less
 * is evidence-incomplete (retryable), never a negative verdict.
 *
 * Exported for regression tests so the reader-faithful seam (real reader
 * request list → this function → encoder) is exercised directly.
 */
export async function proveProvenanceAndReconstruct(
  record: Awaited<ReturnType<typeof verifyDeployment>>,
  readTokenViews: (token: `0x${string}`) => Promise<Record<string, unknown> | null>
) {
  const token = record.contractAddress;
  let views: Record<string, unknown> | null;
  try {
    views = await readTokenViews(token);
  } catch {
    views = null;
  }
  if (!views) {
    throw serviceError("evidence-incomplete", 503, true, "token views unavailable");
  }
  const factoryRaw = views["FACTORY"];
  if (factoryRaw === undefined) {
    throw serviceError("evidence-incomplete", 503, true, "factory view unavailable");
  }
  const factory = asAddress(factoryRaw);
  if (factory !== record.factoryAddress.toLowerCase()) {
    throw serviceError("non-bnbtokermaker", 422, false, "factory provenance missing");
  }
  const generatorRaw = views["GENERATOR"];
  if (generatorRaw === undefined) {
    throw serviceError("evidence-incomplete", 503, true, "generator view unavailable");
  }
  if (generatorRaw !== V1_GENERATOR) {
    throw serviceError("non-bnbtokermaker", 422, false, "generator provenance missing");
  }
  for (const marker of ["maxSupply", "totalMinted", "swapBackEnabled"] as const) {
    if (views[marker] === undefined || views[marker] === null) {
      throw serviceError("evidence-incomplete", 503, true, `marker ${marker} unavailable`);
    }
  }
  const ownerRaw = views["owner"];
  if (ownerRaw === undefined) {
    throw serviceError("evidence-incomplete", 503, true, "owner view unavailable");
  }
  const owner = asAddress(ownerRaw);
  if (owner !== record.deployerAddress.toLowerCase()) {
    throw serviceError("non-bnbtokermaker", 422, false, "owner binding missing");
  }
  const get = (name: string): unknown => views?.[name];
  const big = (name: string): bigint => {
    const v = get(name);
    if (v === undefined || v === null) {
      throw serviceError("evidence-incomplete", 503, true, `view ${name} unavailable`);
    }
    if (typeof v !== "bigint" || v < 0n) {
      throw serviceError("evidence-incomplete", 503, true, `view ${name} has unexpected type`);
    }
    return v;
  };
  const bool = (name: string): boolean => {
    const v = get(name);
    if (v === undefined || v === null) {
      throw serviceError("evidence-incomplete", 503, true, `view ${name} unavailable`);
    }
    if (typeof v !== "boolean") {
      throw serviceError("evidence-incomplete", 503, true, `view ${name} has unexpected type`);
    }
    return v;
  };
  const addr = (name: string): `0x${string}` => {
    if (get(name) === undefined || get(name) === null) {
      throw serviceError("evidence-incomplete", 503, true, `view ${name} unavailable`);
    }
    const v = asAddress(get(name));
    if (!v) throw serviceError("evidence-incomplete", 503, true, `view ${name} has unexpected type`);
    return v;
  };
  const evidence: ProvenDeploymentEvidence = {
    event: {
      name: record.tokenName,
      symbol: record.tokenSymbol,
      decimals: record.decimals,
      initialSupply: BigInt(record.initialSupplyBase),
    },
    owner: record.deployerAddress.toLowerCase() as `0x${string}`,
    scalars: {
      burnable: bool("burnable"),
      mintable: bool("mintable"),
      pausable: bool("pausable"),
      maxTxAmount: big("maxTxAmount"),
      maxWalletAmount: big("maxWalletAmount"),
      blacklistEnabled: bool("blacklistEnabled"),
      whitelistEnabled: bool("whitelistEnabled"),
      buyTaxBps: big("buyTaxBps"),
      sellTaxBps: big("sellTaxBps"),
      marketingWallet: addr("marketingWallet"),
      marketingShareBps: big("marketingShareBps"),
      liquidityShareBps: big("liquidityShareBps"),
      autoLiquidityEnabled: bool("autoLiquidityEnabled"),
      swapThreshold: big("swapThreshold"),
      antiBotEnabled: bool("antiBotEnabled"),
      snipeBlocks: big("snipeBlocks"),
      maxSupply: big("maxSupply"),
    },
  };
  try {
    return reconstructTokenConfig(evidence);
  } catch {
    throw serviceError("evidence-incomplete", 503, true, "constructor evidence malformed");
  }
}

/**
 * Bounded recovery for transient token-view RPC incompleteness.
 *
 * Retries ONLY evidence that is missing/unavailable (every retryable
 * throw in proveProvenanceAndReconstruct ends in "unavailable").
 * Terminal provenance failures (factory/generator/owner mismatch),
 * malformed deterministic evidence, unsupported chains and invalid
 * deployments are never retried — they propagate on the first attempt.
 * Maximum 3 attempts total (immediate, ~400 ms, ~800 ms); the final
 * incomplete attempt rethrows the honest evidence-incomplete error.
 * No loops, no polling, no client/browser retry involvement.
 */
export const VIEW_RECOVERY_MAX_ATTEMPTS = 3;
export const VIEW_RECOVERY_DELAYS_MS = [400, 800] as const;

export function isRetryableEvidenceError(error: unknown): boolean {
  return (
    error instanceof VerifyServiceError &&
    error.code === "evidence-incomplete" &&
    error.message.endsWith("unavailable")
  );
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withBoundedViewRecovery<T>(
  attempt: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delaysMs?: readonly number[];
    sleep?: (ms: number) => Promise<void>;
    onAttempt?: (attempt: number) => void;
  } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? VIEW_RECOVERY_MAX_ATTEMPTS;
  const sleep = options.sleep ?? defaultSleep;
  let lastError: unknown = null;
  for (let n = 1; n <= maxAttempts; n += 1) {
    options.onAttempt?.(n);
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      if (!isRetryableEvidenceError(error) || n >= maxAttempts) throw error;
      const wait =
        options.delaysMs?.[n - 1] ??
        VIEW_RECOVERY_DELAYS_MS[n - 1] ??
        VIEW_RECOVERY_DELAYS_MS[VIEW_RECOVERY_DELAYS_MS.length - 1] ??
        800;
      if (wait > 0) await sleep(wait);
    }
  }
  throw lastError;
}

function toServiceError(error: unknown): VerifyServiceError {
  if (error instanceof VerifyServiceError) return error;
  if (error instanceof BscScanError) {
    if (error.code === "already-verified") {
      return serviceError("already-verified", 200, false, "already verified");
    }
    if (error.code === "config-missing-key") {
      return serviceError("operator-unavailable", 503, false, "verification service unavailable");
    }
    if (TERMINAL_CODES.has(error.code)) {
      return serviceError("verification-failed", 422, false, error.code);
    }
    // Preserve specific retryable upstream codes (rate-limited,
    // indexing-delay, timeouts, …) so clients and stored rows keep the
    // honest reason instead of a generic "unavailable".
    const retryable: VerifyServiceErrorCode[] = [
      "rate-limited",
      "indexing-delay",
      "guid-unknown",
      "status-unknown",
      "timeout",
      "upstream-unavailable",
      "malformed-response",
    ];
    if (retryable.includes(error.code as VerifyServiceErrorCode)) {
      return serviceError(error.code as VerifyServiceErrorCode, 503, true, error.code);
    }
    return serviceError("unavailable", 503, true, error.code);
  }
  return serviceError("unavailable", 503, true, "verification unavailable");
}

/**
 * POST handler logic: prove → dedupe → submit → persist.
 * Returns the sanitized public state (never a GUID, never key material).
 */
export async function requestVerification(
  chainId: number,
  txHash: string,
  deps: VerifyServiceDeps
): Promise<PublicVerificationState> {
  if (!Number.isInteger(chainId)) {
    throw serviceError("invalid-request", 400, false, "chainId is invalid");
  }
  if (!isTxHash(txHash)) {
    throw serviceError("invalid-request", 400, false, "txHash is malformed");
  }
  if (!deps.expectedFactory) {
    throw serviceError("invalid-request", 400, false, "chain is not supported");
  }
  if (!deps.chain || !deps.quoteForFeatures || !deps.readTokenViews) {
    throw serviceError("operator-unavailable", 503, false, "verification service unavailable");
  }
  const chain = deps.chain;
  const expectedFactory = deps.expectedFactory;
  const quoteForFeatures = deps.quoteForFeatures;
  const readTokenViews = deps.readTokenViews;
  try {
    const record = await proveDeployment(chainId, txHash, {
      chain,
      expectedFactory,
      quoteForFeatures,
    });
    const token = record.contractAddress;
    const { row } = await deps.store.getOrCreate(chainId, token, txHash);
    if (row.status === "verified") {
      return publicState({
        chainId,
        contractAddress: token,
        status: "verified",
        alreadyKnown: row.guid === null,
        attempts: row.attempts,
        lastErrorCode: row.lastErrorCode,
        verifiedAt: row.verifiedAt,
      });
    }
    if (row.status === "pending" && row.guid) {
      return publicState({
        chainId,
        contractAddress: token,
        status: "pending",
        alreadyKnown: false,
        attempts: row.attempts,
        lastErrorCode: row.lastErrorCode,
        verifiedAt: null,
      });
    }
    if (row.status === "failed" && row.lastErrorCode && TERMINAL_CODES.has(row.lastErrorCode)) {
      const updated =
        (await deps.store.updateState(chainId, token, { attempts: row.attempts })) ?? row;
      return publicState({
        chainId,
        contractAddress: token,
        status: "failed",
        alreadyKnown: false,
        attempts: updated.attempts,
        lastErrorCode: row.lastErrorCode,
        verifiedAt: null,
      });
    }
    const constructorValues = await withBoundedViewRecovery(
      () => proveProvenanceAndReconstruct(record, readTokenViews),
      {
        ...(deps.viewRecovery ?? {}),
      }
    );
    const constructorArgsHex = encodeTokenConstructorArgs(constructorValues);
    const standardJson = buildStandardJson(chainId);
    const { fetchImpl } = deps;
    // Dedup: BscScan may already show source (e.g. verified manually).
    try {
      const shown = await isContractSourceVerified({
        chainId,
        contractAddress: token,
        ...(fetchImpl ? { fetchImpl } : {}),
      });
      if (shown) {
        const updated =
          (await deps.store.updateState(chainId, token, {
            status: "verified",
            guid: null,
            lastErrorCode: null,
            verifiedAt: new Date(),
          })) ?? row;
        return publicState({
          chainId,
          contractAddress: token,
          status: "verified",
          alreadyKnown: true,
          attempts: updated.attempts,
          lastErrorCode: null,
          verifiedAt: updated.verifiedAt,
        });
      }
    } catch (error) {
      if (error instanceof BscScanError && !error.retryable) throw toServiceError(error);
      // Retryable getsourcecode failures fall through to submission.
    }
    await deps.store.updateState(chainId, token, { status: "submitting" });
    try {
      const { guid } = await submitVerification({
        chainId,
        contractAddress: token,
        standardJson,
        constructorArgsHex,
        ...(fetchImpl ? { fetchImpl } : {}),
      });
      const updated =
        (await deps.store.updateState(chainId, token, {
          status: "pending",
          guid,
          attempts: row.attempts + 1,
          lastErrorCode: null,
        })) ?? row;
      return publicState({
        chainId,
        contractAddress: token,
        status: "pending",
        alreadyKnown: false,
        attempts: updated.attempts,
        lastErrorCode: null,
        verifiedAt: null,
      });
    } catch (error) {
      const mapped = toServiceError(error);
      if (mapped.code === "already-verified") {
        const updated =
          (await deps.store.updateState(chainId, token, {
            status: "verified",
            guid: null,
            lastErrorCode: null,
            verifiedAt: new Date(),
          })) ?? row;
        return publicState({
          chainId,
          contractAddress: token,
          status: "verified",
          alreadyKnown: true,
          attempts: updated.attempts,
          lastErrorCode: null,
          verifiedAt: updated.verifiedAt,
        });
      }
      await deps.store.updateState(chainId, token, {
        status: mapped.retryable ? "pending" : "failed",
        attempts: row.attempts + 1,
        lastErrorCode: mapped.code === "verification-failed" ? "compiler-mismatch" : mapped.code,
      });
      throw mapped;
    }
  } catch (error) {
    throw toServiceError(error);
  }
}

/**
 * Status-poll logic: refresh-safe, restart-safe, bounded, non-amplifying.
 * Performs at most one upstream check per call, and none when the last
 * poll is younger than STATUS_POLL_MIN_INTERVAL_MS.
 */
export async function pollVerificationStatus(
  chainId: number,
  contractAddress: string,
  deps: VerifyServiceDeps
): Promise<PublicVerificationState> {
  if (!Number.isInteger(chainId)) {
    throw serviceError("invalid-request", 400, false, "chainId is invalid");
  }
  const token = asAddress(contractAddress);
  if (!token) {
    throw serviceError("invalid-request", 400, false, "contract address is malformed");
  }
  try {
    const row = await deps.store.findByContract(chainId, token);
    if (!row) {
      return publicState({
        chainId,
        contractAddress: token,
        status: "not_started",
        alreadyKnown: false,
        attempts: 0,
        lastErrorCode: null,
        verifiedAt: null,
      });
    }
    if (row.status === "verified") {
      return publicState({
        chainId,
        contractAddress: token,
        status: "verified",
        alreadyKnown: row.guid === null,
        attempts: row.attempts,
        lastErrorCode: null,
        verifiedAt: row.verifiedAt,
      });
    }
    if (row.status === "failed") {
      return publicState({
        chainId,
        contractAddress: token,
        status: "failed",
        alreadyKnown: false,
        attempts: row.attempts,
        lastErrorCode: row.lastErrorCode,
        verifiedAt: null,
      });
    }
    if (row.status !== "pending" || !row.guid) {
      return publicState({
        chainId,
        contractAddress: token,
        status: row.status === "pending" ? "pending" : "not_started",
        alreadyKnown: false,
        attempts: row.attempts,
        lastErrorCode: row.lastErrorCode,
        verifiedAt: null,
      });
    }
    if (row.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      const updated =
        (await deps.store.updateState(chainId, token, {
          status: "failed",
          lastErrorCode: "attempts-exhausted",
        })) ?? row;
      return publicState({
        chainId,
        contractAddress: token,
        status: "failed",
        alreadyKnown: false,
        attempts: updated.attempts,
        lastErrorCode: "attempts-exhausted",
        verifiedAt: null,
      });
    }
    const now = deps.nowMs ? deps.nowMs() : Date.now();
    const updatedAt = row.updatedAt instanceof Date ? row.updatedAt.getTime() : now;
    if (now - updatedAt < STATUS_POLL_MIN_INTERVAL_MS) {
      return publicState({
        chainId,
        contractAddress: token,
        status: "pending",
        alreadyKnown: false,
        attempts: row.attempts,
        lastErrorCode: row.lastErrorCode,
        verifiedAt: null,
      });
    }
    const { fetchImpl } = deps;
    try {
      const verdict = await checkVerificationStatus({
        chainId,
        guid: row.guid,
        ...(fetchImpl ? { fetchImpl } : {}),
      });
      if (verdict.state === "verified") {
        const updated =
          (await deps.store.updateState(chainId, token, {
            status: "verified",
            lastErrorCode: null,
            verifiedAt: new Date(),
          })) ?? row;
        return publicState({
          chainId,
          contractAddress: token,
          status: "verified",
          alreadyKnown: verdict.alreadyKnown,
          attempts: updated.attempts,
          lastErrorCode: null,
          verifiedAt: updated.verifiedAt,
        });
      }
      if (verdict.state === "failed") {
        const updated =
          (await deps.store.updateState(chainId, token, {
            status: "failed",
            attempts: row.attempts + 1,
            lastErrorCode: "verification-failed",
          })) ?? row;
        return publicState({
          chainId,
          contractAddress: token,
          status: "failed",
          alreadyKnown: false,
          attempts: updated.attempts,
          lastErrorCode: "verification-failed",
          verifiedAt: null,
        });
      }
      const updated =
        (await deps.store.updateState(chainId, token, { attempts: row.attempts + 1 })) ?? row;
      return publicState({
        chainId,
        contractAddress: token,
        status: "pending",
        alreadyKnown: false,
        attempts: updated.attempts,
        lastErrorCode: row.lastErrorCode,
        verifiedAt: null,
      });
    } catch (error) {
      const mapped = toServiceError(error);
      const updated =
        (await deps.store.updateState(chainId, token, {
          status: mapped.retryable ? "pending" : "failed",
          attempts: row.attempts + 1,
          lastErrorCode: mapped.code,
        })) ?? row;
      if (!mapped.retryable) throw mapped;
      return publicState({
        chainId,
        contractAddress: token,
        status: "pending",
        alreadyKnown: false,
        attempts: updated.attempts,
        lastErrorCode: mapped.code,
        verifiedAt: null,
      });
    }
  } catch (error) {
    throw toServiceError(error);
  }
}
