/**
 * Phase 7A explicit database migration runner.
 *
 * Usage:
 *   DATABASE_URL="postgres://user:pass@host:5432/db" npm run db:migrate
 *
 * Applies pending files from db/migrations/ in lexicographic order, exactly
 * once each (tracked in schema_migrations), each inside its own transaction.
 * The Next.js runtime NEVER runs this automatically — production has no
 * shell, so point this script at the production DATABASE_URL from a local
 * machine to perform the initial migration (see Phase 7A report).
 *
 * Self-contained on purpose: it uses only `pg` + node builtins plus the
 * pure TLS helper `lib/db/postgres-ssl.ts` (no `server-only`, safe in a
 * plain CLI process). It does NOT import other lib/db/* modules. SQL files
 * remain the single source of DDL.
 */

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

import { postgresSslPoolConfig } from "../lib/db/postgres-ssl";

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "db",
  "migrations"
);

async function main(): Promise<void> {
  const connectionString = (process.env.DATABASE_URL ?? "").trim();
  if (!connectionString) {
    console.error("db:migrate: DATABASE_URL is not set — refusing to run.");
    process.exitCode = 1;
    return;
  }
  const pool = new Pool({
    // Same future-safe TLS as the runtime (verify-full equivalent).
    ...postgresSslPoolConfig(connectionString),
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         filename TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`
    );
    const applied = new Set<string>(
      (await pool.query<{ filename: string }>(
        "SELECT filename FROM schema_migrations"
      )).rows.map((row) => row.filename)
    );
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    if (files.length === 0) {
      console.log("db:migrate: no migration files found.");
      return;
    }
    let appliedCount = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`db:migrate: skip ${file} (already applied)`);
        continue;
      }
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      await pool.query("BEGIN");
      try {
        await pool.query(sql);
        await pool.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file]
        );
        await pool.query("COMMIT");
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
      appliedCount++;
      console.log(`db:migrate: applied ${file}`);
    }
    console.log(
      `db:migrate: done (${appliedCount} applied, ${files.length - appliedCount} already current).`
    );
  } catch (error) {
    console.error(
      `db:migrate: FAILED — ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
