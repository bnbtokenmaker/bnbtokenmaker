import { PricingError, type ValidationResult } from "./errors";
import {
  INCLUDED_FEATURES,
  INCOMPATIBLE_GROUPS,
  PAID_FEATURES,
  kindOfFeature,
} from "./features";
import type {
  CampaignState,
  FeatureLineItem,
  PaidFeatureId,
  PricingConfig,
  PricingResult,
  ResolvedCampaign,
  Wei,
} from "./types";

export function validateConfig(config: PricingConfig): ValidationResult {
  const errors: PricingError[] = [];
  if (typeof config.version !== "string" || config.version.trim().length === 0) {
    errors.push(new PricingError("invalid-config-version", "pricing version must be a non-empty string"));
  }
  if (config.baseFeeWei < 0n) {
    errors.push(new PricingError("negative-fee", "base fee must not be negative"));
  }
  for (const key of Object.keys(config.featureFees)) {
    if (!PAID_FEATURES.includes(key as PaidFeatureId)) {
      errors.push(new PricingError("unknown-feature-fee", "fee configured for an unknown feature", key));
    }
    const value = config.featureFees[key as PaidFeatureId];
    if (value !== undefined && value < 0n) {
      errors.push(new PricingError("negative-fee", "feature fee must not be negative", key));
    }
  }
  for (const id of PAID_FEATURES) {
    if (config.featureFees[id] === undefined) {
      errors.push(new PricingError("missing-feature-fee", "no fee configured for a paid feature", id));
    }
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function validateSelection(
  config: PricingConfig,
  selected: ReadonlyArray<string>
): ValidationResult {
  const configResult = validateConfig(config);
  if (!configResult.ok) {
    return configResult;
  }
  const errors: PricingError[] = [];
  const seen = new Set<string>();
  const chosen = new Set<string>();
  for (const id of selected) {
    if (seen.has(id)) {
      errors.push(new PricingError("duplicate-feature", "a feature must be selected at most once", id));
    }
    seen.add(id);
    const kind = kindOfFeature(id);
    if (kind === "unknown") {
      errors.push(new PricingError("unknown-feature", "unknown feature id", id));
      continue;
    }
    if (kind === "included") {
      errors.push(
        new PricingError("included-feature-selected", "included features cannot be priced add-ons", id)
      );
      continue;
    }
    if (kind === "comingSoon") {
      errors.push(
        new PricingError("coming-soon-feature-selected", "coming soon features are not purchasable", id)
      );
      continue;
    }
    chosen.add(id);
  }
  for (const group of INCOMPATIBLE_GROUPS) {
    if (group.every((id) => chosen.has(id))) {
      errors.push(
        new PricingError(
          "incompatible-features",
          `${group.join(" and ")} are mutually exclusive`,
          group.join(",")
        )
      );
    }
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function resolveCampaign(campaign: CampaignState | undefined, subtotalWei: Wei): ResolvedCampaign | null {
  if (campaign === undefined) {
    return null;
  }
  if (campaign.status === "inactive") {
    return null;
  }
  if (campaign.status !== "active") {
    throw new PricingError("invalid-campaign", "unknown campaign status");
  }
  const referenceWei = campaign.referenceWei;
  const effectiveWei = campaign.effectiveWei;
  if (typeof referenceWei !== "bigint" || typeof effectiveWei !== "bigint") {
    throw new PricingError("invalid-campaign", "active campaign requires reference and effective wei");
  }
  if (referenceWei < 0n || effectiveWei < 0n) {
    throw new PricingError("invalid-campaign", "campaign amounts must not be negative");
  }
  if (effectiveWei > referenceWei) {
    throw new PricingError("invalid-campaign", "effective price cannot exceed the reference price");
  }
  const discountWei = referenceWei - effectiveWei;
  if (discountWei > subtotalWei) {
    throw new PricingError("invalid-campaign", "discount cannot exceed the platform fee subtotal");
  }
  const resolved: ResolvedCampaign = { referenceWei, effectiveWei, discountWei };
  if (campaign.start !== undefined) resolved.start = campaign.start;
  if (campaign.end !== undefined) resolved.end = campaign.end;
  return resolved;
}

export function calculatePlatformFee(
  config: PricingConfig,
  selected: ReadonlyArray<string>,
  campaign?: CampaignState
): PricingResult {
  const configResult = validateConfig(config);
  if (!configResult.ok) {
    throw configResult.errors[0];
  }
  const selectionResult = validateSelection(config, selected);
  if (!selectionResult.ok) {
    throw selectionResult.errors[0];
  }

  const chosen = new Set<string>(selected);
  const selectedFeatures: ReadonlyArray<PaidFeatureId> = PAID_FEATURES.filter((id) =>
    chosen.has(id)
  );

  const lineItems: ReadonlyArray<FeatureLineItem> = selectedFeatures.map((feature) => ({
    feature,
    priceWei: (config.featureFees[feature] as Wei),
  }));

  const subtotalWei = lineItems.reduce((sum, item) => sum + item.priceWei, config.baseFeeWei);

  const campaignResolved = resolveCampaign(campaign, subtotalWei);
  const discountWei = campaignResolved === null ? 0n : campaignResolved.discountWei;
  const totalPlatformFeeWei = subtotalWei - discountWei;
  if (totalPlatformFeeWei < 0n) {
    throw new PricingError("invalid-campaign", "total platform fee must not be negative");
  }

  return {
    pricingVersion: config.version,
    baseFeeWei: config.baseFeeWei,
    selectedFeatures,
    includedFeatures: INCLUDED_FEATURES,
    lineItems,
    subtotalWei,
    discountWei,
    totalPlatformFeeWei,
    campaign: campaignResolved,
  };
}