/**
 * Phase 7A server quote snapshot wiring (route-level only, never unit-tested
 * directly — it binds the server-owned pricing source, which carries
 * `import "server-only"` and therefore cannot load in the tsx test runtime).
 *
 * Uses the SAME server-owned pricing source as /api/pricing/quote. The
 * recorded price is informational reconciliation, never a client claim.
 */

import "server-only";

import { weiToString } from "../pricing/money";
import { currentPricingSource } from "../pricing/server/current-pricing-source";
import { quotePlatformFee } from "../pricing/server/quote";
import type { QuoteSnapshotInput } from "./verify";

export function serverQuoteSnapshot(featureIds: string[]): QuoteSnapshotInput {
  const result = quotePlatformFee(currentPricingSource, featureIds, new Date());
  return {
    pricingVersion: result.pricingVersion,
    totalWei: weiToString(result.totalPlatformFeeWei),
  };
}
