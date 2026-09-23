import type {
  ComingSoonFeatureId,
  IncludedFeatureId,
  PaidFeatureId,
  PricingConfig,
  PricingResult,
} from "./types";
import { parseWeiStringToBigint, weiToString } from "./money";
import { PricingError } from "./errors";
import { COMING_SOON_FEATURES, INCLUDED_FEATURES, PAID_FEATURES } from "./features";

export type FeatureLineItemDto = {
  feature: string;
  priceWei: string;
};

export type CampaignDto = {
  referenceWei: string;
  effectiveWei: string;
  discountWei: string;
  start?: string;
  end?: string;
  /**
   * Phase 7C public campaign metadata (present only when a real DB-backed
   * campaign reduced the quote). Sanitized for public display: no admin ids,
   * no internal notes.
   */
  id?: number;
  name?: string;
  code?: string | null;
  discountBasisPoints?: number;
};

export type PlatformFeeResultDto = {
  pricingVersion: string;
  baseFeeWei: string;
  selectedFeatures: ReadonlyArray<string>;
  includedFeatures: ReadonlyArray<string>;
  lineItems: ReadonlyArray<FeatureLineItemDto>;
  subtotalWei: string;
  discountWei: string;
  totalPlatformFeeWei: string;
  campaign: CampaignDto | null;
};

export type PricingConfigDto = {
  version: string;
  baseFeeWei: string;
  featureFees: Readonly<Record<PaidFeatureId, string>>;
  includedFeatures: ReadonlyArray<IncludedFeatureId>;
  comingSoonFeatures: ReadonlyArray<ComingSoonFeatureId>;
};

export function toPlatformFeeDto(result: PricingResult): PlatformFeeResultDto {
  const campaign: CampaignDto | null =
    result.campaign === null
      ? null
      : {
          referenceWei: weiToString(result.campaign.referenceWei),
          effectiveWei: weiToString(result.campaign.effectiveWei),
          discountWei: weiToString(result.campaign.discountWei),
          ...(result.campaign.start !== undefined ? { start: result.campaign.start } : {}),
          ...(result.campaign.end !== undefined ? { end: result.campaign.end } : {}),
        };
  return {
    pricingVersion: result.pricingVersion,
    baseFeeWei: weiToString(result.baseFeeWei),
    selectedFeatures: [...result.selectedFeatures],
    includedFeatures: [...result.includedFeatures],
    lineItems: result.lineItems.map((item) => ({
      feature: item.feature,
      priceWei: weiToString(item.priceWei),
    })),
    subtotalWei: weiToString(result.subtotalWei),
    discountWei: weiToString(result.discountWei),
    totalPlatformFeeWei: weiToString(result.totalPlatformFeeWei),
    campaign,
  };
}

export function toPricingConfigDto(config: PricingConfig): PricingConfigDto {
  const featureFees: Record<PaidFeatureId, string> = {
    burn: weiToString(config.featureFees.burn as bigint),
    mint: weiToString(config.featureFees.mint as bigint),
    pause: weiToString(config.featureFees.pause as bigint),
    maxTx: weiToString(config.featureFees.maxTx as bigint),
    maxWallet: weiToString(config.featureFees.maxWallet as bigint),
    blacklist: weiToString(config.featureFees.blacklist as bigint),
    whitelist: weiToString(config.featureFees.whitelist as bigint),
  };
  return {
    version: config.version,
    baseFeeWei: weiToString(config.baseFeeWei),
    featureFees,
    includedFeatures: INCLUDED_FEATURES,
    comingSoonFeatures: COMING_SOON_FEATURES,
  };
}

export function fromPricingConfigDto(dto: PricingConfigDto): PricingConfig {
  if (dto === null || typeof dto !== "object") {
    throw new PricingError("invalid-config", "pricing config dto is not an object");
  }
  if (typeof dto.version !== "string" || dto.version.trim().length === 0) {
    throw new PricingError("invalid-config-version", "pricing version must be a non-empty string");
  }
  if (typeof dto.baseFeeWei !== "string") {
    throw new PricingError("invalid-config", "base fee must be a decimal string in wei");
  }
  const featureFees: Partial<Record<PaidFeatureId, bigint>> = {};
  for (const id of PAID_FEATURES) {
    const raw = dto.featureFees[id];
    if (typeof raw !== "string") {
      throw new PricingError("invalid-config", `missing fee for feature ${id}`);
    }
    featureFees[id] = parseWeiStringToBigint(raw);
  }
  return {
    version: dto.version,
    baseFeeWei: parseWeiStringToBigint(dto.baseFeeWei),
    featureFees,
  };
}