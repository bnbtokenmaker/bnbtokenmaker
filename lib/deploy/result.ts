/**
 * Post-success result recovery (read-only).
 *
 * After a REAL confirmed on-chain success, DeployFlow stores a minimal
 * versioned hint in tab-scoped sessionStorage. On a same-tab refresh the
 * flow may restore the success UI — but ONLY after re-verifying the stored
 * transaction against BSC Testnet (receipt exists, status success, expected
 * TokenCreated event from the expected factory, decoded address consistent
 * with the hint).
 *
 * The stored record is NEVER proof of success and NEVER authorizes anything:
 * - no private keys, signatures, provider objects, calldata, pricing, or
 *   wallet authorization is stored;
 * - recovery performs exactly one read (`eth_getTransactionReceipt`) and has
 *   no wallet/provider/send capability by construction (see
 *   `fetchAndVerifyDeployResult`, whose only dependency is a receipt getter);
 * - any verification failure fails closed to the normal review/deploy state.
 */

import { PHASE6B_CHAIN_ID } from "./phase6b";
import { DeployFlowError } from "./errors";
import { parseTokenCreatedLog } from "../token/factory";

export const DEPLOY_RESULT_VERSION = 1 as const;
export const DEPLOY_RESULT_KEY = "btm-deploy-result-v1";
export const DEPLOY_RESULT_CHAIN_ID = PHASE6B_CHAIN_ID;
/** Stale hints older than this are ignored (centralized, tested). */
export const DEPLOY_RESULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type DeployResultV1 = {
  version: typeof DEPLOY_RESULT_VERSION;
  chainId: typeof DEPLOY_RESULT_CHAIN_ID;
  txHash: `0x${string}`;
  /** Recovery hint only — the verified address always comes from the receipt. */
  contractAddress: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  savedAt: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Strict shape check: exact version/chain, well-formed hash/address, sane text. */
export function parseDeployResult(input: unknown): DeployResultV1 | null {
  if (!isRecord(input)) return null;
  if (input.version !== DEPLOY_RESULT_VERSION) return null;
  if (input.chainId !== DEPLOY_RESULT_CHAIN_ID) return null;
  if (
    typeof input.txHash !== "string" ||
    !/^0x[a-fA-F0-9]{64}$/.test(input.txHash)
  ) {
    return null;
  }
  if (
    typeof input.contractAddress !== "string" ||
    !/^0x[a-fA-F0-9]{40}$/.test(input.contractAddress)
  ) {
    return null;
  }
  if (
    typeof input.tokenName !== "string" ||
    input.tokenName.trim().length === 0 ||
    input.tokenName.length > 200 ||
    typeof input.tokenSymbol !== "string" ||
    input.tokenSymbol.trim().length === 0 ||
    input.tokenSymbol.length > 32 ||
    typeof input.savedAt !== "number" ||
    !Number.isFinite(input.savedAt)
  ) {
    return null;
  }
  return {
    version: DEPLOY_RESULT_VERSION,
    chainId: DEPLOY_RESULT_CHAIN_ID,
    txHash: input.txHash as `0x${string}`,
    contractAddress: input.contractAddress as `0x${string}`,
    tokenName: input.tokenName,
    tokenSymbol: input.tokenSymbol,
    savedAt: input.savedAt,
  };
}

export function saveDeployResult(
  result: Omit<DeployResultV1, "version" | "chainId" | "savedAt"> & {
    savedAt?: number;
  }
): void {
  try {
    const record: DeployResultV1 = {
      version: DEPLOY_RESULT_VERSION,
      chainId: DEPLOY_RESULT_CHAIN_ID,
      txHash: result.txHash,
      contractAddress: result.contractAddress,
      tokenName: result.tokenName,
      tokenSymbol: result.tokenSymbol,
      savedAt: typeof result.savedAt === "number" ? result.savedAt : Date.now(),
    };
    if (!parseDeployResult(record)) return;
    storage()?.setItem(DEPLOY_RESULT_KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable — in-memory success state still applies */
  }
}

/** Pure freshness check (centralized stale-result age, tested). */
export function isDeployResultFresh(
  parsed: DeployResultV1,
  now: number = Date.now()
): boolean {
  if (!Number.isFinite(now)) return false;
  return now - parsed.savedAt <= DEPLOY_RESULT_MAX_AGE_MS;
}

/** Returns null for absent/malformed/stale records (fail closed). */
export function loadDeployResult(now: number = Date.now()): DeployResultV1 | null {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(DEPLOY_RESULT_KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = parseDeployResult(JSON.parse(raw));
    if (!parsed) return null;
    if (!isDeployResultFresh(parsed, now)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDeployResult(): void {
  try {
    storage()?.removeItem(DEPLOY_RESULT_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Receipt verification (pure — no network, no wallet, no send capability).
// ---------------------------------------------------------------------------

export type ReceiptLogInput = {
  address?: unknown;
  topics?: unknown;
  data?: unknown;
};

export type ReceiptInput = {
  status?: unknown;
  logs?: unknown;
};

export type VerifiedDeployment = {
  /** Address derived from the verified receipt event — never from storage. */
  token: `0x${string}`;
};

function asHexString(value: unknown): `0x${string}` | null {
  return typeof value === "string" && /^0x[a-fA-F0-9]*$/.test(value)
    ? (value as `0x${string}`)
    : null;
}

/** Receipt success across viem ("success") and ethers-style ("0x1"/1) shapes. */
function isSuccessfulStatus(status: unknown): boolean {
  return status === "success" || status === "0x1" || status === 1;
}

/**
 * Verify a fetched receipt against a stored result hint. Returns the token
 * address DECODED FROM THE RECEIPT EVENT. Throws DeployFlowError when
 * anything is unverifiable:
 * - missing receipt            → "receipt-timeout" (submitted-but-unknown)
 * - reverted status            → "tx-reverted"
 * - no usable TokenCreated log from the expected factory → "event-missing"
 * - decoded address differs from the stored hint → "event-missing"
 *   (consistency check: storage alone can never establish success)
 */
export function verifyDeploymentReceipt(input: {
  receipt: ReceiptInput | null | undefined;
  factory: string;
  storedAddress: string;
}): VerifiedDeployment {
  const { receipt, factory, storedAddress } = input;
  if (!receipt || typeof receipt !== "object") {
    throw new DeployFlowError("receipt-timeout", "no-receipt");
  }
  if (!isSuccessfulStatus((receipt as ReceiptInput).status)) {
    throw new DeployFlowError("tx-reverted");
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(factory)) {
    throw new DeployFlowError("factory-unavailable");
  }
  const logs = (receipt as ReceiptInput).logs;
  if (!Array.isArray(logs) || logs.length === 0) {
    throw new DeployFlowError("event-missing", "no-logs");
  }
  const expectedFactory = factory.toLowerCase();
  for (const entry of logs) {
    if (!entry || typeof entry !== "object") continue;
    const log = entry as ReceiptLogInput;
    if (typeof log.address !== "string") continue;
    if (log.address.toLowerCase() !== expectedFactory) continue;
    if (!Array.isArray(log.topics) || log.topics.length === 0) continue;
    const topics = log.topics.every(
      (topic): topic is `0x${string}` => asHexString(topic) !== null
    )
      ? (log.topics as [`0x${string}`, ...`0x${string}`[]])
      : null;
    const data = asHexString(log.data);
    if (!topics || !data) continue;
    const parsed = parseTokenCreatedLog({ topics, data });
    if (!parsed) continue;
    if (parsed.token.toLowerCase() !== storedAddress.trim().toLowerCase()) {
      throw new DeployFlowError("event-missing", "address-mismatch");
    }
    return { token: parsed.token };
  }
  throw new DeployFlowError("event-missing", "no-factory-event");
}

/**
 * Read-only refresh recovery. The ONLY capability injected is a receipt
 * getter — there is no wallet, no provider, and no send path in reach, so
 * this function structurally cannot submit or resubmit a transaction.
 * Network-level getter failures map to "rpc-unavailable" (fail closed);
 * raw getter errors are never propagated.
 */
export async function fetchAndVerifyDeployResult(
  getReceipt: (
    hash: `0x${string}`
  ) => Promise<ReceiptInput | null | undefined>,
  stored: DeployResultV1,
  factory: `0x${string}`
): Promise<VerifiedDeployment> {
  let receipt: ReceiptInput | null | undefined;
  try {
    receipt = await getReceipt(stored.txHash);
  } catch {
    throw new DeployFlowError("rpc-unavailable", "receipt-fetch-failed");
  }
  return verifyDeploymentReceipt({
    receipt,
    factory,
    storedAddress: stored.contractAddress,
  });
}
