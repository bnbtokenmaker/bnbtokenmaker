-- Phase 7C pricing + campaign management migration.
--
-- HOW TO APPLY (explicit operation, never automatic on boot):
--   DATABASE_URL="postgres://..." npm run db:migrate
-- then seed the initial commercial pricing version explicitly:
--   DATABASE_URL="postgres://..." npm run pricing:bootstrap
-- The Next.js runtime NEVER runs migrations or seeds automatically.
--
-- SCOPE: pricing configuration versions, honest discount campaigns, and an
-- admin audit trail. This migration does NOT touch deployments, admin_users,
-- or admin_sessions rows, does NOT activate mainnet, and does NOT change the
-- testnet factory (chain 97 stays fee-free/non-payable).
--
-- CORE PRINCIPLE (config != historical quote):
-- published pricing versions are IMMUTABLE rows. An admin price update
-- inserts a NEW version and atomically flips the single active pointer;
-- historical rows are never rewritten, and deployment quote_snapshot JSONB
-- values recorded earlier remain untouched.
--
-- CONVENTIONS (same as 0001):
-- - Money is TEXT holding canonical integer strings (digits only, "0" for
--   zero). Never NUMERIC/float, never JS floating point.
-- - Percentage discounts are INTEGER basis points (10000 = 100.00%, but the
--   CHECK below caps campaigns at 9000 = 90.00%: 100% is not permitted).
-- - Timestamps are TIMESTAMPTZ, always UTC; validity is evaluated against
--   server time only (client time is never trusted).
-- - Campaign status (scheduled/active/ended/disabled) is DERIVED from
--   enabled + starts_at/ends_at + server now — never a stored label.

-- Sequence backing the human-friendly version identifiers. Created first:
-- the pricing_versions.version DEFAULT below references it.
CREATE SEQUENCE IF NOT EXISTS pricing_version_seq START WITH 1;

-- Immutable published pricing versions; exactly one row may carry
-- status = 'active' (enforced by the partial unique index below, so even a
-- buggy writer cannot create a zero- or multi-active state that survives).
CREATE TABLE IF NOT EXISTS pricing_versions (
  id BIGSERIAL PRIMARY KEY,
  -- Human-friendly immutable identifier, assigned by the database
  -- ('v' || nextval) so concurrent publishers can never collide.
  version TEXT NOT NULL DEFAULT ('v' || nextval('pricing_version_seq')),
  status TEXT NOT NULL DEFAULT 'inactive',
  currency TEXT NOT NULL DEFAULT 'BNB',
  -- Canonical wei integer strings (digits only).
  base_fee_wei TEXT NOT NULL,
  burn_fee_wei TEXT NOT NULL,
  mint_fee_wei TEXT NOT NULL,
  pause_fee_wei TEXT NOT NULL,
  maxtx_fee_wei TEXT NOT NULL,
  maxwallet_fee_wei TEXT NOT NULL,
  blacklist_fee_wei TEXT NOT NULL,
  whitelist_fee_wei TEXT NOT NULL,
  created_by_admin_id BIGINT NULL REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ NULL,

  CONSTRAINT pricing_versions_version_unique UNIQUE (version),
  CONSTRAINT pricing_versions_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT pricing_versions_currency_check CHECK (currency = 'BNB'),
  CONSTRAINT pricing_versions_base_fee_check CHECK (base_fee_wei ~ '^(0|[1-9][0-9]*)$'),
  CONSTRAINT pricing_versions_burn_fee_check CHECK (burn_fee_wei ~ '^(0|[1-9][0-9]*)$'),
  CONSTRAINT pricing_versions_mint_fee_check CHECK (mint_fee_wei ~ '^(0|[1-9][0-9]*)$'),
  CONSTRAINT pricing_versions_pause_fee_check CHECK (pause_fee_wei ~ '^(0|[1-9][0-9]*)$'),
  CONSTRAINT pricing_versions_maxtx_fee_check CHECK (maxtx_fee_wei ~ '^(0|[1-9][0-9]*)$'),
  CONSTRAINT pricing_versions_maxwallet_fee_check CHECK (maxwallet_fee_wei ~ '^(0|[1-9][0-9]*)$'),
  CONSTRAINT pricing_versions_blacklist_fee_check CHECK (blacklist_fee_wei ~ '^(0|[1-9][0-9]*)$'),
  CONSTRAINT pricing_versions_whitelist_fee_check CHECK (whitelist_fee_wei ~ '^(0|[1-9][0-9]*)$')
);

