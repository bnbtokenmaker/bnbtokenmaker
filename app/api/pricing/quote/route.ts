/**
 * POST /api/pricing/quote — server-authoritative platform fee quote.
 *
 * Phase 7C: quotes are priced from the ACTIVE DB pricing version plus the
 * currently-applicable campaign, resolved against server time. The client
 * supplies ONLY the selection intent ({ preset?, features?, campaignCode? });
 * every money value (base, features, discount, total, version) is derived
 * server-side and returned as canonical wei strings.
 *
 * FAILURE POLICY (fail closed): when the pricing database is unavailable or
 * no version is active, the endpoint returns a sanitized 503 — it never
 * guesses a price, never falls back to a client value, and never silently
 * charges a code default. (Outside production with no DATABASE_URL at all, a
 * static development fallback keeps zero-setup local work operable; it is
 * disabled in production and whenever a database is configured.)
 *
 * Correctness over caching: no-store. Each quote is a fresh authoritative
 * read so admin-published prices take effect immediately.
 */

import { PricingStoreError, getPricingStores, loadAuthoritativeSnapshot } from "../../../../lib/pricing/server/store";
import {
  parseQuoteRequest,
  quoteFromSnapshot,
  toQuoteDto,
} from "../../../../lib/pricing/server/quote";
import type {
  QuoteErrorResponse,
  QuoteResponse,
} from "../../../../lib/pricing/server/types";

/** The platform fee endpoint is server-side by design; Node runtime is the default. */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

function errorResponse(code: string, message: string, status = 400): Response {
  const body: QuoteErrorResponse = { error: { code, message } };
  return Response.json(body, { status });
}

function quoteCampaignMeta(snapshot: {
  campaign: {
    id: number;
    name: string;
    code: string | null;
    basisPoints: number;
  } | null;
}):
  | { id: number; name: string; code: string | null; discountBasisPoints: number }
  | undefined {
  if (!snapshot.campaign) return undefined;
  return {
    id: snapshot.campaign.id,
    name: snapshot.campaign.name,
    code: snapshot.campaign.code,
    discountBasisPoints: snapshot.campaign.basisPoints,
  };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid-json", "request body must be valid JSON");
  }

  const parsed = parseQuoteRequest(body);
  if (!parsed.ok) {
    return errorResponse(parsed.code, parsed.message);
  }

  try {
    const snapshot = await loadAuthoritativeSnapshot(getPricingStores(), {
      now: new Date(),
      campaignCode: parsed.campaignCode,
    });
    const result = quoteFromSnapshot(snapshot, parsed.selection);
    const quote: QuoteResponse = toQuoteDto(
      result,
      quoteCampaignMeta(snapshot)
    );
    return Response.json({ quote }, { status: 201 });
  } catch (error) {
    if (error instanceof PricingStoreError) {
      if (error.code === "invalid-campaign-code") {
        return errorResponse(error.code, error.message, 400);
      }
      // no-active-pricing / unavailable: sanitized 503, never a guessed price.
      return errorResponse("pricing-unavailable", "pricing is temporarily unavailable", 503);
    }
    return errorResponse("internal-error", "unable to compute quote right now", 500);
  }
}
