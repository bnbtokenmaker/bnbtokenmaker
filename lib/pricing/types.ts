export type Wei = bigint;

export type PaidFeatureId =
  | "burn"
  | "mint"
  | "pause"
  | "maxTx"
  | "maxWallet"
  | "blacklist"
  | "whitelist"
  | "trading"
  | "antiBot"
  | "autoLiquidity";

export type IncludedFeatureId = "transferOwnership" | "renounceOwnership";

/**
 * V1: all former coming-soon capabilities graduated to paid features.
 * The kind is retained for forward compatibility (unknown future ids);
 * no purchasable capability is coming-soon in V1.
 */
export type ComingSoonFeatureId = never;

export type FeatureId = PaidFeatureId | IncludedFeatureId | ComingSoonFeatureId;

export type FeatureKind = "paid" | "included" | "comingSoon";

export type PricingConfig = {
  version: string;
  baseFeeWei: Wei;
  featureFees: Partial<Record<PaidFeatureId, Wei>>;
};

export type CampaignState = {
  status: "inactive" | "active";
  referenceWei?: Wei;
  effectiveWei?: Wei;
  start?: string;
  end?: string;
};

export type FeatureLineItem = {
  feature: PaidFeatureId;
  priceWei: Wei;
};

export type ResolvedCampaign = {
  referenceWei: Wei;
  effectiveWei: Wei;
  discountWei: Wei;
  start?: string;
  end?: string;
};

export type PricingResult = {
  pricingVersion: string;
  baseFeeWei: Wei;
  selectedFeatures: ReadonlyArray<PaidFeatureId>;
  includedFeatures: ReadonlyArray<IncludedFeatureId>;
  lineItems: ReadonlyArray<FeatureLineItem>;
  subtotalWei: Wei;
  discountWei: Wei;
  totalPlatformFeeWei: Wei;
  campaign: ResolvedCampaign | null;
};