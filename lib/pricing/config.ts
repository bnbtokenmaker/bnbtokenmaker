import { parseBnbToWei } from "./money";
import type { PricingConfig } from "./types";

/*
 * DEVELOPMENT / NON-PRODUCTION PRICING CONFIG
 *
 * These amounts are TEMPORARY development configuration that reproduces the
 * prototype's visible prices for visual/behavior parity only.
 *
 * They are NOT approved final commercial pricing. This source is designed to
 * be replaced by DB-backed server pricing in a later subphase.
 */
export const DEVELOPMENT_PRICING_CONFIG: PricingConfig = {
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