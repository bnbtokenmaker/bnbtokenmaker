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
];

export const INCLUDED_FEATURES: ReadonlyArray<IncludedFeatureId> = [
  "transferOwnership",
  "renounceOwnership",
];

export const COMING_SOON_FEATURES: ReadonlyArray<ComingSoonFeatureId> = [
  "buySellTax",
  "marketingWallet",
  "feeExemption",
  "antiBot",
  "autoLiquidity",
];

export const INCOMPATIBLE_GROUPS: ReadonlyArray<ReadonlyArray<PaidFeatureId>> =
  [["blacklist", "whitelist"]];

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