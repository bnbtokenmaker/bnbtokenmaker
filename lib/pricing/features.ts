import type {
  ComingSoonFeatureId,
  FeatureId,
  FeatureKind,
  IncludedFeatureId,
  PaidFeatureId,
} from "./types";

export const PAID_FEATURES: ReadonlyArray<PaidFeatureId> = [
  "burn",
  "mint",
  "pause",
  "maxTx",
  "maxWallet",
  "blacklist",
  "whitelist",
  "trading",
  "antiBot",
  "autoLiquidity",
];

export const INCLUDED_FEATURES: ReadonlyArray<IncludedFeatureId> = [
  "transferOwnership",
  "renounceOwnership",
];

/**
 * V1: no purchasable capability is coming-soon. `buySellTax`,
 * `marketingWallet` and `feeExemption` were folded into the single priced
 * `trading` capability; `antiBot` and `autoLiquidity` graduated to paid.
 * The set + predicate stay for forward compatibility.
 */
export const COMING_SOON_FEATURES: ReadonlyArray<ComingSoonFeatureId> = [];

export const INCOMPATIBLE_GROUPS: ReadonlyArray<ReadonlyArray<PaidFeatureId>> =
  [["blacklist", "whitelist"]];

/**
 * Fee-presence contract (backward compatibility):
 * - REQUIRED_FEATURES: the seven Phase 7C fees, always present (NOT NULL
 *   columns). A config missing one is malformed.
 * - OPTIONAL_FEATURES: the three V1 capability fees (NULLABLE columns).
 *   Absent means "not offered in this pricing version"; selecting one
 *   fails closed with `feature-not-offered`. Admin publish requires all
 *   ten, so actively-quoted versions always offer everything.
 */
export const REQUIRED_FEATURES: ReadonlyArray<PaidFeatureId> = [
  "burn",
  "mint",
  "pause",
  "maxTx",
  "maxWallet",
  "blacklist",
  "whitelist",
];

export const OPTIONAL_FEATURES: ReadonlyArray<PaidFeatureId> = [
  "trading",
  "antiBot",
  "autoLiquidity",
];

const PAID_SET: ReadonlySet<string> = new Set(PAID_FEATURES);
const INCLUDED_SET: ReadonlySet<string> = new Set(INCLUDED_FEATURES);
const COMING_SOON_SET: ReadonlySet<string> = new Set(COMING_SOON_FEATURES);

export function isPaidFeature(id: string): id is PaidFeatureId {
  return PAID_SET.has(id);
}

export function isIncludedFeature(id: string): id is IncludedFeatureId {
  return INCLUDED_SET.has(id);
}

export function isComingSoonFeature(id: string): id is ComingSoonFeatureId {
  return COMING_SOON_SET.has(id);
}

export function isFeatureId(id: string): id is FeatureId {
  return PAID_SET.has(id) || INCLUDED_SET.has(id) || COMING_SOON_SET.has(id);
}

export function kindOfFeature(id: string): FeatureKind | "unknown" {
  if (isPaidFeature(id)) return "paid";
  if (isIncludedFeature(id)) return "included";
  if (isComingSoonFeature(id)) return "comingSoon";
  return "unknown";
}