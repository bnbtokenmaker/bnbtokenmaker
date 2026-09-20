import type { CampaignState, PricingConfig } from "../types";
import type { PricingSnapshot, PricingSource } from "./types";

/**
 * Creates a PricingSource backed by a static config/campaign pair.
 *
 * This is the pure, framework-agnostic shape every source (including a future
 * DB-backed one) implements. It carries no `server-only` import on purpose so
 * the interface and factory stay importable from tests.
 *
 * The `<Dev/PricingSource>` contract is deliberately tiny:
 * - the current snapshot (config + campaign) is the source of truth,
 * - quoting is served from service functions in ./quote.ts.
 */
export function createStaticPricingSource(
  config: PricingConfig,
  campaign: CampaignState | null = null
): PricingSource {
  return {
    getPricingSnapshot(): PricingSnapshot {
      return { config, campaign };
    },
    getPricingConfigByVersion(version: string): PricingConfig | null {
      return config.version === version ? config : null;
    },
  };
}