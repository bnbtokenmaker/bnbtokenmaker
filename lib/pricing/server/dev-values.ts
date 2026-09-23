/**
 * Phase 7C development pricing values (plain module, deliberately NO
 * `import "server-only"`).
 *
 * Single source of truth for the temporary development prices (base 0.050
 * BNB + the seven feature add-ons). Two consumers:
 * - lib/pricing/server/config.ts re-exports them as the server-only
 *   DEVELOPMENT_PRICING_CONFIG (unchanged authority story);
 * - the DB-backed snapshot loader + the explicit pricing:bootstrap CLI use
 *   them as the non-production fallback / seed, because neither a tsx test
 *   process nor a plain CLI process can import a `server-only` module.
 *
 * These values are NOT secrets (the same fees already ship to the browser
 * inside the public pricing DTO) — but they are also NOT authoritative in
 * production: production quotes always come from the active DB pricing
 * version, and the fallback below is disabled there.
 */

import { parseBnbToWei } from "../money";
import type { PricingConfig } from "../types";

export const DEV_PRICING_VERSION = "dev-1";

export const DEV_PRICING_FEES_BNB = {
  base: "0.050",
  burn: "0.005",
  mint: "0.010",
  pause: "0.005",
  maxTx: "0.010",
  maxWallet: "0.010",
  blacklist: "0.010",
  whitelist: "0.010",
} as const;

export function devPricingConfig(): PricingConfig {
  return {
    version: DEV_PRICING_VERSION,
    baseFeeWei: parseBnbToWei(DEV_PRICING_FEES_BNB.base),
    featureFees: {
      burn: parseBnbToWei(DEV_PRICING_FEES_BNB.burn),
      mint: parseBnbToWei(DEV_PRICING_FEES_BNB.mint),
      pause: parseBnbToWei(DEV_PRICING_FEES_BNB.pause),
      maxTx: parseBnbToWei(DEV_PRICING_FEES_BNB.maxTx),
      maxWallet: parseBnbToWei(DEV_PRICING_FEES_BNB.maxWallet),
      blacklist: parseBnbToWei(DEV_PRICING_FEES_BNB.blacklist),
      whitelist: parseBnbToWei(DEV_PRICING_FEES_BNB.whitelist),
    },
  };
}
