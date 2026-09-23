/**
 * Phase 7A server-side deployment verification.
 *
 * Trust model: the ONLY client input is { chainId, txHash }. Everything
 * recorded is independently derived from the chain:
 *   transaction  → to (must be the expected factory), from (deployer),
 *                   value (must be zero — the factory is non-payable)
 *   receipt      → status success, TokenCreated event from the factory
 *   event args   → contract, creator/owner, name/symbol/decimals/supply,
 *                   feature PRESENCE bitmap
 * A client-supplied contract address has no field to arrive in and therefore
 * cannot override the receipt-derived address — by construction.
 *
 * Chain access is injected (ChainReader) so unit tests use deterministic
 * fixtures and never touch the network.
 */


import { parseTokenCreatedLog } from "../token/factory";
import {
  featureConfigFromBitmap,
  normalizeAddress,
  toCanonicalUintString,
  type FeatureConfigV1,
  type RecordHint,
} from "./validate";

export type VerificationErrorCode =
  | "tx-missing"
  | "receipt-missing"
  | "tx-reverted"
  | "factory-mismatch"
  | "nonzero-value"
  | "event-missing"
  | "rpc-unavailable"
  | "factory-unavailable";

export class VerificationError extends Error {
  readonly code: VerificationErrorCode;
  constructor(code: VerificationErrorCode, detail: string) {
    super(`Deployment verification failed (${code}): ${detail}`);
    this.name = "VerificationError";
    this.code = code;
  }
}

/** Minimal structural view of a transaction (viem-compatible subset). */
export type ChainTransaction = {
  hash: string;
  from: string;
  to: string | null;
  value: bigint;
};

/** Minimal structural view of a receipt log (viem-compatible subset). */
export type ChainReceiptLog = {
  address: string;
  topics: readonly [`0x${string}`, ...`0x${string}`[]];
  data: `0x${string}`;
};

/** Minimal structural view of a receipt (viem-compatible subset). */
export type ChainReceipt = {
  status: unknown;
  blockNumber: bigint | number | string | null;
  logs: readonly ChainReceiptLog[];
};

export type ChainReader = {
  getTransaction: (hash: `0x${string}`) => Promise<ChainTransaction | null>;
  getTransactionReceipt: (
    hash: `0x${string}`
  ) => Promise<ChainReceipt | null | undefined>;
};

/** Server-computed price snapshot input (wired to the pricing source). */
export type QuoteSnapshotInput = {
  pricingVersion: string;
  totalWei: string;
};

export type VerifiedDeploymentRecord = {
  chainId: 97;
  txHash: `0x${string}`;
  contractAddress: `0x${string}`;
  factoryAddress: `0x${string}`;
  deployerAddress: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  /** Canonical integer string, base units. */
  initialSupplyBase: string;
  featureConfig: FeatureConfigV1;
  quoteSnapshot: QuoteSnapshotInput & { selectedFeatures: string[] };
  /** Canonical integer wei string (actual fee charged = tx value). */
  platformFeeWei: string;
  blockNumber: number | null;
};

function isSuccessfulStatus(status: unknown): boolean {
  return status === "success" || status === "0x1" || status === 1;
}

