/**
 * GET /api/campaigns/active — public campaign discovery.
 *
 * Returns the currently advertisable CODELESS campaign (or null). Promotion-
 * only fields: name, exact percent, real end time. Coded campaigns are never
 * advertised here (the schema has no public/private flag). No-store: the
 * banner must disappear the moment a campaign ends.
 */

import { getPublicCampaign } from "../../../../lib/pricing/server/public-campaign";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(): Promise<Response> {
  const campaign = await getPublicCampaign();
  return Response.json(
    { campaign },
    {
      status: 200,
      headers: { "cache-control": "no-store" },
    }
  );
}
