/**
 * Phase 7B admin display helpers (pure, server-safe).
 *
 * - Amounts stay in bigint land: wei TEXT is validated as canonical digits
 *   and formatted without ever passing through Number.
 * - Dates are rendered as explicit UTC strings on the server, so there is no
 *   hydration mismatch between server and client rendering.
 * - Addresses/hashes keep exact canonical values; abbreviation is for
 *   display only.
 * - Feature display tolerates JSONB key reordering and unknown versions:
 *   it reads flags by NAME (never by key order) and never reinterprets an
 *   unrecognized config version as v1.
 */

import { formatWeiBnb } from "../../pricing/money";
import { FEATURE_CONFIG_VERSION } from "../../db/schema";
import { explorerAddressUrl, explorerTxUrl } from "../../wallet/chains";
import { ADMIN_FEATURE_FILTERS } from "./params";

export type FeatureFlagDisplay = {
  id: string;
  label: string;
  /** True/false when known, null when the stored value is not a boolean. */
  enabled: boolean | null;
};

export type FeatureDisplay = {
  /** Numeric config version when present, else null. */
  version: number | null;
  /** True when the version is anything other than the known v1. */
  unknownVersion: boolean;
  /** The seven known v1 flags (order is canonical display order). */
  flags: FeatureFlagDisplay[];
  /** Extra non-flag keys carried by the stored object (forward tolerance). */
  extra: Array<{ key: string; raw: string }>;
};

const FEATURE_LABELS: Record<string, string> = {
  burn: "Burnable",
  mint: "Mintable",
  pause: "Pausable",
  maxTx: "Max transaction",
  maxWallet: "Max wallet",
  blacklist: "Blacklist",
  whitelist: "Whitelist",
};

/** Normalize a stored feature_config value for display. Never throws. */
export function normalizeFeatureDisplay(value: unknown): FeatureDisplay {
  const record =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const version =
    typeof record.version === "number" &&
    Number.isInteger(record.version)
      ? record.version
      : null;
  const unknownVersion = version !== FEATURE_CONFIG_VERSION;
  const flags: FeatureFlagDisplay[] = unknownVersion
    ? []
    : ADMIN_FEATURE_FILTERS.map((id) => {
        const raw = record[id];
        return {
          id,
          label: FEATURE_LABELS[id] ?? id,
          enabled: typeof raw === "boolean" ? raw : null,
        };
      });
  const extra: Array<{ key: string; raw: string }> = [];
  for (const key of Object.keys(record)) {
    if (key === "version") continue;
    if (!unknownVersion && (ADMIN_FEATURE_FILTERS as readonly string[]).includes(key)) {
      continue;
    }
    let raw: string;
    try {
      raw = JSON.stringify(record[key]) ?? "null";
    } catch {
      raw = "null";
    }
    extra.push({ key, raw: raw.slice(0, 200) });
  }
  return { version, unknownVersion, flags, extra };
}

/** Enabled feature ids in canonical order (for badges/list cells). */
export function enabledFeatureIds(value: unknown): string[] {
  return normalizeFeatureDisplay(value)
    .flags.filter((flag) => flag.enabled === true)
    .map((flag) => flag.id);
}

/** Canonical digits-only uint string, or null when malformed. */
export function asCanonicalUintString(value: unknown): string | null {
  return typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)
    ? value
    : null;
}

/** Exact BNB display for a canonical wei TEXT value; null when malformed. */
export function formatWeiTextToBnb(weiText: unknown): string | null {
  const canonical = asCanonicalUintString(weiText);
  if (canonical === null) return null;
  try {
    return formatWeiBnb(BigInt(canonical));
  } catch {
    return null;
  }
}

/**
 * Parse a `SUM(platform_fee_wei::numeric)` aggregate back to canonical wei
 * TEXT with bigint semantics. The database may return "0", "0.0", or a
 * plain integer string; anything unparseable falls back to "0" so the
 * dashboard never crashes on driver formatting.
 */
export function parseFeeSum(total: unknown): string {
  if (typeof total === "number" && Number.isSafeInteger(total) && total >= 0) {
    return String(total);
  }
  if (typeof total !== "string") return "0";
  const trimmed = total.trim();
  if (/^(0|[1-9][0-9]*)$/.test(trimmed)) return trimmed;
  const decimal = /^(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!decimal) return "0";
  try {
    const value = BigInt(decimal[1]);
    const frac = (decimal[2] ?? "").replace(/0+$/, "");
    if (frac !== "" && /[^0]/.test(frac)) return "0";
    return value.toString(10);
  } catch {
    return "0";
  }
}

/**
 * Human token supply from base-unit TEXT + decimals, bigint-safe
 * ("1000000" base units, 18 decimals -> "1"). Returns null when malformed.
 */
export function formatBaseUnitsToHuman(
  baseUnitsText: unknown,
  decimals: unknown
): string | null {
  const canonical = asCanonicalUintString(baseUnitsText);
  if (
    canonical === null ||
    typeof decimals !== "number" ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 18
  ) {
    return null;
  }
  try {
    const value = BigInt(canonical);
    const scale = 10n ** BigInt(decimals);
    const whole = value / scale;
    const frac = value % scale;
    if (frac === 0n) return whole.toString(10);
    const digits = frac
      .toString(10)
      .padStart(decimals, "0")
      .replace(/0+$/, "");
    return `${whole.toString(10)}.${digits}`;
  } catch {
    return null;
  }
}

/** Abbreviate a hex value for table display (`0x1234…abcd`). Full value stays in title/copy. */
export function abbreviateMiddle(
  value: string,
  headChars: number,
  tailChars: number
): string {
  if (value.length <= headChars + tailChars + 1) return value;
  return `${value.slice(0, headChars)}…${value.slice(-tailChars)}`;
}

export function abbreviateAddress(address: string): string {
  return abbreviateMiddle(address, 6, 4);
}

export function abbreviateTxHash(txHash: string): string {
  return abbreviateMiddle(txHash, 10, 8);
}

/** UTC timestamp for admin display ("2026-09-23 14:05:32 UTC"). */
export function formatUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`
  );
}

/** Human chain label for admin display. */
export function chainLabel(chainId: number): string {
  if (chainId === 97) return "BSC Testnet";
  return `Chain ${chainId}`;
}

export { explorerAddressUrl, explorerTxUrl };
