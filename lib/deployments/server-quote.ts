/**
 * Phase 7C server quote snapshot wiring (route-level only, never unit-tested
 * directly — it binds server-owned modules carrying `import "server-only"`).
 *
 * Uses the SAME authoritative snapshot as /api/pricing/quote (active DB
 * pricing version + applicable campaign). The recorded price is
 * informational reconciliation, never a client claim, and never part of the
 * deployment's blockchain identity (idempotency keys on chain+tx only).
 *
 * OUTAGE BEHAVIOR: if pricing is unavailable, the snapshot is marked
 * { pricingVersion: "unavailable", totalWei: "0" } instead of failing the
 * deployment record. totalWei "0" here is a NON-QUOTE marker (check the
 * version first); the actual fee fact lives in platformFeeWei, verified
 * independently from the transaction value (always "0" on testnet).
 */

import "server-only";

import { weiToString } from "../pricing/money";
import { quoteFromSnapshot } from "../pricing/server/quote";
import {
  getPricingStores,
  loadAuthoritativeSnapshot,
} from "../pricing/server/store";
import type { QuoteSnapshotInput } from "./verify";

/** Marker version for snapshots taken while pricing was unavailable. */
export const QUOTE_SNAPSHOT_UNAVAILABLE = "unavailable";

export async function serverQuoteSnapshot(
  featureIds: string[]
): Promise<QuoteSnapshotInput> {
  try {
    const snapshot = await loadAuthoritativeSnapshot(getPricingStores(), {
      now: new Date(),
    });
    const result = quoteFromSnapshot(snapshot, featureIds);
    return {
      pricingVersion: result.pricingVersion,
      totalWei: weiToString(result.totalPlatformFeeWei),
    };
  } catch {
    return { pricingVersion: QUOTE_SNAPSHOT_UNAVAILABLE, totalWei: "0" };
  }
}
