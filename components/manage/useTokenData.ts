"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { tokenAbi } from "../../lib/token/factory";
import { v1FactoryAddress } from "../../lib/token/factory";
import { managerPublicClient } from "../../lib/manage/client";
import {
  classifyInspected,
  type InspectionReads,
} from "../../lib/manage/probe";
import {
  isTokenOwner,
  type TokenCapabilities,
} from "../../lib/manage/permissions";
import type { TokenClassification } from "../../lib/manage/classification";
import { isSupportedV1ChainId } from "../../lib/deploy/chains";

function clientForChain(chainId: number) {
  return managerPublicClient(chainId);
}

/**
 * Bounded inspection recovery.
 *
 * A failed bytecode request is transport uncertainty, never proof of an
 * empty address — so it can never produce "no contract". Rejected contract
 * reads are conclusive only when they carry contract-level evidence
 * (revert / no-data / undecodable response). Anything else is retried a
 * bounded number of times, then surfaced as inconclusive with an explicit
 * manual Retry. Unknown failures fail safe toward inconclusive.
 */
export const INSPECTION_MAX_ATTEMPTS = 3;
export const INSPECTION_RETRY_DELAYS_MS = [400, 800] as const;
export const INSPECTION_INCOMPLETE_ERROR = "inspection-incomplete" as const;

export type InspectionReadFailureKind = "contract" | "infrastructure";

export type InspectionViewFailure = {
  name: string;
  kind: InspectionReadFailureKind;
};

export type InspectionEvidence = {
  bytecodeOk: boolean;
  code: string | null;
  viewFailures: InspectionViewFailure[];
};

export type InspectionAttemptOutcome =
  | { complete: true; reads: InspectionReads; v1: V1TokenState }
  | {
      complete: false;
      reason: "bytecode-unavailable" | "required-reads-incomplete";
      failedViews: string[];
    };

const CONTRACT_READ_ERROR_NAMES = new Set([
  "AbiDecodingZeroDataError",
  "AbiDecodingDataSizeInvalidError",
  "AbiDecodingDataSizeTooSmallError",
  "AbiErrorSignatureNotFoundError",
  "ContractFunctionRevertedError",
  "ContractFunctionZeroDataError",
  "RawContractError",
]);

const INFRASTRUCTURE_READ_ERROR_NAMES = new Set([
  "HttpRequestError",
  "ResponseBodyTooLargeError",
  "RpcRequestError",
  "SocketClosedError",
  "TimeoutError",
  "WebSocketRequestError",
  "InternalRpcError",
  "InvalidInputRpcError",
  "InvalidParamsRpcError",
  "InvalidRequestRpcError",
  "LimitExceededRpcError",
  "MethodNotFoundRpcError",
  "ParseRpcError",
  "ProviderRpcError",
  "ResourceNotFoundRpcError",
  "ResourceUnavailableRpcError",
  "RpcError",
]);

const INFRASTRUCTURE_ERROR_CODES = new Set([
  -1, -32700, -32600, -32601, -32602, -32603, -32000, -32001, -32002,
  -32004, -32005, 408, 425, 429,
]);

const CONTRACT_ERROR_CODES = new Set([3]);

const CONTRACT_ERROR_PATTERN =
  /execution reverted|the contract function .* (reverted|returned no data)|cannot decode zero data|returned no data \("0x"\)/i;
const INFRASTRUCTURE_ERROR_PATTERN =
  /timed?\s?out|timeout|network|fetch failed|failed to fetch|load failed|socket|econn|etimedout|eai_again|enotfound|econnreset|epipe|abort|rate.?limit|too many requests|limit exceeded|temporarily unavailable|service unavailable|bad gateway|gateway timeout|internal error|server error|method not found|resource unavailable|disconnected|connection/i;

function errorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  const seen = new Set<unknown>();
  const queue: unknown[] = [error];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === null || current === undefined) continue;
    if (typeof current !== "object" && typeof current !== "function") continue;
    if (seen.has(current)) continue;
    seen.add(current);
    chain.push(current);
    const cause = (current as { cause?: unknown }).cause;
    if (cause !== undefined && cause !== null) queue.push(cause);
    const errors = (current as { errors?: unknown }).errors;
    if (Array.isArray(errors)) queue.push(...errors);
  }
  return chain;
}

