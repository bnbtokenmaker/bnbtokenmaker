/**
 * Phase 7A admin session primitives.
 *
 * Opaque-token sessions (no JWT, no signing secret to manage):
 * - token: 32 random bytes, hex-encoded (64 chars), carried ONLY in an
 *   HttpOnly cookie. Never persisted, never logged.
 * - stored: SHA-256 hex of the token (hash-instead-of-raw rule), with
 *   expiry + revocation columns for logout/rotation.
 *
 * Pure functions (no "server-only" import) so cookie attributes and parsing
 * stay unit-testable; the DB-backed lifecycle lives in service.ts.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "btm_admin" as const;
export const ADMIN_SESSION_TOKEN_BYTES = 32;
export const ADMIN_SESSION_TTL_MS_DEFAULT = 12 * 60 * 60 * 1000;
export const ADMIN_SESSION_TTL_MS_MIN = 60 * 60 * 1000;
export const ADMIN_SESSION_TTL_MS_MAX = 7 * 24 * 60 * 60 * 1000;

export type SessionCookieAttributes = {
  httpOnly: true;
  secure: boolean;
  sameSite: "Lax";
  path: "/";
  maxAgeSeconds: number;
};

/** Resolve session TTL from env (validated, bounded); default 12h. */
export function sessionTtlMs(): number {
  const raw = (process.env.ADMIN_SESSION_TTL_HOURS ?? "").trim();
  if (!raw) return ADMIN_SESSION_TTL_MS_DEFAULT;
  const hours = Number(raw);
  if (!Number.isFinite(hours)) return ADMIN_SESSION_TTL_MS_DEFAULT;
  const ms = Math.round(hours * 3_600_000);
  if (ms < ADMIN_SESSION_TTL_MS_MIN) return ADMIN_SESSION_TTL_MS_MIN;
  if (ms > ADMIN_SESSION_TTL_MS_MAX) return ADMIN_SESSION_TTL_MS_MAX;
  return ms;
}

/**
 * True outside local/dev: cookies get the Secure attribute.
 * `env` is injectable so both branches stay unit-testable without mutating
 * the read-only process.env.NODE_ENV typing.
 */
export function cookieSecure(env: string | undefined = process.env.NODE_ENV): boolean {
  return env === "production";
}

/** Generate a fresh opaque session token (hex, 64 chars). */
export function generateSessionToken(): string {
  return randomBytes(ADMIN_SESSION_TOKEN_BYTES).toString("hex");
}

/** SHA-256 hex of a token — the only form ever persisted. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isSessionTokenShape(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

/** Timing-safe token-hash comparison (fixed 64-hex shape). */
export function tokenHashEquals(a: string, b: string): boolean {
  if (!isSessionTokenShape(a) || !isSessionTokenShape(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Extract the session token from a Cookie header (null when absent). */
export function sessionTokenFromCookieHeader(
  header: string | null | undefined
): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (name !== ADMIN_SESSION_COOKIE) continue;
    const value = part.slice(index + 1).trim();
    const decoded = (() => {
      try {
        return decodeURIComponent(value);
      } catch {
        return null;
      }
    })();
    if (decoded && isSessionTokenShape(decoded)) return decoded;
    return null;
  }
  return null;
}

/** Build the Set-Cookie value for a fresh session. */
export function buildSessionCookie(
  token: string,
  ttlMs: number = sessionTtlMs(),
  secure: boolean = cookieSecure()
): string {
  const attrs: string[] = [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(ttlMs / 1000)}`,
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

/** Build the clearing Set-Cookie value (logout). */
export function buildClearedSessionCookie(
  secure: boolean = cookieSecure()
): string {
  const attrs: string[] = [
    `${ADMIN_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function cookieAttributesForTests(
  ttlMs: number = sessionTtlMs()
): SessionCookieAttributes {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "Lax",
    path: "/",
    maxAgeSeconds: Math.floor(ttlMs / 1000),
  };
}
