import type { CampaignDto } from "../dto";
import type { CampaignState, PaidFeatureId, PricingConfig } from "../types";

export const CURRENCY_BNB = "BNB" as const;
export type CurrencyCode = typeof CURRENCY_BNB;

export type PricingSnapshot = {
  config: PricingConfig;
  campaign: CampaignState | null;
};

export interface PricingSource {
  getPricingSnapshot(): PricingSnapshot;
  getPricingConfigByVersion(version: string): PricingConfig | null;
}

export type QuoteRequest = {
  preset?: string | null;
  features?: ReadonlyArray<string> | null;
};

export type QuoteLineItemDto = {
  feature: PaidFeatureId;
  priceWei: string;
};

export type QuoteResponse = {
  pricingVersion: string;
  currency: CurrencyCode;
  basePriceWei: string;
  basePriceBnb: string;
  lineItems: ReadonlyArray<QuoteLineItemDto>;
  selectedFeatures: ReadonlyArray<string>;
  subtotalWei: string;
  discountWei: string;
  totalWei: string;
  totalBnb: string;
  campaign: CampaignDto | null;
};

export type QuoteErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};