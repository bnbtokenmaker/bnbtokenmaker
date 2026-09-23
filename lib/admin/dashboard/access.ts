/**
 * Phase 7B admin page access helper (pure logic, no Next.js imports).
 *
 * Resolves the session cookie token against the admin stores and reports a
 * discriminated outcome so pages stay tiny:
 * - ok: render the dashboard with `identifier`.
 * - unauthenticated: redirect to /admin/login (pages call `redirect()`).
 * - unavailable: render a sanitized service-error state (NEVER redirect to
 *   login on a database outage — that would loop and mislead).
 *
 * Testable with in-memory stores; no database required.
 */

import {
  AuthError,
  authenticateAdmin,
  type AdminStores,
} from "../service";

export type AdminAccess =
  | { ok: true; identifier: string }
  | { ok: false; reason: "unauthenticated" | "unavailable" };

export async function resolveAdminAccess(
  token: string | null | undefined,
  stores: AdminStores,
  now: Date = new Date()
): Promise<AdminAccess> {
  try {
    const admin = await authenticateAdmin(token, stores, now);
    return { ok: true, identifier: admin.identifier };
  } catch (error) {
    if (error instanceof AuthError && error.code === "unavailable") {
      return { ok: false, reason: "unavailable" };
    }
    return { ok: false, reason: "unauthenticated" };
  }
}
