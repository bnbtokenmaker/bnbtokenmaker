/**
 * Phase 7A database schema (Drizzle ORM, pg-core table definitions).
 *
 * This file mirrors db/migrations/0001_phase7a_foundation.sql as a typed
 * query surface. The SQL migration is authoritative for DDL; this module is
 * authoritative for TypeScript shapes. Keep them in sync when evolving.
 *
 * Transport note: the Next.js runtime serves these tables over Neon HTTP
 * (`drizzle-orm/neon-http` in lib/db/client.ts); the explicit local CLI
 * tools use node-postgres. The table definitions are transport-agnostic.
 *
 * Amount conventions (blockchain-exact, no floating point):
 * - wei / base-unit supply / fees are TEXT canonical integer strings.
 * - Convert with BigInt(x).toString() only; never Number().
 */

import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Logical deployment status. Phase 7A records confirmed deployments only. */
export const DEPLOYMENT_STATUS_CONFIRMED = "confirmed" as const;

/** Version of the feature_config JSONB shape (see lib/deployments/validate.ts). */
export const FEATURE_CONFIG_VERSION = 1 as const;

/** Version of the deployments row shape. */
export const DEPLOYMENT_SCHEMA_VERSION = 1 as const;

export const deployments = pgTable(
  "deployments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    chainId: integer("chain_id").notNull(),
    txHash: text("tx_hash").notNull(),
    contractAddress: text("contract_address").notNull(),
    factoryAddress: text("factory_address").notNull(),
    deployerAddress: text("deployer_address").notNull(),
    tokenName: text("token_name").notNull(),
    tokenSymbol: text("token_symbol").notNull(),
    decimals: smallint("decimals").notNull(),
    /** Canonical integer string, base units. */
    initialSupplyBase: text("initial_supply_base").notNull(),
    /** Versioned feature flags object (JSONB). */
    featureConfig: jsonb("feature_config").notNull(),
    /** Server quote snapshot at record time (JSONB). */
    quoteSnapshot: jsonb("quote_snapshot").notNull(),
    /** Canonical integer wei string. */
    platformFeeWei: text("platform_fee_wei").notNull(),
    status: text("status").notNull().default(DEPLOYMENT_STATUS_CONFIRMED),
    blockNumber: bigint("block_number", { mode: "number" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    schemaVersion: smallint("schema_version")
      .notNull()
      .default(DEPLOYMENT_SCHEMA_VERSION),
  },
  (table) => [
    uniqueIndex("deployments_chain_tx_unique").on(table.chainId, table.txHash),
    index("deployments_contract_idx").on(table.chainId, table.contractAddress),
    index("deployments_deployer_idx").on(table.deployerAddress),
  ]
);

export type DeploymentRow = typeof deployments.$inferSelect;
export type DeploymentInsert = typeof deployments.$inferInsert;

export const adminUsers = pgTable("admin_users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  /** Lowercase unique login identifier. */
  identifier: text("identifier").notNull().unique(),
  /** scrypt modular hash. Never plaintext. */
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AdminUserRow = typeof adminUsers.$inferSelect;

export const adminSessions = pgTable("admin_sessions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  adminUserId: bigint("admin_user_id", { mode: "number" }).notNull(),
  /** SHA-256 hex of the opaque token. Raw token is never stored. */
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AdminSessionRow = typeof adminSessions.$inferSelect;
