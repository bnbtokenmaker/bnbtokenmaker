/**
 * GET /api/admin/pricing — active pricing version, recent version history,
 * and recent financial-config audit events (authenticated admins only).
 */

import {
  requireAdminForRead,
  toAuditEventDto,
  toPricingVersionDto,
} from "../../../../lib/admin/pricing-api";
import {
  PricingStoreError,
  getPricingStores,
} from "../../../../lib/pricing/server/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const guard = await requireAdminForRead(request);
  if (!guard.ok) return guard.response;
  try {
    const { pricing } = getPricingStores();
    const [active, versions, audit] = await Promise.all([
      pricing.getActiveVersion(),
      pricing.listVersions(20),
      pricing.listAuditEvents(10),
    ]);
    return Response.json(
      {
        active: active ? toPricingVersionDto(active) : null,
        versions: versions.map(toPricingVersionDto),
        audit: audit.map(toAuditEventDto),
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PricingStoreError) {
      return Response.json(
        { error: { code: "unavailable" } },
        { status: 503 }
      );
    }
    return Response.json({ error: { code: "unavailable" } }, { status: 503 });
  }
}
