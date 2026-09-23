/**
 * Phase 7A deployment-record validation boundary.
 *
 * The public record endpoint accepts ONLY the minimum client hint:
 *   { chainId, txHash }
 * Everything else (contract, deployer, token identity, fees) is derived
 * server-side from the chain. Client claims beyond the hint are rejected —
 * there is no field for them to arrive in.
 */

import { FEATURE_CONFIG_VERSION } from "../db/schema";
import { decodeFeatureBitmap } from "../token/config";

export const RECORD_CHAIN_ID = 97 as const;
export const ALLOWED_RECORD_CHAINS: ReadonlySet<number> = new Set([
  RECORD_CHAIN_ID,
]);

export type RecordHint = {
  chainId: typeof RECORD_CHAIN_ID;
  txHash: `0x${string}`;
};

export type RecordHintErrorCode =
  | "invalid-request"
  | "unsupported-chain"
  | "invalid-tx-hash";

export class RecordHintError extends Error {
  readonly code: RecordHintErrorCode;
  constructor(code: RecordHintErrorCode, message: string) {
    super(message);
    this.name = "RecordHintError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isTxHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function isAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

/** Lowercase-normalized address (DB stores lowercase for uniqueness). */
export function normalizeAddress(value: string): `0x${string}` {
  return value.toLowerCase() as `0x${string}`;
}

/** Lowercase-normalized tx hash. */
export function normalizeTxHash(value: string): `0x${string}` {
  return value.toLowerCase() as `0x${string}`;
}

/** Canonical integer string: digits only, no leading zeros (except "0"). */
export function isCanonicalUintString(value: unknown): value is string {
  return (
    typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)
  );
}

export function toCanonicalUintString(value: bigint): string {
  if (value < 0n) throw new RecordHintError("invalid-request", "negative amount");
  return value.toString(10);
}

/**
 * Strictly parse the client hint. Rejects unknown fields so a client cannot
 * smuggle "success"/contract/fee claims into the record path.
 */
export function parseRecordHint(input: unknown): RecordHint {
  if (!isRecord(input)) {
    throw new RecordHintError("invalid-request", "request body must be a JSON object");
  }
  for (const key of Object.keys(input)) {
    if (key !== "chainId" && key !== "txHash") {
      throw new RecordHintError(
        "invalid-request",
        `unexpected field "${key}" is not accepted`
      );
    }
  }
  if (typeof input.chainId !== "number" || !Number.isInteger(input.chainId)) {
    throw new RecordHintError("invalid-request", "chainId must be an integer");
  }
  if (!ALLOWED_RECORD_CHAINS.has(input.chainId)) {
    throw new RecordHintError(
      "unsupported-chain",
      `chain ${input.chainId} is not eligible for deployment recording`
    );
  }
  if (!isTxHash(input.txHash)) {
    throw new RecordHintError("invalid-tx-hash", "txHash must be a 32-byte hash");
  }
  return { chainId: RECORD_CHAIN_ID, txHash: normalizeTxHash(input.txHash) };
}

// ---------------------------------------------------------------------------
// Versioned feature configuration (v1).
// ---------------------------------------------------------------------------

export type FeatureConfigV1 = {
  version: typeof FEATURE_CONFIG_VERSION;
  burn: boolean;
  mint: boolean;
  pause: boolean;
  maxTx: boolean;
  maxWallet: boolean;
  blacklist: boolean;
  whitelist: boolean;
};

const FEATURE_KEYS = [
  "burn",
  "mint",
  "pause",
  "maxTx",
  "maxWallet",
  "blacklist",
  "whitelist",
] as const;

/** Build the canonical v1 feature config from an on-chain bitmap. */
export function featureConfigFromBitmap(bitmap: bigint): FeatureConfigV1 {
  const flags = decodeFeatureBitmap(bitmap);
  return {
    version: FEATURE_CONFIG_VERSION,
    burn: flags.burn,
    mint: flags.mint,
    pause: flags.pause,
    maxTx: flags.maxTx,
    maxWallet: flags.maxWallet,
    blacklist: flags.blacklist,
    whitelist: flags.whitelist,
  };
}

/** Strict shape check for a stored/derived v1 feature config. */
export function parseFeatureConfig(input: unknown): FeatureConfigV1 | null {
  if (!isRecord(input)) return null;
  if (input.version !== FEATURE_CONFIG_VERSION) return null;
  const out: Record<string, boolean> = {};
  for (const key of FEATURE_KEYS) {
    if (typeof input[key] !== "boolean") return null;
    out[key] = input[key] as boolean;
  }
  return { version: FEATURE_CONFIG_VERSION, ...(out as Omit<FeatureConfigV1, "version">) };
}

/** Feature ids selected by a v1 config (canonical order). */
export function featureIdsFromConfig(config: FeatureConfigV1): string[] {
  return FEATURE_KEYS.filter((key) => config[key]);
}

// ---------------------------------------------------------------------------
// Order-insensitive JSON equality (deployment identity).
// ---------------------------------------------------------------------------

/**
 * Recursively canonicalize a JSON-like value: object keys sorted
 * (bytewise), array order PRESERVED. JSONB storage normalizes object key
 * order on write, so identity comparisons of round-tripped values must not
 * depend on insertion order — while extra/missing/changed keys or values
 * must still compare unequal.
 */
function canonicalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJsonValue);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      out[key] = canonicalizeJsonValue(record[key]);
    }
    return out;
  }
  return value;
}

/**
 * Strict semantic JSON equality: equal iff canonical forms are identical.
 * Extra, missing, or changed keys/values (at any depth) compare unequal;
 * array order remains significant.
 */
export function stableJsonEqual(a: unknown, b: unknown): boolean {
  return (
    JSON.stringify(canonicalizeJsonValue(a)) ===
    JSON.stringify(canonicalizeJsonValue(b))
  );
}
