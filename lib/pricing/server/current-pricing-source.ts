import "server-only";

import type { CampaignState, PricingConfig } from "../types";
import { DEVELOPMENT_PRICING_CONFIG } from "./config";
import { createStaticPricingSource } from "./pricing-source";
import type { PricingSource } from "./types";

/*
 * CURRENT PRODUCTION-ISH SOURCE (server-only)
 *
 * This module is the SINGLE wiring point that hands the authoritative pricing
 * config to server-side code (route handlers and Server Components).
 *
 * `import "server-only"` guarantees it can never be bundled into client JS, and
 * it is never imported by tests — tests exercise the pure quote service in
 * ./quote.ts with injected NON-PRODUCTION TEST FIXTURE sources instead.
 *
 * Campaign registry is intentionally empty for now: there is currently no
 * active campaign, so every quote carries no discount.
 */
const CURRENT_SOURCE: PricingSource = createStaticPricingSource(
  DEVELOPMENT_PRICING_CONFIG,
  null
);

export const currentPricingSource: PricingSource = CURRENT_SOURCE;

export function getCurrentPricingConfig(): PricingConfig {
  return CURRENT_SOURCE.getPricingSnapshot().config;
}

export function getCurrentCampaign(): CampaignState | null {
  return CURRENT_SOURCE.getPricingSnapshot().campaign;
}

export { DEVELOPMENT_PRICING_CONFIG };