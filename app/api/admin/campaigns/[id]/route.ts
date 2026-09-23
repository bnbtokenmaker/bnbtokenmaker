/**
 * PATCH /api/admin/campaigns/[id] — edit a campaign.
 *
 * Authenticated + CSRF + rate-limited. Auditability rule: once a campaign
 * has STARTED, only the `enabled` kill-switch may change (the store
 * re-enforces this inside the statement). Future campaigns may change
 * name/code/discount/window; ended campaigns may only be disabled.
 */

import {
  requireAdminForMutation,
  toCampaignDto,
} from "../../../../../lib/admin/pricing-api";
import { parseCampaignPatchInput } from "../../../../../lib/pricing/server/campaign-policy";
import {
  PricingStoreError,
  getPricingStores,
} from "../../../../../lib/pricing/server/store";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const guard = await requireAdminForMutation(request, "campaigns");
  if (!guard.ok) return guard.response;

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) {
    return Response.json({ error: { code: "not-found" } }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "invalid-request" } },
      { status: 400 }
    );
  }

  const stores = getPricingStores();
  const now = new Date();
  let current;
  try {
    const rows = await stores.pricing.listCampaigns();
    current = rows.find((row) => row.id === id) ?? null;
  } catch (error) {
    if (error instanceof PricingStoreError) {
      return Response.json({ error: { code: "unavailable" } }, { status: 503 });
    }
    return Response.json({ error: { code: "unavailable" } }, { status: 503 });
  }
  if (!current) {
    return Response.json({ error: { code: "not-found" } }, { status: 404 });
  }

  let patch;
  try {
    patch = parseCampaignPatchInput(
      body,
      {
        enabled: current.enabled,
        startsAt: current.startsAt,
        endsAt: current.endsAt,
      },
      now
    );
  } catch {
    return Response.json(
      { error: { code: "invalid-request" } },
      { status: 400 }
    );
  }

  // Codeless-only policy: setting a code is rejected (clearing to null or
  // leaving the code untouched stays allowed so legacy rows can be retired).
  if (patch.code !== undefined && patch.code !== null) {
    return Response.json(
      { error: { code: "invalid-request" } },
      { status: 400 }
    );
  }

  try {
    const row = await stores.pricing.patchCampaign(id, patch, guard.admin.id);
    return Response.json(
      { ok: true, campaign: toCampaignDto(row, new Date()) },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PricingStoreError) {
      if (error.code === "not-found") {
        return Response.json({ error: { code: "not-found" } }, { status: 404 });
      }
      if (error.code === "conflict") {
        return Response.json({ error: { code: "conflict" } }, { status: 409 });
      }
      return Response.json({ error: { code: "unavailable" } }, { status: 503 });
    }
    return Response.json({ error: { code: "unavailable" } }, { status: 503 });
  }
}
