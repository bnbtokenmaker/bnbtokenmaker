-- Phase 7D-E1 pricing V1 extension migration.
--
-- HOW TO APPLY (explicit operation, never automatic on boot):
--   DATABASE_URL="postgres://..." npm run db:migrate
-- The Next.js runtime NEVER runs migrations automatically.
-- DO NOT apply to production until the 7D-E1 review is approved.
--
-- SCOPE: three NULLABLE V1 capability fee columns on pricing_versions.
-- This migration does NOT touch deployments, campaigns, admin_users,
-- admin_sessions, or admin_audit_events rows, does NOT backfill or rewrite
-- any historical data, and does NOT activate mainnet.
--
-- NULLABILITY SEMANTICS (backward compatible by design):
-- - NULL in a V1 capability column means "capability NOT OFFERED in this
--   pricing version". All pre-migration rows read NULL (their era offered
--   only the seven Phase 7C capabilities) and remain fully quotable for
--   those capabilities; selecting a not-offered capability fails closed
--   server-side with `feature-not-offered`.
-- - Admin publish (parsePricingPublishInput) requires all eleven fees, so
--   newly published versions always offer every V1 capability.
--
-- CONVENTIONS (same as 0001/0003):
-- - Money is TEXT holding canonical integer strings (digits only, "0" for
--   zero). Never NUMERIC/float, never JS floating point.
--
-- LOCKING: ADD COLUMN ... NULL performs a metadata-only change (no table
-- rewrite). Each statement takes a brief ACCESS EXCLUSIVE lock only.
--
-- ROLLBACK: ALTER TABLE pricing_versions DROP COLUMN trading_fee_wei,
-- DROP COLUMN antibot_fee_wei, DROP COLUMN autoliquidity_fee_wei;
-- Safe only while no published version relies on the new columns (check
-- for non-NULL values first); historical rows are unaffected either way.

ALTER TABLE IF EXISTS pricing_versions
  ADD COLUMN IF NOT EXISTS trading_fee_wei TEXT NULL,
  ADD COLUMN IF NOT EXISTS antibot_fee_wei TEXT NULL,
  ADD COLUMN IF NOT EXISTS autoliquidity_fee_wei TEXT NULL;

ALTER TABLE IF EXISTS pricing_versions
  ADD CONSTRAINT pricing_versions_trading_fee_check
    CHECK (trading_fee_wei IS NULL OR trading_fee_wei ~ '^(0|[1-9][0-9]*)$'),
  ADD CONSTRAINT pricing_versions_antibot_fee_check
    CHECK (antibot_fee_wei IS NULL OR antibot_fee_wei ~ '^(0|[1-9][0-9]*)$'),
  ADD CONSTRAINT pricing_versions_autoliquidity_fee_check
    CHECK (autoliquidity_fee_wei IS NULL OR autoliquidity_fee_wei ~ '^(0|[1-9][0-9]*)$');
