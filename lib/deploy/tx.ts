/**
 * Phase 6C transaction boundary (pure helpers, no wallet access).
 *
 * Encoding, explorer links and deployment-event parsing live here so the UI
 * flow has a single, unit-tested import surface. Nothing here touches a
 * provider, `window.ethereum`, or any signing path.
 */

import { encodeFunctionData, type Abi } from "viem";

import { PHASE6B_CHAIN_ID, PHASE6B_EXPLORER } from "./phase6b";
import { factoryAbi, factoryAddress, parseTokenCreatedLog } from "../token/factory";
import type { ValidatedTokenConfig } from "../token/config";
import { toContractArgs } from "../token/config";
import { DeployFlowError } from "./errors";

export const DEPLOY_CHAIN_ID = PHASE6B_CHAIN_ID;
export const DEPLOY_EXPLORER = PHASE6B_EXPLORER;
/** Zero native value: the testnet factory is non-payable (gas only). */
export const DEPLOY_TX_VALUE_HEX = "0x0" as const;

export type PreparedDeployment = {
  chainId: 97;
  factory: `0x${string}`;
  /** Hex calldata for `createToken((...))`. */
  data: `0x${string}`;
  /** Hex zero value for eth_sendTransaction params. */
  value: typeof DEPLOY_TX_VALUE_HEX;
};

/**
 * Build the exact eth_sendTransaction payload for a testnet deployment.
 * Throws factory-unavailable when no factory is configured for the chain,
 * and mainnet-disabled for ANY chain other than 97 — so a testnet factory
 * address can never be paired with chain 56 (or anything else).
 */
export function prepareDeploymentTx(
  chainId: number,
  validated: ValidatedTokenConfig
): PreparedDeployment {
  if (chainId !== DEPLOY_CHAIN_ID) {
    throw new DeployFlowError("mainnet-disabled");
  }
  const factory = factoryAddress(chainId);
  if (!factory) {
    throw new DeployFlowError("factory-unavailable");
  }
  const data = encodeFunctionData({
    abi: factoryAbi as unknown as Abi,
    functionName: "createToken",
    args: [{ token: toContractArgs(validated) }],
  });
  return { chainId: DEPLOY_CHAIN_ID, factory, data, value: DEPLOY_TX_VALUE_HEX };
}

export type ReceiptLogLike = {
  topics: readonly [`0x${string}`, ...`0x${string}`[]];
  data: `0x${string}`;
};

export type ReceiptLike = {
  status: string;
  logs: readonly ReceiptLogLike[];
};

/** Receipt success across viem ("success") and ethers-style ("0x1"/1) shapes. */
export function isReceiptSuccess(status: unknown): boolean {
  return status === "success" || status === "0x1" || status === 1;
}

/**
 * Extract the newly deployed token address from a receipt by decoding the
 * factory TokenCreated event. Returns null when no well-formed event is
 * present — callers must surface event-missing, never guess an address.
 */
export function findDeployedTokenAddress(
  logs: readonly ReceiptLogLike[] | undefined | null
): `0x${string}` | null {
  if (!logs) return null;
  for (const log of logs) {
    if (!log || !Array.isArray(log.topics) || typeof log.data !== "string") {
      continue;
    }
    const parsed = parseTokenCreatedLog({
      topics: log.topics,
      data: log.data as `0x${string}`,
    });
    if (parsed) return parsed.token;
  }
  return null;
}

export function explorerTxUrl(txHash: string): string | null {
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) return null;
  return `${DEPLOY_EXPLORER}/tx/${txHash}`;
}

export function explorerTokenPageUrl(token: string): string | null {
  if (!/^0x[a-fA-F0-9]{40}$/.test(token)) return null;
  return `${DEPLOY_EXPLORER}/token/${token}`;
}

export function isTxHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function shortenTxHash(hash: string): string {
  if (!isTxHash(hash)) return "";
  return `${hash.slice(0, 6)}\u2026${hash.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Minimal pending-transaction recovery (session scope only).
//
// Stores the submitted hash plus a human summary so a trivial UI transition
// (or reload) never loses a broadcast transaction. Session storage only —
// no database. Phase 7 will introduce persistent deployment records.
// ---------------------------------------------------------------------------

export type PendingDeployment = {
  txHash: `0x${string}`;
  chainId: 97;
  name: string;
  symbol: string;
  savedAt: number;
};

const PENDING_KEY = "btm-deploy-pending-v1";

function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function savePendingDeployment(pending: PendingDeployment): void {
  try {
    storage()?.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* storage unavailable — receipt state in memory still applies */
  }
}

export function loadPendingDeployment(): PendingDeployment | null {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(PENDING_KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingDeployment>;
    if (
      !isTxHash(parsed.txHash) ||
      parsed.chainId !== DEPLOY_CHAIN_ID ||
      typeof parsed.name !== "string" ||
      typeof parsed.symbol !== "string"
    ) {
      return null;
    }
    return {
      txHash: parsed.txHash,
      chainId: DEPLOY_CHAIN_ID,
      name: parsed.name,
      symbol: parsed.symbol,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

export function clearPendingDeployment(): void {
  try {
    storage()?.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}
