export type Wei = bigint;

export type PaidFeatureId =
  | "burn"
  | "mint"
  | "pause"
  | "maxTx"
  | "maxWallet"
  | "blacklist"
  | "whitelist";

export type IncludedFeatureId = "transferOwnership" | "renounceOwnership";

export type ComingSoonFeatureId =
  | "buySellTax"
  | "marketingWallet"
  | "feeExemption"
  | "antiBot"
  | "autoLiquidity";

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