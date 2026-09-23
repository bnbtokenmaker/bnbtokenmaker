/**
 * Phase 7A CSRF / mutation protection helpers (server-only).
 *
 * Layered defense for admin POST mutations:
 * 1. Session cookie is SameSite=Lax (set in lib/admin/session.ts), so
 *    cross-site POSTs do not carry it in modern browsers.
 * 2. Origin/Host validation below rejects cross-site callers that DO manage
 *    to present credentials (older browsers, misconfigured agents).
 *
 * Enforcement policy: when the request carries an Origin or Referer header,
 * it MUST match the request Host (or X-Forwarded-Host behind the proxy).
 * Requests with neither header (same-origin navigations, curl) pass — the
 * session cookie remains the actual authenticator.
 *
 * Phase 7B note: if the admin dashboard gains cross-origin fetch flows or
 * file uploads, add a per-session CSRF token there. For 7A's login/logout
 * mutations, SameSite + Origin validation is the appropriate weight.
 */

export function requestHost(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim().toLowerCase();
    if (first) return first;
  }
  try {
    return new URL(request.url).host.toLowerCase();
  } catch {
    return "";
  }
}

function originHost(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/** True when the request is acceptably same-origin (see policy above). */
export function isSameOriginRequest(request: Request): boolean {
  const host = requestHost(request);
  if (!host) return false;
  const origin = request.headers.get("origin");
  if (origin !== null) {
    const parsed = originHost(origin);
    return parsed !== null && parsed === host;
  }
  const referer = request.headers.get("referer");
  if (referer !== null) {
    const parsed = originHost(referer);
    return parsed !== null && parsed === host;
  }
  return true;
}