function errorText(error: unknown): string {
  return errorChain(error)
    .map((item) => {
      const record = item as {
        name?: unknown;
        message?: unknown;
        shortMessage?: unknown;
        details?: unknown;
      };
      return [record.name, record.message, record.shortMessage, record.details]
        .filter((part): part is string => typeof part === "string")
        .join(" ");
    })
    .join(" ");
}

function errorCodes(error: unknown): number[] {
  const codes: number[] = [];
  for (const item of errorChain(error)) {
    for (const key of ["code", "status"] as const) {
      const value = (item as Record<string, unknown>)[key];
      if (typeof value === "number" && Number.isFinite(value)) codes.push(value);
    }
  }
  return codes;
}

/**
 * Classify one rejected read. Contract-level failures (the chain answered:
 * revert / no data / undecodable response) are conclusive evidence about
 * the contract surface. Transport failures are not. Unknown failures fail
 * safe toward infrastructure so they are retried, never confirmed absent.
 */
export function classifyReadFailure(error: unknown): InspectionReadFailureKind {
  const chain = errorChain(error);
  const names = new Set(
    chain
      .map((item) => (item as { name?: unknown }).name)
      .filter((name): name is string => typeof name === "string")
  );
  const text = errorText(error);
  const codes = errorCodes(error);
  if (
    [...CONTRACT_READ_ERROR_NAMES].some((name) => names.has(name)) ||
    codes.some((code) => CONTRACT_ERROR_CODES.has(code)) ||
    CONTRACT_ERROR_PATTERN.test(text)
  ) {
    return "contract";
  }
  if (
    [...INFRASTRUCTURE_READ_ERROR_NAMES].some((name) => names.has(name)) ||
    codes.some(
      (code) =>
        INFRASTRUCTURE_ERROR_CODES.has(code) || code === 429 || code === 408 || code >= 500
    ) ||
    INFRASTRUCTURE_ERROR_PATTERN.test(text)
  ) {
    return "infrastructure";
  }
  return "infrastructure";
}

function isContractCode(code: string): boolean {
  return code !== "0x" && code.length > 2;
}

/**
 * Decide whether one inspection attempt produced a verdict or must be
 * retried. Only a successfully returned empty bytecode confirms "no
 * contract"; only infrastructure-free evidence confirms anything else.
 */