function toBlockNumber(value: bigint | number | string | null): number | null {
  try {
    if (value === null || value === undefined) return null;
    const n = typeof value === "bigint" ? value : BigInt(value);
    if (n < 0n || n > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(n);
  } catch {
    return null;
  }
}

/**
 * Verify a hinted deployment against the chain and derive the canonical
 * record. Throws VerificationError on anything unverifiable; raw RPC errors
 * are converted to "rpc-unavailable" (never propagated).
 */
export async function verifyDeployment(input: {
  hint: RecordHint;
  chain: ChainReader;
  expectedFactory: `0x${string}` | null;
  quoteForFeatures: (
    featureIds: string[]
  ) => QuoteSnapshotInput | Promise<QuoteSnapshotInput>;
}): Promise<VerifiedDeploymentRecord> {
  const { hint, chain, expectedFactory, quoteForFeatures } = input;
  if (!expectedFactory || !/^0x[a-fA-F0-9]{40}$/.test(expectedFactory)) {
    throw new VerificationError(
      "factory-unavailable",
      "no expected factory is configured for this chain"
    );
  }
  const factory = normalizeAddress(expectedFactory);

  let tx: ChainTransaction | null;
  try {
    tx = await chain.getTransaction(hint.txHash);
  } catch {
    throw new VerificationError("rpc-unavailable", "transaction fetch failed");
  }
  if (!tx || typeof tx !== "object") {
    throw new VerificationError("tx-missing", "transaction not found");
  }
  // The transaction must have been SENT TO the expected factory. A tx to any
  // other address — even one emitting lookalike events — is rejected.
  if (typeof tx.to !== "string" || tx.to.toLowerCase() !== factory) {
    throw new VerificationError(
      "factory-mismatch",
      "transaction was not sent to the expected factory"
    );
  }
  if (typeof tx.value !== "bigint" || tx.value !== 0n) {
    throw new VerificationError(
      "nonzero-value",
      "deployment transaction must carry zero native value"
    );
  }
  if (typeof tx.from !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(tx.from)) {
    throw new VerificationError("tx-missing", "transaction sender is not an address");
  }

  let receipt: ChainReceipt | null | undefined;
  try {
    receipt = await chain.getTransactionReceipt(hint.txHash);
  } catch {
    throw new VerificationError("rpc-unavailable", "receipt fetch failed");
  }
  if (!receipt || typeof receipt !== "object") {
    throw new VerificationError("receipt-missing", "receipt not available yet");
  }
  if (!isSuccessfulStatus(receipt.status)) {
    throw new VerificationError("tx-reverted", "transaction did not succeed");
  }
  if (!Array.isArray(receipt.logs)) {
    throw new VerificationError("event-missing", "receipt has no logs");
  }

  // Decode the FIRST well-formed TokenCreated log emitted BY the factory.
  // The contract address comes from this event — never from client input.
  let decoded: ReturnType<typeof parseTokenCreatedLog> = null;
  for (const log of receipt.logs) {
    if (!log || typeof log !== "object") continue;
    if (typeof log.address !== "string") continue;
    if (log.address.toLowerCase() !== factory) continue;
    if (!Array.isArray(log.topics) || log.topics.length === 0) continue;
    if (typeof log.data !== "string" || !log.data.startsWith("0x")) continue;
    const parsed = parseTokenCreatedLog({
      topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      data: log.data as `0x${string}`,
    });
    if (parsed) {
      decoded = parsed;
      break;
    }
  }
  if (!decoded) {
    throw new VerificationError(
      "event-missing",
      "no TokenCreated event from the expected factory"
    );
  }

  const featureConfig = featureConfigFromBitmap(decoded.features);
  const selectedFeatures = Object.entries({
    burn: featureConfig.burn,
    mint: featureConfig.mint,
    pause: featureConfig.pause,
    maxTx: featureConfig.maxTx,
    maxWallet: featureConfig.maxWallet,
    blacklist: featureConfig.blacklist,
    whitelist: featureConfig.whitelist,
  })
    .filter(([, enabled]) => enabled)
    .map(([id]) => id);

  let quote: QuoteSnapshotInput;
  try {
    quote = await quoteForFeatures(selectedFeatures);
  } catch {
    throw new VerificationError("rpc-unavailable", "quote snapshot failed");
  }

  return {
    chainId: hint.chainId,
    txHash: hint.txHash,
    contractAddress: normalizeAddress(decoded.token),
    factoryAddress: factory,
    deployerAddress: normalizeAddress(tx.from),
    tokenName: decoded.name,
    tokenSymbol: decoded.symbol,
    decimals: decoded.decimals,
    initialSupplyBase: toCanonicalUintString(decoded.initialSupply),
    featureConfig,
    quoteSnapshot: { ...quote, selectedFeatures },
    platformFeeWei: toCanonicalUintString(tx.value),
    blockNumber: toBlockNumber(receipt.blockNumber),
  };
}
