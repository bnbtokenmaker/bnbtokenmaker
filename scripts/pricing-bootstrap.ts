/**
 * Phase 7C explicit pricing bootstrap.
 *
 * Usage:
 *   DATABASE_URL="postgres://user:pass@host:5432/db" npm run pricing:bootstrap
 *
 * Seeds the FIRST pricing version from the canonical development prices when
 * no active version exists yet. Idempotent: when an active version already
 * exists it reports "already initialized" and changes nothing.
 *
 * Explicit and never automatic: the Next.js runtime NEVER runs this on boot.
 * Run it once after `npm run db:migrate` (which must have applied
 * 0003_phase7c_pricing_campaigns.sql first).
 *
 * Safety: requires DATABASE_URL (refuses to run without it), never prints
 * the connection string, refuses malformed config, runs the seed inside a
 * transaction, and treats a lost race (another operator seeded first) as
 * already-initialized rather than an error.
 *
 * Self-contained like scripts/db-migrate.ts: only `pg` + node builtins plus
 * the pure helpers `lib/db/postgres-ssl.ts` and
 * `lib/pricing/server/dev-values.ts` (neither carries `server-only`, so both
 * are safe in a plain CLI process).
 */

import { Pool } from "pg";

import { postgresSslPoolConfig } from "../lib/db/postgres-ssl";
import { devPricingConfig } from "../lib/pricing/server/dev-values";

async function main(): Promise<void> {
  const connectionString = (process.env.DATABASE_URL ?? "").trim();
  if (!connectionString) {
    console.error("pricing:bootstrap: DATABASE_URL is not set — refusing to run.");
    process.exitCode = 1;
    return;
  }
  const pool = new Pool({
    ...postgresSslPoolConfig(connectionString),
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  try {
    // Migration guard: the pricing tables must exist first.
    const tables = await pool.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN ('pricing_versions', 'campaigns', 'admin_audit_events')`
    );
    const present = new Set(tables.rows.map((row) => row.tablename));
    if (
      !present.has("pricing_versions") ||
      !present.has("campaigns") ||
      !present.has("admin_audit_events")
    ) {
      console.error(
        "pricing:bootstrap: pricing tables are missing — run `npm run db:migrate` first (0003_phase7c_pricing_campaigns.sql)."
      );
      process.exitCode = 1;
      return;
    }

    const active = await pool.query<{ version: string }>(
      "SELECT version FROM pricing_versions WHERE status = 'active' LIMIT 1"
    );
    if (active.rows.length > 0) {
      console.log(
        `pricing:bootstrap: already initialized (active version ${active.rows[0].version}) — no changes made.`
      );
      return;
    }

    const seed = devPricingConfig();
    const wei = (value: bigint): string => value.toString();
    const fees = seed.featureFees;
    for (const key of ["burn", "mint", "pause", "maxTx", "maxWallet", "blacklist", "whitelist"] as const) {
      if (typeof fees[key] !== "bigint" || (fees[key] as bigint) < 0n) {
        console.error(
          "pricing:bootstrap: seed configuration is malformed — refusing to run."
        );
        process.exitCode = 1;
        return;
      }
    }

    await pool.query("BEGIN");
    try {
      // Re-check inside the transaction so concurrent bootstraps serialize.
      const locked = await pool.query<{ version: string }>(
        "SELECT version FROM pricing_versions WHERE status = 'active' LIMIT 1 FOR UPDATE"
      );
      if (locked.rows.length > 0) {
        await pool.query("ROLLBACK");
        console.log(
          `pricing:bootstrap: already initialized (active version ${locked.rows[0].version}) — no changes made.`
        );
        return;
      }
      const inserted = await pool.query<{ id: number; version: string }>(
        `INSERT INTO pricing_versions (
           base_fee_wei, burn_fee_wei, mint_fee_wei, pause_fee_wei,
           maxtx_fee_wei, maxwallet_fee_wei, blacklist_fee_wei,
           whitelist_fee_wei, status, activated_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',now())
         RETURNING id, version`,
        [
          wei(seed.baseFeeWei),
          wei(fees.burn as bigint),
          wei(fees.mint as bigint),
          wei(fees.pause as bigint),
          wei(fees.maxTx as bigint),
          wei(fees.maxWallet as bigint),
          wei(fees.blacklist as bigint),
          wei(fees.whitelist as bigint),
        ]
      );
      await pool.query(
        `INSERT INTO admin_audit_events
           (admin_user_id, action, entity_type, entity_id, metadata)
         VALUES (NULL, 'pricing_version_published', 'pricing_version', $1, $2)`,
        [
          inserted.rows[0].version,
          JSON.stringify({
            previousVersion: null,
            bootstrap: true,
            baseFeeWei: wei(seed.baseFeeWei),
          }),
        ]
      );
      await pool.query("COMMIT");
      console.log(
        `pricing:bootstrap: created initial pricing version ${inserted.rows[0].version} (id ${inserted.rows[0].id}) and activated it.`
      );
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    // A lost race on the single-active index means someone else seeded
    // first: re-read and report instead of failing.
    if (
      typeof error === "object" &&
      error !== null &&
      ((error as { code?: unknown }).code === "23505" ||
        /duplicate key value/i.test(String((error as { message?: unknown }).message ?? "")))
    ) {
      try {
        const active = await pool.query<{ version: string }>(
          "SELECT version FROM pricing_versions WHERE status = 'active' LIMIT 1"
        );
        if (active.rows.length > 0) {
          console.log(
            `pricing:bootstrap: already initialized (active version ${active.rows[0].version}) — no changes made.`
          );
          return;
        }
      } catch {
        // Fall through to the generic failure below.
      }
    }
    console.error(
      `pricing:bootstrap: FAILED — ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
