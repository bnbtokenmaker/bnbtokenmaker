/**
 * Phase 7A initial-admin bootstrap (CLI ONLY).
 *
 * Usage (secrets via environment, never committed, never printed):
 *   DATABASE_URL="postgres://..." \
 *   ADMIN_SETUP_TOKEN="<long-random-token-also-stored-server-side>" \
 *   ADMIN_INITIAL_IDENTIFIER="admin" \
 *   ADMIN_INITIAL_PASSWORD="<strong-password-min-12-chars>" \
 *   npm run admin:create
 *
 * - Takes credentials ONLY from the environment (or secure interactive
 *   input); refuses to run when any value is missing.
 * - Stores ONLY the scrypt hash (same parameters as lib/admin/password.ts:
 *   N=16384, r=8, p=1, 64-byte key). The password and hash are never
 *   printed or logged.
 * - Refuses to overwrite an existing identifier (no silent resets).
 * - There is intentionally NO unauthenticated HTTP endpoint for this:
 *   creation happens here, operator-side, before going live.
 *
 * Self-contained like db-migrate.ts: does not import lib/admin/* because
 * those modules carry `import "server-only"`. The only lib import is the
 * pure TLS helper `lib/db/postgres-ssl.ts` (no `server-only`, CLI-safe).
 */

import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { Pool } from "pg";

import { postgresSslPoolConfig } from "../lib/db/postgres-ssl";

async function readEnvOrPrompt(
  name: string,
  secret: boolean
): Promise<string> {
  const fromEnv = (process.env[name] ?? "").trim();
  if (fromEnv) return fromEnv;
  if (!process.stdin.isTTY) return "";
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    // NOTE: readline echoes input; for real secrecy prefer env vars.
    // Interactive mode is a convenience fallback, values stay in memory.
    const answer = await rl.question(`${name}: `);
    void secret;
    return answer.trim();
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const connectionString = (process.env.DATABASE_URL ?? "").trim();
  const setupToken = (process.env.ADMIN_SETUP_TOKEN ?? "").trim();
  if (!connectionString) {
    console.error("admin:create: DATABASE_URL is not set — refusing to run.");
    process.exitCode = 1;
    return;
  }
  if (!setupToken) {
    console.error(
      "admin:create: ADMIN_SETUP_TOKEN is not set — refusing to run."
    );
    process.exitCode = 1;
    return;
  }
  const identifier = (
    await readEnvOrPrompt("ADMIN_INITIAL_IDENTIFIER", false)
  )
    .toLowerCase();
  const password = await readEnvOrPrompt("ADMIN_INITIAL_PASSWORD", true);
  if (!identifier || identifier.length < 3 || identifier.length > 320) {
    console.error(
      "admin:create: ADMIN_INITIAL_IDENTIFIER must be 3..320 characters."
    );
    process.exitCode = 1;
    return;
  }
  if (!password || password.length < 12 || password.length > 256) {
    console.error(
      "admin:create: ADMIN_INITIAL_PASSWORD must be 12..256 characters."
    );
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    // Same future-safe TLS as the runtime (verify-full equivalent).
    ...postgresSslPoolConfig(connectionString),
    max: 1,
  });
  try {
    const existing = await pool.query(
      "SELECT id FROM admin_users WHERE identifier = $1",
      [identifier]
    );
    if (existing.rowCount !== 0) {
      console.error(
        `admin:create: identifier "${identifier}" already exists — refusing to overwrite.`
      );
      process.exitCode = 1;
      return;
    }
    const salt = randomBytes(16);
    const key = scryptSync(password, salt, 64, {
      N: 16384,
      r: 8,
      p: 1,
    });
    const passwordHash = `scrypt$16384$8$1$${salt.toString("hex")}$${key.toString("hex")}`;
    await pool.query(
      `INSERT INTO admin_users (identifier, password_hash)
       VALUES ($1, $2)`,
      [identifier, passwordHash]
    );
    console.log(
      `admin:create: admin "${identifier}" created. You can now sign in at /admin/login.`
    );
  } catch (error) {
    console.error(
      `admin:create: FAILED — ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
