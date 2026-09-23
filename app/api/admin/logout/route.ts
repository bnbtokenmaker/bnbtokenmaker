/**
 * POST /api/admin/logout — revoke the presented admin session.
 *
 * Always succeeds (unknown tokens are not an error) and always clears the
 * cookie, so logout can never become a session-existence oracle.
 */

import { isSameOriginRequest } from "../../../../lib/admin/csrf";
import { logoutAdmin } from "../../../../lib/admin/service";
import {
  buildClearedSessionCookie,
  sessionTokenFromCookieHeader,
} from "../../../../lib/admin/session";
import { getAdminStores } from "../../../../lib/admin/stores";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: { code: "forbidden-origin" } }, { status: 403 });
  }
  const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
  await logoutAdmin(token, getAdminStores());
  const response = Response.json({ ok: true }, { status: 200 });
  response.headers.append("Set-Cookie", buildClearedSessionCookie());
  return response;
}
