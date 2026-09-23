/**
 * Phase 7A server-only database client (Neon HTTP transport).
 *
 * - Lazily creates a single Drizzle `neon-http` handle from DATABASE_URL on
 *   first use. Transport is HTTPS (Neon serverless driver), so the
 *   production cPanel runtime needs NO outbound PostgreSQL TCP/5432 — the
 *   raw-TCP `pg` Pool path was removed from the runtime after a confirmed
 *   production `ETIMEDOUT` (see temporary [admin-login-db] diagnostic).
 * - No connection — and no schema mutation — happens at import time or on
 *   server boot. Migrations stay an EXPLICIT operation (`npm run db:migrate`,
 *   which keeps using node-postgres locally); the runtime never auto-migrates.
 * - `pg` + `lib/db/postgres-ssl.ts` remain for the explicit local CLI tools
 *   only (`scripts/db-migrate.ts`, `scripts/create-admin.ts`). They are NOT
 *   imported here: this module must never instantiate a TCP pool.
 * - Server-side by placement (route handlers / server components only) plus
 *   a runtime browser guard below. Deliberately no `import "server-only"`:
 *   that package is absent from the unit-test runtime, and this module must
 *   stay importable by tests that inject in-memory stores (same precedent as
 *   lib/pricing/server/quote.ts, which is tested marker-free while wiring
 *   modules stay unimported).
 */

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export class DatabaseUnavailableError extends Error {
  constructor(detail = "database is not configured") {
    super(`Database unavailable: ${detail}`);
    this.name = "DatabaseUnavailableError";
  }
}

let db: NeonHttpDatabase<typeof schema> | null = null;

/**
 * Returns the shared Drizzle database handle (Neon HTTP over HTTPS),
 * creating it on first call. Throws DatabaseUnavailableError when
 * DATABASE_URL is missing — callers must map this to a sanitized 503
 * (never leak the raw error). The DATABASE_URL value itself is never
 * logged or exposed here.
 */
export function getDb(): NeonHttpDatabase<typeof schema> {
  if (typeof window !== "undefined") {
    throw new DatabaseUnavailableError("must never run in the browser");
  }
  if (db) return db;
  const connectionString = (process.env.DATABASE_URL ?? "").trim();
  if (!connectionString) {
    throw new DatabaseUnavailableError("DATABASE_URL is not set");
  }
  // `neon()` only captures the connection string; the first actual query
  // performs an HTTPS request. No TCP pool is created — ever.
  db = drizzle(neon(connectionString), { schema });
  return db;
}

/** Test escape hatch: drop the cached handle between isolated runs. */
export function resetDbForTests(): void {
  db = null;
}
