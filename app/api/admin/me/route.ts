/**
 * GET /api/admin/me — authenticated session status (minimal, Phase 7A).
 *
 * Returns the active admin identifier or 401. Used by the protected admin
 * shell to prove server-side authorization; no admin data beyond the
 * identifier is exposed.
 */

import { AuthError } from "../../../../lib/admin/service";
import { authenticateAdmin } from "../../../../lib/admin/service";
import { sessionTokenFromCookieHeader } from "../../../../lib/admin/session";
import { getAdminStores } from "../../../../lib/admin/stores";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
  try {
    const admin = await authenticateAdmin(token, getAdminStores());
    return Response.json(
      { admin: { identifier: admin.identifier } },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: { code: "unauthenticated" } },
        { status: 401 }
      );
    }
    return Response.json({ error: { code: "unavailable" } }, { status: 503 });
  }
}