export function evaluateInspectionEvidence(input: {
  reads: InspectionReads;
  v1: V1TokenState;
  evidence: InspectionEvidence;
}): InspectionAttemptOutcome {
  const { reads, v1, evidence } = input;
  if (!evidence.bytecodeOk || typeof evidence.code !== "string") {
    return {
      complete: false,
      reason: "bytecode-unavailable",
      failedViews: [
        "getBytecode",
        ...evidence.viewFailures
          .filter((failure) => failure.kind === "infrastructure")
          .map((failure) => failure.name),
      ],
    };
  }
  if (!isContractCode(evidence.code)) {
    return { complete: true, reads, v1 };
  }
  const failed = evidence.viewFailures
    .filter((failure) => failure.kind === "infrastructure")
    .map((failure) => failure.name);
  if (failed.length > 0) {
    return { complete: false, reason: "required-reads-incomplete", failedViews: failed };
  }
  return { complete: true, reads, v1 };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Run inspection attempts with bounded automatic recovery. Resolves with
 * complete evidence or throws `inspection-incomplete` after the attempts
 * are exhausted. Never classifies; callers classify only complete results.
 */
export async function fetchInspectionWithRecovery(input: {
  inspectOnce: () => Promise<{
    reads: InspectionReads;
    v1: V1TokenState;
    evidence: InspectionEvidence;
  }>;
  maxAttempts?: number;
  delaysMs?: readonly number[];
  onAttempt?: (attempt: number) => void;
}): Promise<{ reads: InspectionReads; v1: V1TokenState; attempts: number }> {
  const maxAttempts = input.maxAttempts ?? INSPECTION_MAX_ATTEMPTS;
  let lastFailure: string[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    input.onAttempt?.(attempt);
    const result = await input.inspectOnce();
    const outcome = evaluateInspectionEvidence(result);
    if (outcome.complete) {
      return { reads: outcome.reads, v1: outcome.v1, attempts: attempt };
    }
    lastFailure = outcome.failedViews;
    if (attempt < maxAttempts) {
      const configured = input.delaysMs?.[attempt - 1];
      const fallback =
        INSPECTION_RETRY_DELAYS_MS[attempt - 1] ??
        INSPECTION_RETRY_DELAYS_MS[INSPECTION_RETRY_DELAYS_MS.length - 1] ??
        800;
      const wait = configured ?? fallback;
      if (wait > 0) await delay(wait);
    }
  }
  throw new Error(`${INSPECTION_INCOMPLETE_ERROR}: ${lastFailure.join(", ") || "unknown"}`);
}

export type InspectionUiState =
  | "idle"
  | "loading"
  | "recovering"
  | "ready"
  | "inconclusive"
  | "error";

export const INSPECTION_STATUS_COPY = {
  loading: { title: "Inspecting token…", body: null },
  recovering: { title: "Chain data is temporarily incomplete. Checking again…", body: null },
  inconclusive: {
    title: "Inspection needs another try",
    body: "We couldn't complete the on-chain inspection. Your contract may still exist. Please retry.",
  },
  error: {
    title: "Inspection failed",
    body: "The token could not be read. Check the address and try again.",
  },
} as const;

export function inspectionUiStatus(input: {
  enabled: boolean;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  hasData: boolean;
  recoveryAttempt: number;
}): InspectionUiState {
  if (!input.enabled) return "idle";
  if (input.hasData) return "ready";
  if (input.isPending) return input.recoveryAttempt > 1 ? "recovering" : "loading";
  if (input.isError) {
    const message = input.error instanceof Error ? input.error.message : "";
    return message.startsWith(INSPECTION_INCOMPLETE_ERROR) ? "inconclusive" : "error";
  }
  return "loading";
}

export type V1TokenState = {
  totalMinted: bigint | null;
  maxSupply: bigint | null;
  owner: `0x${string}` | null;
  paused: boolean | null;
  tradingEnabled: boolean | null;
  buyTaxBps: bigint | null;
  sellTaxBps: bigint | null;
  marketingWallet: `0x${string}` | null;
  swapBackEnabled: boolean | null;
  antiBotEnabled: boolean | null;
  snipeBlocks: bigint | null;
  launchBlock: bigint | null;
  burnable: boolean | null;
  mintable: boolean | null;
  pausable: boolean | null;
  maxTxAmount: bigint | null;
  maxWalletAmount: bigint | null;
  blacklistEnabled: boolean | null;
  whitelistEnabled: boolean | null;
  swapThreshold: bigint | null;
  liquidityShareBps: bigint | null;
  marketingShareBps: bigint | null;
  generator: string | null;
  factory: `0x${string}` | null;
  userBalance: bigint | null;
};

export type TokenDashboardData = {
  chainId: number;
  address: `0x${string}`;
  classification: TokenClassification;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: bigint | null;
  v1: V1TokenState | null;
  capabilities: TokenCapabilities;
  isOwner: boolean;
  chainSupported: boolean;
};

function asAddress(value: unknown): `0x${string}` | null {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value)
    ? (value.toLowerCase() as `0x${string}`)
    : null;
}

async function readView(
  chainId: number,
  address: `0x${string}`,
  functionName: string,
  args: readonly unknown[] = []
): Promise<unknown> {
  const client = clientForChain(chainId);
  if (!client) throw new Error("Unsupported chain");
  return client.readContract({
    address,
    abi: tokenAbi as never,
    functionName,
    args: args as never,
  } as never);
}

function emptyInspectionReads(): InspectionReads {
  return {
    basic: { codeExists: false, name: null, symbol: null, decimals: null, totalSupply: null },
    markers: { factory: null, generator: null, maxSupply: null, totalMinted: null, swapBackEnabled: null },
    owner: null,
    paused: null,
  };
}

function emptyV1TokenState(): V1TokenState {
  return {
    totalMinted: null,
    maxSupply: null,
    owner: null,
    paused: null,
    tradingEnabled: null,
    buyTaxBps: null,
    sellTaxBps: null,
    marketingWallet: null,
    swapBackEnabled: null,
    antiBotEnabled: null,
    snipeBlocks: null,
    launchBlock: null,
    burnable: null,
    mintable: null,
    pausable: null,
    maxTxAmount: null,
    maxWalletAmount: null,
    blacklistEnabled: null,
    whitelistEnabled: null,
    swapThreshold: null,
    liquidityShareBps: null,
    marketingShareBps: null,
    generator: null,
    factory: null,
    userBalance: null,
  };
}

