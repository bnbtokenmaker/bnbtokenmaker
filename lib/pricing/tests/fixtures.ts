import { parseBnbToWei } from "../money";
import type { PricingConfig, CampaignState } from "../types";
import { createStaticPricingSource } from "../server/pricing-source";
import type { PricingSource } from "../server/types";

/*
 * NON-PRODUCTION TEST FIXTURES
 *
 * Tests run under the plain Node test runner (`tsx --test`) and intentionally
 * never import server-only modules (`server/config.ts`, `current-pricing-source.ts`).
 * This module mirrors the server-owned dev config values so the domain/suite can
 * assert against identical amounts without crossing the server boundary.
 *
 * These amounts are NOT approved commercial pricing; they exist only to keep
 * test expectation parity with the development wiring.
 */
export const TEST_PRICING_CONFIG: PricingConfig = {
  version: "dev-1",
  baseFeeWei: parseBnbToWei("0.050"),
  featureFees: {
    burn: parseBnbToWei("0.005"),
    mint: parseBnbToWei("0.010"),
    pause: parseBnbToWei("0.005"),
    maxTx: parseBnbToWei("0.010"),
    maxWallet: parseBnbToWei("0.010"),
    blacklist: parseBnbToWei("0.010"),
    whitelist: parseBnbToWei("0.010"),
  },
};

export function testPricingSource(campaign: CampaignState | null = null): PricingSource {
  return createStaticPricingSource(TEST_PRICING_CONFIG, campaign);
}