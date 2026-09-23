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

/**
 * Phase 7C pricing versions (mirrors db/migrations/0003).
 *
 * Published versions are IMMUTABLE rows: an admin price update inserts a NEW
 * row and atomically flips the single active pointer (partial unique index
 * `pricing_versions_single_active`). Historical rows are never rewritten, so
 * deployment quote snapshots stay stable. SQL is authoritative for DDL; the
 * version identifier is assigned database-side ('v' || nextval).
 */
export const pricingVersions = pgTable("pricing_versions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  version: text("version").notNull().unique(),
  status: text("status").notNull().default("inactive"),
  currency: text("currency").notNull().default("BNB"),
  /** Canonical wei integer strings (digits only, "0" for zero). */
  baseFeeWei: text("base_fee_wei").notNull(),
  burnFeeWei: text("burn_fee_wei").notNull(),
  mintFeeWei: text("mint_fee_wei").notNull(),
  pauseFeeWei: text("pause_fee_wei").notNull(),
  maxTxFeeWei: text("maxtx_fee_wei").notNull(),
  maxWalletFeeWei: text("maxwallet_fee_wei").notNull(),
  blacklistFeeWei: text("blacklist_fee_wei").notNull(),
  whitelistFeeWei: text("whitelist_fee_wei").notNull(),
  createdByAdminId: bigint("created_by_admin_id", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
});

export type PricingVersionRow = typeof pricingVersions.$inferSelect;

/**
 * Phase 7C honest discount campaigns (mirrors db/migrations/0003).
 *
 * Whole-quote percentage discounts only. Status is DERIVED from
 * enabled + starts_at/ends_at + server time — never a stored label.
 */
export const campaigns = pgTable("campaigns", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  /** Optional promo code, stored uppercased/trimmed; NULL = automatic. */
  code: text("code"),
  discountType: text("discount_type").notNull().default("percent"),
  /** Integer basis points: 1000 = 10.00%. */
  discountBasisPoints: integer("discount_basis_points").notNull(),
  appliesTo: text("applies_to").notNull().default("whole_quote"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdByAdminId: bigint("created_by_admin_id", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CampaignRow = typeof campaigns.$inferSelect;

/**
 * Phase 7C admin audit trail (mirrors db/migrations/0003).
 *
 * One row per financial-configuration mutation, written atomically with the
 * mutation itself. Metadata carries safe before/after summaries only.
 */
export const adminAuditEvents = pgTable("admin_audit_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  adminUserId: bigint("admin_user_id", { mode: "number" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AdminAuditEventRow = typeof adminAuditEvents.$inferSelect;