async function attemptInspection(
  chainId: number,
  address: `0x${string}`,
  account: `0x${string}` | null
): Promise<{ reads: InspectionReads; v1: V1TokenState; evidence: InspectionEvidence }> {
  const client = clientForChain(chainId);
  if (!client) throw new Error("Unsupported chain");
  // Bytecode first: a failed lookup is uncertainty, so no contract views
  // are spent and no verdict is produced from a missing code response.
  let bytecodeOk = false;
  let code: string | null = null;
  try {
    const bytecode = await client.getBytecode({ address });
    if (typeof bytecode === "string") {
      bytecodeOk = true;
      code = bytecode;
    }
  } catch {
    bytecodeOk = false;
    code = null;
  }
  if (!bytecodeOk || typeof code !== "string") {
    return {
      reads: emptyInspectionReads(),
      v1: emptyV1TokenState(),
      evidence: { bytecodeOk: false, code: null, viewFailures: [] },
    };
  }
  if (!isContractCode(code)) {
    return {
      reads: emptyInspectionReads(),
      v1: emptyV1TokenState(),
      evidence: { bytecodeOk: true, code, viewFailures: [] },
    };
  }
  const names = [
    "name", "symbol", "decimals", "totalSupply",
    "FACTORY", "GENERATOR", "maxSupply", "totalMinted", "swapBackEnabled",
    "owner", "paused",
    "tradingEnabled", "buyTaxBps", "sellTaxBps", "marketingWallet",
    "antiBotEnabled", "snipeBlocks", "launchBlock",
    "burnable", "mintable", "pausable",
    "maxTxAmount", "maxWalletAmount",
    "blacklistEnabled", "whitelistEnabled",
    "swapThreshold", "liquidityShareBps", "marketingShareBps",
  ] as const;
  const settled = await Promise.allSettled(
    names.map((fn) => readView(chainId, address, fn))
  );
  const viewFailures: InspectionViewFailure[] = [];
  const at = (fn: (typeof names)[number]): unknown => {
    const i = names.indexOf(fn);
    const r = settled[i];
    if (r.status === "fulfilled") return r.value;
    viewFailures.push({ name: fn, kind: classifyReadFailure(r.reason) });
    return undefined;
  };
  let userBalance: bigint | null = null;
  if (account) {
    try {
      const bal = await readView(chainId, address, "balanceOf", [account]);
      if (typeof bal === "bigint") userBalance = bal;
    } catch (error) {
      viewFailures.push({ name: "balanceOf", kind: classifyReadFailure(error) });
      userBalance = null;
    }
  }
  const big = (v: unknown): bigint | null => (typeof v === "bigint" ? v : null);
  const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
  const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
  const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

  const reads: InspectionReads = {
    basic: {
      codeExists: true,
      name: str(at("name")),
      symbol: str(at("symbol")),
      decimals: num(at("decimals")),
      totalSupply: big(at("totalSupply")),
    },
    markers: {
      factory: asAddress(at("FACTORY")),
      generator: str(at("GENERATOR")),
      maxSupply: big(at("maxSupply")),
      totalMinted: big(at("totalMinted")),
      swapBackEnabled: bool(at("swapBackEnabled")),
    },
    owner: asAddress(at("owner")),
    paused: bool(at("paused")),
  };
  const v1: V1TokenState = {
    totalMinted: big(at("totalMinted")),
    maxSupply: big(at("maxSupply")),
    owner: asAddress(at("owner")),
    paused: bool(at("paused")),
    tradingEnabled: bool(at("tradingEnabled")),
    buyTaxBps: big(at("buyTaxBps")),
    sellTaxBps: big(at("sellTaxBps")),
    marketingWallet: asAddress(at("marketingWallet")),
    swapBackEnabled: bool(at("swapBackEnabled")),
    antiBotEnabled: bool(at("antiBotEnabled")),
    snipeBlocks: big(at("snipeBlocks")),
    launchBlock: big(at("launchBlock")),
    burnable: bool(at("burnable")),
    mintable: bool(at("mintable")),
    pausable: bool(at("pausable")),
    maxTxAmount: big(at("maxTxAmount")),
    maxWalletAmount: big(at("maxWalletAmount")),
    blacklistEnabled: bool(at("blacklistEnabled")),
    whitelistEnabled: bool(at("whitelistEnabled")),
    swapThreshold: big(at("swapThreshold")),
    liquidityShareBps: big(at("liquidityShareBps")),
    marketingShareBps: big(at("marketingShareBps")),
    generator: str(at("GENERATOR")),
    factory: asAddress(at("FACTORY")),
    userBalance,
  };
  return {
    reads,
    v1,
    evidence: { bytecodeOk: true, code, viewFailures },
  };
}

