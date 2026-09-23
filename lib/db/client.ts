/**
 * Phase 7A server-only Postgres client.
 *
 * - Lazily creates a single `pg` Pool (pure JS, no native binaries) from
 *   DATABASE_URL on first use. No connection — and no schema mutation —
 *   happens at import time or on server boot.
 * - Migrations are an EXPLICIT operation (`npm run db:migrate`); the
 *   runtime never auto-migrates.
 * - Server-side by placement (route handlers / server components / CLI
 *   scripts only) plus a runtime browser guard below. Deliberately no
 *   `import "server-only"`: that package is absent from the unit-test
 *   runtime, and this module must stay importable by tests that inject
 *   in-memory stores (same precedent as lib/pricing/server/quote.ts,
 *   which is tested marker-free while wiring modules stay unimported).
 */


import { Pool, type PoolConfig } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export class DatabaseUnavailableError extends Error {
  constructor(detail = "database is not configured") {
    super(`Database unavailable: ${detail}`);
    this.name = "DatabaseUnavailableError";
  }
}

let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

function poolConfigFromEnv(): PoolConfig {
  const connectionString = (process.env.DATABASE_URL ?? "").trim();
  if (!connectionString) {
    throw new DatabaseUnavailableError("DATABASE_URL is not set");
  }
  return {
    connectionString,
    // Small pool: cPanel runtime + low-traffic admin/persistence workload.
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  };
}

/**
 * Returns the shared Drizzle database handle, creating the pool on first
 * call. Throws DatabaseUnavailableError when DATABASE_URL is missing —
 * callers must map this to a sanitized 503 (never leak the raw error).
 */
export function getDb(): NodePgDatabase<typeof schema> {
  if (typeof window !== "undefined") {
    throw new DatabaseUnavailableError("must never run in the browser");
  }
  if (db) return db;
  if (!pool) {
    pool = new Pool(poolConfigFromEnv());
    pool.on("error", () => {
      // Idle-client errors must not crash the standalone server; per-call
      // failures still surface to the awaiting handler.
    });
  }
  db = drizzle(pool, { schema });
  return db;
}

/** Raw pool access for the explicit migration script (server-only). */
export function getPool(): Pool {
  getDb();
  if (!pool) throw new DatabaseUnavailableError("pool failed to initialize");
  return pool;
}

/** Test escape hatch: drop the cached pool between isolated runs. */
export function resetDbForTests(): void {
  pool = null;
  db = null;
}