CREATE INDEX IF NOT EXISTS pricing_versions_created_at_idx
  ON pricing_versions (created_at DESC);

-- Exactly one active pricing version may exist at any time.
CREATE UNIQUE INDEX IF NOT EXISTS pricing_versions_single_active
  ON pricing_versions (status) WHERE status = 'active';

-- Published versions are immutable: the version identifier may never change
-- after insert (status flips active<->inactive are the only sanctioned
-- mutation, performed atomically with the publish itself).
CREATE OR REPLACE FUNCTION pricing_versions_freeze_version()
RETURNS trigger AS $$
BEGIN
  IF NEW.version IS DISTINCT FROM OLD.version THEN
    RAISE EXCEPTION 'pricing version identifiers are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_versions_freeze_version_trg ON pricing_versions;
CREATE TRIGGER pricing_versions_freeze_version_trg
  BEFORE UPDATE ON pricing_versions
  FOR EACH ROW EXECUTE FUNCTION pricing_versions_freeze_version();

-- Honest discount campaigns. Whole-quote percentage discounts only in
-- Phase 7C (no per-feature targeting, no scarcity fields).
CREATE TABLE IF NOT EXISTS campaigns (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  -- Optional public promo code, stored uppercased/trimmed; NULL means the
  -- campaign applies automatically while enabled and in-window.
  code TEXT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  -- Integer basis points: 1000 = 10.00%. Whole-quote discount.
  discount_basis_points INTEGER NOT NULL,
  -- Scope marker for forward compatibility; Phase 7C supports whole-quote
  -- only (no ambiguous per-feature targeting).
  applies_to TEXT NOT NULL DEFAULT 'whole_quote',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_admin_id BIGINT NULL REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT campaigns_name_check CHECK (
    char_length(name) BETWEEN 3 AND 80
  ),
  CONSTRAINT campaigns_code_check CHECK (
    code IS NULL OR code ~ '^[A-Z0-9][A-Z0-9_-]{2,30}[A-Z0-9]$'
  ),
  CONSTRAINT campaigns_discount_type_check CHECK (discount_type IN ('percent')),
  -- Maximum 90.00%: 100% discounts are not permitted (an accidental config
  -- must never make a future paid deployment completely free).
  CONSTRAINT campaigns_discount_bp_check CHECK (
    discount_basis_points >= 1 AND discount_basis_points <= 9000
  ),
  CONSTRAINT campaigns_applies_to_check CHECK (applies_to IN ('whole_quote')),
  CONSTRAINT campaigns_window_check CHECK (starts_at < ends_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS campaigns_code_unique
  ON campaigns (code) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS campaigns_window_idx
  ON campaigns (enabled, starts_at, ends_at);

-- Financial-configuration audit trail. One row per admin mutation, written
-- in the SAME statement/transaction as the mutation itself. Metadata holds
-- safe before/after summaries only — never passwords, tokens, or URLs.
CREATE TABLE IF NOT EXISTS admin_audit_events (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT NULL REFERENCES admin_users (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT admin_audit_events_action_check CHECK (action IN (
    'pricing_version_published',
    'campaign_created',
    'campaign_updated',
    'campaign_enabled',
    'campaign_disabled'
  )),
  CONSTRAINT admin_audit_events_entity_check CHECK (entity_type IN (
    'pricing_version',
    'campaign'
  )),
  CONSTRAINT admin_audit_events_entity_id_check CHECK (
    char_length(entity_id) BETWEEN 1 AND 128
  )
);

CREATE INDEX IF NOT EXISTS admin_audit_events_created_at_idx
  ON admin_audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_events_entity_idx
  ON admin_audit_events (entity_type, entity_id);
