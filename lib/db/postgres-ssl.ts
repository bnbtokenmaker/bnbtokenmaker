/**
 * Phase 7A Postgres TLS helper for the explicit local CLI tools ONLY
 * (`scripts/db-migrate.ts`, `scripts/create-admin.ts` — pure, no
 * `server-only`, CLI-safe).
 *
 * NOTE: the Next.js application runtime (`lib/db/client.ts`) NO LONGER uses
 * this module. Since the confirmed production `ETIMEDOUT` on raw TCP/5432,
 * the runtime talks to Neon over HTTPS (`drizzle-orm/neon-http`), which
 * needs no `pg` Pool and no `sslmode` handling. This helper is RETAINED
 * because the local CLI tools still use node-postgres over TCP, where the
 * verify-full normalization below remains the correct hardening.
 *
 * Background: `pg` 8.23 emits a warning that `prefer` / `require` /
 * `verify-ca` are currently aliases for `verify-full`, with semantics
 * possibly changing in `pg` v9. Neon issues production DATABASE_URL values
 * with `?sslmode=require`, which today verifies fully but is not
 * future-safe to spell that way.
 *
 * This helper keeps CLI TLS verification secure and explicit:
 * - Loopback hosts (localhost / 127.0.0.1 / ::1) are left untouched so
 *   local plain-TCP development keeps working.
 * - Any other host gets `sslmode=verify-full` in the connection string
 *   (legacy aliases and a missing value are both normalized) plus an
 *   explicit `ssl: { rejectUnauthorized: true }` Pool option, which is the
 *   `verify-full` equivalent and survives a future `pg` sslmode change.
 * - The secret itself is never logged, printed, or otherwise exposed here;
 *   only the derived Pool config is returned.
 */

import type { PoolConfig } from "pg";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Legacy `sslmode` values that `pg` currently treats as `verify-full`. */
const LEGACY_VERIFY_ALIASES = new Set(["prefer", "require", "verify-ca"]);

function isLoopback(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return LOOPBACK_HOSTS.has(normalized);
}

/**
 * Normalize a connection string to an explicit `verify-full` equivalent
 * for non-loopback hosts. Loopback and unparseable inputs are returned
 * unchanged so local ergonomics and `pg`'s own error paths are preserved.
 */
export function normalizePostgresConnectionString(
  connectionString: string
): string {
  const trimmed = connectionString.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return connectionString;
  }
  if (isLoopback(url.hostname)) return connectionString;
  const mode = (url.searchParams.get("sslmode") ?? "").trim().toLowerCase();
  if (!mode || LEGACY_VERIFY_ALIASES.has(mode)) {
    url.searchParams.set("sslmode", "verify-full");
    return url.toString();
  }
  return connectionString;
}

/**
 * Build a future-safe `pg` Pool config fragment from a connection string.
 * Non-loopback hosts additionally get an explicit
 * `ssl: { rejectUnauthorized: true }` so certificate verification stays on
 * even if `pg` v9 changes `sslmode` alias semantics.
 */
export function postgresSslPoolConfig(
  connectionString: string
): Pick<PoolConfig, "connectionString" | "ssl"> {
  const normalized = normalizePostgresConnectionString(connectionString);
  let needsExplicitSsl = false;
  try {
    const url = new URL(normalized.trim());
    needsExplicitSsl = !isLoopback(url.hostname);
  } catch {
    needsExplicitSsl = false;
  }
  if (!needsExplicitSsl) return { connectionString };
  return {
    connectionString: normalized,
    ssl: { rejectUnauthorized: true },
  };
}