export function knownV1Factories(chainId: number): ReadonlySet<string> {
  if (!isSupportedV1ChainId(chainId)) return new Set();
  const factory = v1FactoryAddress(chainId);
  return factory ? new Set([factory.toLowerCase()]) : new Set();
}

export function useTokenData(
  chainId: number | null,
  address: `0x${string}` | null,
  account: `0x${string}` | null
): {
  data: TokenDashboardData | null;
  isLoading: boolean;
  isRecovering: boolean;
  isInconclusive: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const enabled =
    isSupportedV1ChainId(chainId) &&
    address !== null &&
    /^0x[a-fA-F0-9]{40}$/.test(address);
  // Counts automatic recovery attempts inside the active query so the UI
  // can distinguish first-load checking from bounded re-checking. Reset on
  // render when the inspection target changes (the documented render-phase
  // adjustment pattern — never a setState-in-effect).
  const targetKey = `${chainId ?? "null"}:${address ?? "null"}:${account ?? "null"}`;
  const [recoveryState, setRecoveryState] = useState({ key: targetKey, attempt: 0 });
  if (recoveryState.key !== targetKey) {
    setRecoveryState({ key: targetKey, attempt: 0 });
  }
  const recoveryAttempt = recoveryState.attempt;
  const query = useQuery({
    queryKey: ["manager-token", chainId, address?.toLowerCase(), account?.toLowerCase() ?? null],
    queryFn: async (): Promise<TokenDashboardData> => {
      if (chainId === null || address === null) throw new Error("invalid-target");
      const { reads, v1 } = await fetchInspectionWithRecovery({
        inspectOnce: () => attemptInspection(chainId, address, account),
        onAttempt: (attempt) => {
          setRecoveryState((prev) => (prev.key === targetKey ? { key: prev.key, attempt } : prev));
        },
      });
      const classification = classifyInspected(reads, knownV1Factories(chainId));
      const owner = v1.owner;
      const capabilities: TokenCapabilities = {
        burnable: v1.burnable === true,
        mintable: v1.mintable === true,
        pausable: v1.pausable === true,
        blacklistEnabled: v1.blacklistEnabled === true,
        whitelistEnabled: v1.whitelistEnabled === true,
        tradingEnabled: (v1.buyTaxBps ?? 0n) > 0n || (v1.sellTaxBps ?? 0n) > 0n,
        autoLiquidityEnabled: (v1.liquidityShareBps ?? 0n) > 0n,
        antiBotEnabled: v1.antiBotEnabled === true,
        tradingLaunched: v1.tradingEnabled === true,
      };
      return {
        chainId,
        address,
        classification,
        name: reads.basic.name,
        symbol: reads.basic.symbol,
        decimals: reads.basic.decimals,
        totalSupply: reads.basic.totalSupply,
        v1: classification.kind === "own-v1" ? v1 : null,
        capabilities,
        isOwner: isTokenOwner(account, owner),
        chainSupported: true,
      };
    },
    enabled,
    // TanStack-level retries stay off: incomplete evidence is retried
    // explicitly and bounded inside fetchInspectionWithRecovery, so a
    // transport failure can never silently multiply RPC traffic.
    retry: 0,
    staleTime: 15_000,
  });
  const data = useMemo(() => query.data ?? null, [query.data]);
  const status = inspectionUiStatus({
    enabled,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    hasData: data !== null,
    recoveryAttempt,
  });
  return {
    data,
    isLoading: status === "loading",
    isRecovering: status === "recovering",
    isInconclusive: status === "inconclusive",
    isError: status === "error",
    refetch: () => {
      setRecoveryState({ key: targetKey, attempt: 0 });
      void query.refetch();
    },
  };
}
