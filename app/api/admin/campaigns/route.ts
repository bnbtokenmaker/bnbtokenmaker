/**
 * /api/admin/campaigns — honest discount campaign management.
 *
 * GET: list all campaigns with server-derived status (authenticated only).
 * POST: create a campaign (authenticated + CSRF + rate-limited). The body
 * carries name, optional code, integer basis-point discount, and a real
 * start/end window; the server validates everything and audits the write.
 */

import {
  requireAdminForMutation,
  requireAdminForRead,
  toCampaignDto,
} from "../../../../lib/admin/pricing-api";
import { parseCampaignCreateInput } from "../../../../lib/pricing/server/campaign-policy";
import {
  PricingStoreError,
  getPricingStores,
} from "../../../../lib/pricing/server/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const guard = await requireAdminForRead(request);
  if (!guard.ok) return guard.response;
  try {
    const rows = await getPricingStores().pricing.listCampaigns();
    const now = new Date();
    return Response.json(
      { campaigns: rows.map((row) => toCampaignDto(row, now)) },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PricingStoreError) {
      return Response.json({ error: { code: "unavailable" } }, { status: 503 });
    }
    return Response.json({ error: { code: "unavailable" } }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const guard = await requireAdminForMutation(request, "campaigns");
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "invalid-request" } },
      { status: 400 }
    );
  }

  let create;
  try {
    create = parseCampaignCreateInput(body, new Date());
  } catch {
    return Response.json(
      { error: { code: "invalid-request" } },
      { status: 400 }
    );
  }

  try {
    const row = await getPricingStores().pricing.createCampaign({
      name: create.name,
      code: create.code,
      basisPoints: create.basisPoints,
      startsAt: create.startsAt,
      endsAt: create.endsAt,
      adminId: guard.admin.id,
    });
    return Response.json(
      { ok: true, campaign: toCampaignDto(row, new Date()) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PricingStoreError) {
      if (error.code === "conflict") {
        return Response.json({ error: { code: "conflict" } }, { status: 409 });
      }
      return Response.json({ error: { code: "unavailable" } }, { status: 503 });
    }
    return Response.json({ error: { code: "unavailable" } }, { status: 503 });
  }
}
