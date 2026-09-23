/**
 * POST /api/admin/pricing/publish — publish a new immutable pricing version.
 *
 * Authenticated admins only, same-origin CSRF guarded, rate-limited. The
 * body carries the eight fee fields as human-readable BNB decimal strings;
 * the server parses them to exact wei, validates caps, then atomically
 * inserts the new version + deactivates the previous + activates the new +
 * audits. Historical versions are never rewritten.
 */

import { requireAdminForMutation } from "../../../../../lib/admin/pricing-api";
import { parsePricingPublishInput } from "../../../../../lib/pricing/server/campaign-policy";
import {
  PricingStoreError,
  getPricingStores,
} from "../../../../../lib/pricing/server/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const guard = await requireAdminForMutation(request, "pricing-publish");
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

  let fees;
  try {
    fees = parsePricingPublishInput(body).fees;
  } catch {
    // Sanitized: field-level detail stays server-side (logged nowhere with
    // secrets); the operator sees the form validation client-side first.
    return Response.json(
      { error: { code: "invalid-request" } },
      { status: 400 }
    );
  }

  try {
    const created = await getPricingStores().pricing.publishVersion({
      fees,
      adminId: guard.admin.id,
    });
    return Response.json(
      { ok: true, version: { id: created.id, version: created.version } },
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
