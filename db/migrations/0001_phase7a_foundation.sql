-- Phase 7A foundation migration: deployments + admin auth.
--
-- HOW TO APPLY (explicit operation, never automatic on boot):
--   DATABASE_URL="postgres://..." npm run db:migrate
-- The migrate script records applied files in `schema_migrations` and runs
-- each file exactly once, inside a transaction. Production has no shell:
-- run the same command from a local machine pointed at the production
-- DATABASE_URL (see final Phase 7A report for the exact steps).
--
-- CONVENTIONS:
-- - Blockchain amounts (wei, base-unit supply, fees) are TEXT holding
--   canonical integer strings (digits only, no leading zeros unless "0").
--   Never NUMERIC/float, never JS floating point: bigint <-> string
--   round-trips losslessly and matches on-chain semantics exactly.
-- - Ethereum addresses are TEXT, stored lowercase (uniqueness is
--   case-insensitive by construction; checksum display happens in UI).
-- - Feature configuration is a versioned JSONB object validated in
--   lib/deployments/validate.ts — never arbitrary unvalidated JSON.
-- - Timestamps are TIMESTAMPTZ, always UTC.

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deployments (
  id BIGSERIAL PRIMARY KEY,

  -- Chain + transaction identity. The UNIQUE constraint makes recording
  -- idempotent: refresh, retry, or recovery of the same tx can never
  -- create a second logical deployment row.
  chain_id INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,

  -- All of the below are SERVER-DERIVED from the on-chain transaction +
  -- receipt + TokenCreated event. Client hints (chainId/txHash only) are
  -- never stored as facts.
  contract_address TEXT NOT NULL,
  factory_address TEXT NOT NULL,
  deployer_address TEXT NOT NULL,

  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  decimals SMALLINT NOT NULL,
  -- Canonical integer string, base units (human supply * 10^decimals).
  initial_supply_base TEXT NOT NULL,

  -- Versioned feature configuration, e.g.
  -- {"version":1,"burn":false,...,"maxTx":true,...}.
  -- NOTE: the TokenCreated event carries only feature PRESENCE flags;
  -- maxTx/maxWallet limit AMOUNTS are not reconstructible on-chain and are
  -- therefore not stored here (no invented data).
  feature_config JSONB NOT NULL,

  -- Server quote snapshot at record time (pricing version + total wei as
  -- canonical integer string), for future reconciliation. Informational.
  quote_snapshot JSONB NOT NULL,
  -- Actual platform fee charged, canonical integer wei string ("0" on
  -- testnet; the factory is non-payable and tx value is verified zero).
  platform_fee_wei TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'confirmed',
  block_number BIGINT NULL,
  confirmed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Row schema version for forward-compatible evolution (7B+).
  schema_version SMALLINT NOT NULL DEFAULT 1,

  CONSTRAINT deployments_chain_tx_unique UNIQUE (chain_id, tx_hash),
  CONSTRAINT deployments_chain_check CHECK (chain_id IN (97)),
  CONSTRAINT deployments_tx_hash_check CHECK (tx_hash ~ '^0x[0-9a-f]{64}$'),
  CONSTRAINT deployments_contract_check CHECK (contract_address ~ '^0x[0-9a-f]{40}$'),
  CONSTRAINT deployments_factory_check CHECK (factory_address ~ '^0x[0-9a-f]{40}$'),
  CONSTRAINT deployments_deployer_check CHECK (deployer_address ~ '^0x[0-9a-f]{40}$'),
  CONSTRAINT deployments_decimals_check CHECK (decimals >= 0 AND decimals <= 18),
  CONSTRAINT deployments_supply_check CHECK (initial_supply_base ~ '^(0|[1-9][0-9]*)$'),
  CONSTRAINT deployments_fee_check CHECK (platform_fee_wei ~ '^(0|[1-9][0-9]*)$'),
  CONSTRAINT deployments_status_check CHECK (status IN ('confirmed'))
);

CREATE INDEX IF NOT EXISTS deployments_contract_idx
  ON deployments (chain_id, contract_address);
CREATE INDEX IF NOT EXISTS deployments_deployer_idx
  ON deployments (deployer_address);

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  -- Lowercase unique login identifier (username or email, operator choice).
  identifier TEXT NOT NULL,
  -- scrypt password hash in modular format
  -- ("scrypt$N$r$p$salthex$keyhex"). Never plaintext, never logged.
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT admin_users_identifier_unique UNIQUE (identifier),
  CONSTRAINT admin_users_identifier_check CHECK (char_length(identifier) BETWEEN 3 AND 320)
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  -- SHA-256 hex of the opaque session token. The raw token lives ONLY in
  -- the HttpOnly cookie and is never persisted (hash-can-be-stored rule).
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT admin_sessions_token_unique UNIQUE (token_hash),
  CONSTRAINT admin_sessions_token_check CHECK (token_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS admin_sessions_user_idx
  ON admin_sessions (admin_user_id);
