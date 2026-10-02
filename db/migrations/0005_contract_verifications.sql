-- Phase C25 contract verification state (BscScan source verification).
--
-- HOW TO APPLY (explicit operation, never automatic on boot):
--   DATABASE_URL="postgres://..." npm run db:migrate
-- The Next.js runtime NEVER runs migrations automatically.
-- DO NOT apply to production until the C25 review is approved.
--
-- SCOPE: one NEW table, contract_verifications. This migration does NOT
-- touch deployments, pricing_versions, campaigns, admin_users,
-- admin_sessions, or admin_audit_events rows, does NOT backfill or rewrite
-- any historical data, and does NOT activate or alter any chain.
--
-- WHY A NEW TABLE (not columns on deployments): verification is keyed by
-- CONTRACT (chain_id, contract_address), not by deployment transaction. A
-- duplicate verification request for the same contract must reuse the same
-- row/GUID instead of submitting upstream again. Keeping verification
-- state in its own table leaves the audited deployments table untouched.
--
-- WHAT IS STORED: BscScan GUID + status + attempt counters + sanitized
-- error codes only. NEVER stored here: API keys, source code, constructor
-- arguments, or any client-supplied verification material. Constructor
-- inputs are always reconstructed server-side from proven on-chain
-- evidence at submit time.
--
-- CONVENTIONS (same as 0001/0003/0004):
-- - Ethereum addresses are TEXT, stored lowercase.
-- - Status is a TEXT code validated by CHECK (see lib/verify/store.ts for
--   the matching TypeScript union).
-- - Errors are sanitized codes only, never upstream response text.
-- - Timestamps are TIMESTAMPTZ, always UTC.
--
-- LOCKING: CREATE TABLE IF NOT EXISTS + CREATE UNIQUE INDEX IF NOT EXISTS
-- take brief locks only on first apply; reruns are no-ops.
--
-- ROLLBACK: DROP TABLE IF EXISTS contract_verifications;
-- Safe: verification state is fully re-derivable (resubmit from chain
-- evidence + BscScan getsourcecode), so dropping loses no on-chain facts.

CREATE TABLE IF NOT EXISTS contract_verifications (
  id BIGSERIAL PRIMARY KEY,

  -- Verification identity: one row per contract per chain. The UNIQUE
  -- constraint makes duplicate verification requests idempotent: a second
  -- request for the same contract reuses this row (existing GUID/status)
  -- instead of submitting upstream again.
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,

  -- Provenance/recovery hint: the deployment transaction this verification
  -- was first requested for. Informational only — the token address is
  -- always re-derived server-side from chain evidence, never trusted.
  deployment_tx_hash TEXT NULL,

  -- BscScan submission GUID (NULL until first upstream acceptance).
  guid TEXT NULL,

  -- not_started | submitting | pending | verified | failed
  status TEXT NOT NULL DEFAULT 'not_started',

  -- Bounded attempt accounting (upstream submissions + status polls that
  -- performed network I/O). Callers must stop retrying past their cap.
  attempts INTEGER NOT NULL DEFAULT 0,

  -- Sanitized error code from the last failure (e.g. rate-limited,
  -- upstream-unavailable, compiler-mismatch). Never upstream text.
  last_error_code TEXT NULL,

  verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT contract_verifications_identity_unique
    UNIQUE (chain_id, contract_address),
  CONSTRAINT contract_verifications_status_check
    CHECK (status IN ('not_started', 'submitting', 'pending', 'verified', 'failed')),
  CONSTRAINT contract_verifications_attempts_check
    CHECK (attempts >= 0)
);

CREATE INDEX IF NOT EXISTS contract_verifications_status_idx
  ON contract_verifications (status);
