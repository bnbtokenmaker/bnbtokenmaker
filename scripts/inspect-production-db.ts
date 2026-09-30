/**
 * Production DB inspection script — READ ONLY.
 *
 * SAFETY: This script performs NO writes. It only reads schema state,
 * pricing versions, and row counts.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." npx tsx scripts/inspect-production-db.ts
 *
 * Output:
 *   - Connection success/failure
 *   - Migration/schema state
 *   - Whether 0004 columns exist
 *   - Active pricing version
 *   - Pricing version count
 *   - Deployment count
 *   - Campaign count
 *
 * NEVER prints:
 *   - DATABASE_URL
 *   - Passwords
 *   - Unrelated customer/deployer data
 *   - Full table dumps
 */
import { neon } from "@neondatabase/serverless";

async function main(): Promise<void> {
  const connectionString = (process.env.DATABASE_URL ?? "").trim();
  if (!connectionString) {
    console.error("inspect-production-db: DATABASE_URL is not set — refusing to run.");
    process.exit(1);
  }

  console.log("inspect-production-db: connecting...");
  const sql = neon(connectionString);

  try {
    // Connection test
    await sql`SELECT 1`;
    console.log("inspect-production-db: connection SUCCESS");

    // Schema migrations (try supabase_migrations, fallback to drizzle)
    try {
      const migrations = await sql`
        SELECT version, name, run_on
        FROM supabase_migrations.schema_migrations
        ORDER BY version
      `;
      console.log("inspect-production-db: migrations (supabase_migrations):");
      for (const row of migrations as unknown as Array<{ version: string; name: string; run_on: string }>) {
        console.log(`  - ${row.version}: ${row.name} (${row.run_on})`);
      }
    } catch {
      console.log("inspect-production-db: supabase_migrations.schema_migrations not found");
      // Try drizzle migrations table
      try {
        const migrations = await sql`
          SELECT id, hash, created_at
          FROM drizzle.__migrations
          ORDER BY created_at
        `;
        console.log("inspect-production-db: migrations (drizzle):");
        for (const row of migrations as unknown as Array<{ id: string; hash: string; created_at: string }>) {
          console.log(`  - ${row.id}: ${row.hash} (${row.created_at})`);
        }
      } catch {
        console.log("inspect-production-db: no migration tracking table found");
      }
    }

    // Check 0004 columns
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'pricing_versions'
        AND column_name IN ('trading_fee_wei', 'antibot_fee_wei', 'autoliquidity_fee_wei')
    `;
    const columnNames = (columns as unknown as Array<{ column_name: string }>).map((r) => r.column_name);
    console.log(`inspect-production-db: 0004 columns present: ${columnNames.length > 0 ? "YES" : "NO"}`);
    if (columnNames.length > 0) {
      console.log(`  - ${columnNames.join(", ")}`);
    }

    // Pricing versions (handle both old and new schema)
    try {
      const pricingVersions = await sql`
        SELECT version, is_active, created_at
        FROM pricing_versions
        ORDER BY created_at DESC
      `;
      const versions = pricingVersions as unknown as Array<{ version: string; is_active: boolean; created_at: string }>;
      console.log(`inspect-production-db: pricing version count: ${versions.length}`);
      for (const v of versions) {
        console.log(`  - ${v.version} (active: ${v.is_active}, created: ${v.created_at})`);
      }

      // Active pricing version
      const active = versions.find((v) => v.is_active);
      console.log(`inspect-production-db: active pricing version: ${active?.version ?? "NONE"}`);

      // If v7 is active, report its fee values
      if (active?.version === "7" || active?.version === "v7") {
        const v7Fees = await sql`
          SELECT base_fee_wei, burn_fee_wei, mint_fee_wei, pause_fee_wei,
                 max_tx_fee_wei, max_wallet_fee_wei, blacklist_fee_wei, whitelist_fee_wei
          FROM pricing_versions
          WHERE version = ${active.version}
        `;
        const fees = (v7Fees as unknown as Array<Record<string, string>>)[0];
        if (fees) {
          console.log("inspect-production-db: active version fee values (wei):");
          for (const [k, v] of Object.entries(fees)) {
            console.log(`  - ${k}: ${v}`);
          }
        }
      }
    } catch (error) {
      // Try without is_active column
      try {
        const pricingVersions = await sql`
          SELECT version, created_at
          FROM pricing_versions
          ORDER BY created_at DESC
        `;
        const versions = pricingVersions as unknown as Array<{ version: string; created_at: string }>;
        console.log(`inspect-production-db: pricing version count: ${versions.length}`);
        for (const v of versions) {
          console.log(`  - ${v.version} (created: ${v.created_at})`);
        }
        console.log("inspect-production-db: is_active column not found — cannot determine active version");
      } catch (e) {
        console.log("inspect-production-db: pricing_versions table not accessible:", (e as Error).message);
      }
    }

    // Deployment count
    const deploymentCount = await sql`SELECT count(*) as count FROM deployments`;
    console.log(`inspect-production-db: deployment count: ${(deploymentCount as unknown as Array<{ count: string }>)[0]?.count ?? "unknown"}`);

    // Campaign count
    const campaignCount = await sql`SELECT count(*) as count FROM campaigns`;
    console.log(`inspect-production-db: campaign count: ${(campaignCount as unknown as Array<{ count: string }>)[0]?.count ?? "unknown"}`);

    console.log("inspect-production-db: inspection complete.");
  } catch (error) {
    console.error("inspect-production-db: inspection failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("inspect-production-db: fatal error:", error);
  process.exit(1);
});
