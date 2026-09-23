/**
 * Public campaign discovery (no `server-only`, testable in tsx).
 *
 * Anonymous site-wide discovery reuses the server-authoritative selection —
 * `loadAuthoritativeSnapshot` with NO campaign code — so the topbar can only
 * ever advertise the codeless automatic campaign the quote engine itself
 * would apply. No duplicated business logic: window checks, determinism,
 * and server-time evaluation all live in the store/policy layers.
 *
 * SAFETY RULE: coded campaigns are NEVER advertised here. The schema has no
 * public/private flag, so a code meant for a private audience must not be
 * broadcast site-wide. Coded campaigns remain usable via direct
 * /create?campaign=CODE links and the promo-code input (both validated
 * server-side per attempt).
 *
 * The returned DTO is promotion-only: name, exact percent label, and real
 * end time. No DB ids, no admin ids, no audit data, no secrets.
 */

import {
  PricingStoreError,
  getPricingStores,
  loadAuthoritativeSnapshot,
  type PricingStores,
} from "./store";

export type PublicCampaign = {
  name: string;
  discountBasisPoints: number;
  /** Exact percent label, e.g. "10.00" (no floats). */
  discountPercent: string;
  /** Real campaign end, ISO string (server-provided). */
  endsAt: string;
};

/** Exact "10.00" percent label from integer basis points (no floats). */
export function basisPointsToPercentLabel(basisPoints: number): string {
  const whole = Math.floor(basisPoints / 100);
  const frac = String(basisPoints % 100).padStart(2, "0");
  return `${whole}.${frac}`;
}

/**
 * Resolves the publicly advertisable campaign right now, or null when there
 * is nothing to advertise (none active, pricing unavailable, or only coded
 * campaigns exist). Fail-silent by design: promotion must never render what
 * pricing cannot honor.
 */
export async function getPublicCampaign(
  stores: PricingStores = getPricingStores(),
  now: Date = new Date()
): Promise<PublicCampaign | null> {
  let snapshot;
  try {
    snapshot = await loadAuthoritativeSnapshot(stores, { now });
  } catch (error) {
    if (error instanceof PricingStoreError) return null;
    return null;
  }
  const campaign = snapshot.campaign;
  if (!campaign) return null;
  // Defense in depth: discovery is codeless-only. The store only resolves
  // code-null campaigns when no code is requested, but never advertise a
  // coded campaign even if a future caller passes one through.
  if (campaign.code !== null) return null;
  return {
    name: campaign.name,
    discountBasisPoints: campaign.basisPoints,
    discountPercent: basisPointsToPercentLabel(campaign.basisPoints),
    endsAt: campaign.endsAt.toISOString(),
  };
}
