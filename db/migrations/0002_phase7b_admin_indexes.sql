-- Phase 7B admin dashboard index.
--
-- WHY THIS INDEX EXISTS:
-- The admin deployments list (/admin/deployments) and the overview dashboard
-- order deployments by recency (created_at DESC, id DESC) with server-side
-- pagination (LIMIT/OFFSET), and the dashboard filters counts by recency
-- windows (today / last 7 / 30 days) on created_at. Without an index every
-- admin read sorts + scans the full deployments table; with it, Postgres
-- serves order + range + limit directly from the index.
--
-- Forward-only: NEVER modify 0001_phase7a_foundation.sql. Applied explicitly
-- via `npm run db:migrate` (tracked in schema_migrations); the Next.js
-- runtime never auto-migrates. Non-destructive (index only, no DDL on rows).
--
-- NOTE: admin text search (token name/symbol/addresses/tx hash) uses
-- parameterized ILIKE. No trigram index is added deliberately: it would
-- require the pg_trgm extension (a database-level change) for a small
-- operator-only table where a sequential scan of matched pages is fine.

CREATE INDEX IF NOT EXISTS deployments_created_at_idx
  ON deployments (created_at DESC);
