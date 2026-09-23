/**
 * POST /api/admin/login — site-administrator sign-in.
 *
 * Generic failure shape for every credential problem (no enumeration);
 * session token is issued as an HttpOnly cookie only. Rate-limited per IP
 * and CSRF-guarded by Origin/Host validation on top of SameSite=Lax.
 */

import { isSameOriginRequest } from "../../../../lib/admin/csrf";
import {
  AuthError,
  GENERIC_LOGIN_FAILURE,
  loginAdmin,
} from "../../../../lib/admin/service";
import {
  buildSessionCookie,
  sessionTtlMs,
} from "../../../../lib/admin/session";
import { getAdminStores } from "../../../../lib/admin/stores";
import {
  checkRateLimit,
  clientIpFromRequest,
} from "../../../../lib/server/rate-limit";

export const dynamic = "force-dynamic";

const LOGIN_LIMIT = 20;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: { code: "forbidden-origin" } }, { status: 403 });
  }
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(`admin:login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!limit.allowed) {
    const response = Response.json(
      { error: { code: "rate-limited" } },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
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

  try {
    const result = await loginAdmin(body, getAdminStores());
    const response = Response.json({ ok: true }, { status: 200 });
    response.headers.append(
      "Set-Cookie",
      buildSessionCookie(result.token, sessionTtlMs())
    );
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.code === "invalid-credentials") {
        return Response.json(
          { error: { code: "invalid-credentials", message: GENERIC_LOGIN_FAILURE } },
          { status: 401 }
        );
      }
      return Response.json({ error: { code: error.code } }, { status: error.httpStatus });
    }
    return Response.json({ error: { code: "unavailable" } }, { status: 503 });
  }
}
