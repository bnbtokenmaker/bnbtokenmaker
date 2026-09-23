/**
 * Phase 7C DB-backed pricing/campaign store.
 *
 * Deliberately NO `import "server-only"` (same precedent as lib/db/client.ts
 * and lib/pricing/server/quote.ts) so route handlers stay importable from the
 * tsx unit-test runtime. Browser misuse is blocked by getDb()'s own guard
 * plus the fact that these modules only run in routes/server components.
 *
 * ATOMICITY: Neon HTTP has no interactive transactions, so every mutation
 * that must be atomic (publish version + deactivate previous + activate new
 * + audit; campaign write + audit) is a SINGLE SQL statement built as a CTE
 * chain — one round-trip, all-or-nHING. A partial unique index
 * (`pricing_versions_single_active`) backs the single-active invariant at the
 * database level as well.
 *
 * FAILURE POLICY: every unexpected database problem surfaces as a sanitized
 * PricingStoreError("unavailable") (HTTP 503 downstream). Raw DB errors,
 * connection strings, and driver messages never leave this module.
 */

import { and, desc, eq, gt, lte, sql } from "drizzle-orm";

import { DatabaseUnavailableError, getDb } from "../../db/client";
import {
  adminAuditEvents,
  campaigns,
  pricingVersions,
  type AdminAuditEventRow,
  type CampaignRow,
  type PricingVersionRow,
} from "../../db/schema";
import { validateConfig } from "../calculate";
import { parseWeiStringToBigint } from "../money";
import type { PricingConfig } from "../types";
import {
  deriveCampaignStatus,
  pricingFeeMapToConfig,
  type ParsedCampaignPatch,
  type PricingFeeMap,
} from "./campaign-policy";
import { devPricingConfig } from "./dev-values";

export type PricingStoreErrorCode =
  | "unavailable"
  | "no-active-pricing"
  | "not-found"
  | "conflict"
  | "invalid-campaign-code";

export class PricingStoreError extends Error {
  readonly code: PricingStoreErrorCode;
  readonly httpStatus: number;
  constructor(code: PricingStoreErrorCode, httpStatus: number, message: string) {
    super(message);
    this.name = "PricingStoreError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const record = error as Record<string, unknown>;
  if (record.code === "23505") return true;
  const message = record.message;
  return (
    typeof message === "string" && /duplicate key value/i.test(message)
  );
}

/** Maps any storage-layer failure to a sanitized store error. */
function mapDbError(error: unknown): PricingStoreError {
  if (error instanceof PricingStoreError) return error;
  if (error instanceof DatabaseUnavailableError) {
    return new PricingStoreError(
      "unavailable",
      503,
      "pricing service is temporarily unavailable"
    );
  }
  return new PricingStoreError(
    "unavailable",
    503,
    "pricing service is temporarily unavailable"
  );
}

export type PublishVersionInput = {
  fees: PricingFeeMap;
  adminId: number | null;
};

export type CreateCampaignInput = {
  name: string;
  code: string | null;
  basisPoints: number;
  startsAt: Date;
  endsAt: Date;
  adminId: number | null;
};

export type ResolveCampaignInput = {
  code: string | null;
  now: Date;
};

export type PricingStore = {
  getActiveVersion(): Promise<PricingVersionRow | null>;
  listVersions(limit?: number): Promise<PricingVersionRow[]>;
  publishVersion(input: PublishVersionInput): Promise<{
    id: number;
    version: string;
  }>;
  listCampaigns(): Promise<CampaignRow[]>;
  createCampaign(input: CreateCampaignInput): Promise<CampaignRow>;
  patchCampaign(
    id: number,
    patch: ParsedCampaignPatch,
    adminId: number | null
  ): Promise<CampaignRow>;
  resolveCampaignForQuote(input: ResolveCampaignInput): Promise<CampaignRow | null>;
  listAuditEvents(limit?: number): Promise<AdminAuditEventRow[]>;
};

function clampLimit(limit: number | undefined, max: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return max;
  return Math.min(Math.max(Math.floor(limit), 1), max);
}

/** Converts a pricing_versions row into the domain PricingConfig. */
export function rowToPricingConfig(row: PricingVersionRow): PricingConfig {
  try {
    const config = pricingFeeMapToConfig(
      {
        base: parseWeiStringToBigint(row.baseFeeWei),
        burn: parseWeiStringToBigint(row.burnFeeWei),
        mint: parseWeiStringToBigint(row.mintFeeWei),
        pause: parseWeiStringToBigint(row.pauseFeeWei),
        maxTx: parseWeiStringToBigint(row.maxTxFeeWei),
        maxWallet: parseWeiStringToBigint(row.maxWalletFeeWei),
        blacklist: parseWeiStringToBigint(row.blacklistFeeWei),
        whitelist: parseWeiStringToBigint(row.whitelistFeeWei),
      },
      row.version
    );
    if (!validateConfig(config).ok) {
      throw new Error("stored pricing version failed validation");
    }
    return config;
  } catch (error) {
    if (error instanceof PricingStoreError) throw error;
    throw new PricingStoreError(
      "unavailable",
      503,
      "pricing service is temporarily unavailable"
    );
  }
}

type ExecuteResult = {
  rows?: unknown;
  rowCount?: number | null;
};

function resultRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as ExecuteResult | null)?.rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

function resultRowCount(result: unknown): number {
  if (typeof result === "object" && result !== null) {
    const count = (result as ExecuteResult).rowCount;
    if (typeof count === "number") return count;
  }
  return 0;
}

function weiOf(value: bigint): string {
  return value.toString();
}

export class PgPricingStore implements PricingStore {
  async getActiveVersion(): Promise<PricingVersionRow | null> {
    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(pricingVersions)
        .where(eq(pricingVersions.status, "active"))
        .limit(1);
      return rows[0] ?? null;
    } catch (error) {
      throw mapDbError(error);
    }
  }

  async listVersions(limit?: number): Promise<PricingVersionRow[]> {
    try {
      const db = getDb();
      return await db
        .select()
        .from(pricingVersions)
        .orderBy(desc(pricingVersions.createdAt), desc(pricingVersions.id))
        .limit(clampLimit(limit, 50));
    } catch (error) {
      throw mapDbError(error);
    }
  }

  async publishVersion(
    input: PublishVersionInput
  ): Promise<{ id: number; version: string }> {
    try {
      const db = getDb();
      // Best-effort previous version for the audit summary (informational
      // only — the switch itself does not depend on this read).
      let previousVersion: string | null = null;
      try {
        previousVersion = (await this.getActiveVersion())?.version ?? null;
      } catch {
        previousVersion = null;
      }
      const metadata = JSON.stringify({
        previousVersion,
        baseFeeWei: weiOf(input.fees.base),
        featureFeesWei: {
          burn: weiOf(input.fees.burn),
          mint: weiOf(input.fees.mint),
          pause: weiOf(input.fees.pause),
          maxTx: weiOf(input.fees.maxTx),
          maxWallet: weiOf(input.fees.maxWallet),
          blacklist: weiOf(input.fees.blacklist),
          whitelist: weiOf(input.fees.whitelist),
        },
      });
      // Single statement: insert the immutable version, deactivate the
      // previous active row, activate the new row, and audit — atomically.
      // The version identifier is assigned database-side ('v' || nextval).
      const result = await db.execute(sql`
        WITH ins AS (
          INSERT INTO pricing_versions (
            base_fee_wei, burn_fee_wei, mint_fee_wei, pause_fee_wei,
            maxtx_fee_wei, maxwallet_fee_wei, blacklist_fee_wei,
            whitelist_fee_wei, created_by_admin_id
          )
          VALUES (
            ${weiOf(input.fees.base)}, ${weiOf(input.fees.burn)},
            ${weiOf(input.fees.mint)}, ${weiOf(input.fees.pause)},
            ${weiOf(input.fees.maxTx)}, ${weiOf(input.fees.maxWallet)},
            ${weiOf(input.fees.blacklist)}, ${weiOf(input.fees.whitelist)},
            ${input.adminId}
          )
          RETURNING id, version
        ),
        deactivate AS (
          UPDATE pricing_versions SET status = 'inactive'
          WHERE status = 'active' AND id <> (SELECT id FROM ins)
        ),
        activate AS (
          UPDATE pricing_versions SET status = 'active', activated_at = now()
          WHERE id = (SELECT id FROM ins)
          RETURNING id, version
        ),
        audit AS (
          INSERT INTO admin_audit_events (
            admin_user_id, action, entity_type, entity_id, metadata
          )
          SELECT ${input.adminId}, 'pricing_version_published',
                 'pricing_version', (SELECT version FROM activate),
                 (${metadata}::jsonb)
        )
        SELECT id, version FROM activate
      `);
      const rows = resultRows<{ id: number; version: string }>(result);
      const created = rows[0];
      if (!created || typeof created.id !== "number") {
        throw new PricingStoreError(
          "unavailable",
          503,
          "pricing service is temporarily unavailable"
        );
      }
      return { id: created.id, version: String(created.version) };
    } catch (error) {
      throw mapDbError(error);
    }
  }

  async listCampaigns(): Promise<CampaignRow[]> {
    try {
      const db = getDb();
      return await db
        .select()
        .from(campaigns)
        .orderBy(desc(campaigns.startsAt), desc(campaigns.id));
    } catch (error) {
      throw mapDbError(error);
    }
  }

  async createCampaign(input: CreateCampaignInput): Promise<CampaignRow> {
    try {
      const db = getDb();
      const metadata = JSON.stringify({
        name: input.name,
        code: input.code,
        discountBasisPoints: input.basisPoints,
        startsAt: input.startsAt.toISOString(),
        endsAt: input.endsAt.toISOString(),
      });
      const result = await db.execute(sql`
        WITH ins AS (
          INSERT INTO campaigns (
            name, code, discount_type, discount_basis_points, applies_to,
            starts_at, ends_at, enabled, created_by_admin_id
          )
          VALUES (
            ${input.name}, ${input.code}, 'percent', ${input.basisPoints},
            'whole_quote', ${input.startsAt.toISOString()},
            ${input.endsAt.toISOString()}, TRUE, ${input.adminId}
          )
          RETURNING id
        ),
        audit AS (
          INSERT INTO admin_audit_events (
            admin_user_id, action, entity_type, entity_id, metadata
          )
          SELECT ${input.adminId}, 'campaign_created', 'campaign',
                 (SELECT id::text FROM ins), (${metadata}::jsonb)
        )
        SELECT id FROM ins
      `);
      const rows = resultRows<{ id: number }>(result);
      const createdId = rows[0]?.id;
      if (typeof createdId !== "number") {
        throw new PricingStoreError(
          "unavailable",
          503,
          "pricing service is temporarily unavailable"
        );
      }
      const found = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, createdId))
        .limit(1);
      const created = found[0];
      if (!created) {
        throw new PricingStoreError(
          "unavailable",
          503,
          "pricing service is temporarily unavailable"
        );
      }
      return created;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new PricingStoreError(
          "conflict",
          409,
          "a campaign with this code already exists"
        );
      }
      throw mapDbError(error);
    }
  }

  async patchCampaign(
    id: number,
    patch: ParsedCampaignPatch,
    adminId: number | null
  ): Promise<CampaignRow> {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new PricingStoreError("not-found", 404, "campaign not found");
    }
    const economic =
      patch.name !== undefined ||
      patch.code !== undefined ||
      patch.basisPoints !== undefined ||
      patch.startsAt !== undefined ||
      patch.endsAt !== undefined;
    if (!economic && patch.enabled === undefined) {
      // Unreachable via the validated route (empty patches are rejected by
      // parseCampaignPatchInput), but never write a no-op + audit row.
      throw new PricingStoreError("not-found", 404, "campaign not found");
    }
    try {
      const db = getDb();
      const auditAction =
        economic ? "campaign_updated"
        : patch.enabled === true ? "campaign_enabled"
        : "campaign_disabled";
      const metadata = JSON.stringify({
        name: patch.name ?? null,
        code: patch.code ?? null,
        discountBasisPoints: patch.basisPoints ?? null,
        startsAt: patch.startsAt?.toISOString() ?? null,
        endsAt: patch.endsAt?.toISOString() ?? null,
        enabled: patch.enabled ?? null,
      });
      // Economic edits re-check starts_at > now() INSIDE the statement so an
      // edit racing a campaign start affects zero rows instead of rewriting
      // live economic terms.
      const result = await db.execute(
        economic
          ? sql`
            WITH upd AS (
              UPDATE campaigns SET
                name = CASE WHEN ${patch.name !== undefined} THEN ${patch.name ?? null} ELSE name END,
                code = CASE WHEN ${patch.code !== undefined} THEN ${patch.code ?? null} ELSE code END,
                discount_basis_points = CASE WHEN ${patch.basisPoints !== undefined} THEN ${patch.basisPoints ?? null} ELSE discount_basis_points END,
                starts_at = CASE WHEN ${patch.startsAt !== undefined} THEN ${patch.startsAt?.toISOString() ?? null}::timestamptz ELSE starts_at END,
                ends_at = CASE WHEN ${patch.endsAt !== undefined} THEN ${patch.endsAt?.toISOString() ?? null}::timestamptz ELSE ends_at END,
                enabled = CASE WHEN ${patch.enabled !== undefined} THEN ${patch.enabled ?? null} ELSE enabled END,
                updated_at = now()
              WHERE id = ${id} AND starts_at > now()
              RETURNING id
            ),
            audit AS (
              INSERT INTO admin_audit_events (
                admin_user_id, action, entity_type, entity_id, metadata
              )
              SELECT ${adminId}, ${auditAction}, 'campaign',
                     (SELECT id::text FROM upd), (${metadata}::jsonb)
              WHERE EXISTS (SELECT 1 FROM upd)
            )
            SELECT id FROM upd
          `
          : sql`
            WITH upd AS (
              UPDATE campaigns SET
                enabled = ${patch.enabled ?? null},
                updated_at = now()
              WHERE id = ${id}
              RETURNING id
            ),
            audit AS (
              INSERT INTO admin_audit_events (
                admin_user_id, action, entity_type, entity_id, metadata
              )
              SELECT ${adminId}, ${auditAction}, 'campaign',
                     (SELECT id::text FROM upd), (${metadata}::jsonb)
              WHERE EXISTS (SELECT 1 FROM upd)
            )
            SELECT id FROM upd
          `
      );
      const updated = resultRowCount(result) > 0 || resultRows(result).length > 0;
      if (!updated) {
        const existing = await db
          .select({ id: campaigns.id })
          .from(campaigns)
          .where(eq(campaigns.id, id))
          .limit(1);
        if (existing.length === 0) {
          throw new PricingStoreError("not-found", 404, "campaign not found");
        }
        throw new PricingStoreError(
          "conflict",
          409,
          "only future campaigns may change economic terms; disable this campaign instead"
        );
      }
      const found = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, id))
        .limit(1);
      const row = found[0];
      if (!row) {
        throw new PricingStoreError("not-found", 404, "campaign not found");
      }
      return row;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new PricingStoreError(
          "conflict",
          409,
          "a campaign with this code already exists"
        );
      }
      throw mapDbError(error);
    }
  }

  async resolveCampaignForQuote(
    input: ResolveCampaignInput
  ): Promise<CampaignRow | null> {
    try {
      const db = getDb();
      const window = await db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.enabled, true),
            lte(campaigns.startsAt, input.now),
            gt(campaigns.endsAt, input.now)
          )
        );
      if (input.code !== null) {
        const hit = window.find((row) => row.code === input.code);
        if (!hit) {
          throw new PricingStoreError(
            "invalid-campaign-code",
            400,
            "campaign code is not currently valid"
          );
        }
        return hit;
      }
      // Automatic campaigns only (code IS NULL). Deterministic pick when
      // several overlap: highest discount, then earliest end, then lowest id.
      const automatic = window
        .filter((row) => row.code === null)
        .sort((a, b) => {
          if (b.discountBasisPoints !== a.discountBasisPoints) {
            return b.discountBasisPoints - a.discountBasisPoints;
          }
          const endOrder =
            a.endsAt.getTime() - b.endsAt.getTime();
          if (endOrder !== 0) return endOrder;
          return a.id - b.id;
        });
      return automatic[0] ?? null;
    } catch (error) {
      throw mapDbError(error);
    }
  }

  async listAuditEvents(limit?: number): Promise<AdminAuditEventRow[]> {
    try {
      const db = getDb();
      return await db
        .select()
        .from(adminAuditEvents)
        .orderBy(desc(adminAuditEvents.createdAt), desc(adminAuditEvents.id))
        .limit(clampLimit(limit, 50));
    } catch (error) {
      throw mapDbError(error);
    }
  }
}

/**
 * In-memory store mirroring Pg semantics for hermetic tests (selected with
 * PRICING_STORE=memory outside production — same pattern as admin stores).
 * Every invariant enforced in SQL above is enforced here in TS.
 */
export class InMemoryPricingStore implements PricingStore {
  private versions: PricingVersionRow[] = [];
  private campaignsRows: CampaignRow[] = [];
  private audit: AdminAuditEventRow[] = [];
  private versionSeq = 1;
  private campaignSeq = 1;
  private auditSeq = 1;

  private auditPush(
    adminId: number | null,
    action: string,
    entityType: string,
    entityId: string,
    metadata: unknown
  ): void {
    this.audit.push({
      id: this.auditSeq++,
      adminUserId: adminId,
      action,
      entityType,
      entityId,
      metadata,
      createdAt: new Date(),
    });
  }

  async getActiveVersion(): Promise<PricingVersionRow | null> {
    return this.versions.find((row) => row.status === "active") ?? null;
  }

  async listVersions(limit?: number): Promise<PricingVersionRow[]> {
    const sorted = [...this.versions].sort((a, b) => {
      const time = b.createdAt.getTime() - a.createdAt.getTime();
      return time !== 0 ? time : b.id - a.id;
    });
    return sorted.slice(0, clampLimit(limit, 50));
  }

  async publishVersion(
    input: PublishVersionInput
  ): Promise<{ id: number; version: string }> {
    const previous = await this.getActiveVersion();
    const id = this.versionSeq++;
    const now = new Date();
    for (const row of this.versions) {
      if (row.status === "active") row.status = "inactive";
    }
    this.versions.push({
      id,
      version: `v${id}`,
      status: "active",
      currency: "BNB",
      baseFeeWei: weiOf(input.fees.base),
      burnFeeWei: weiOf(input.fees.burn),
      mintFeeWei: weiOf(input.fees.mint),
      pauseFeeWei: weiOf(input.fees.pause),
      maxTxFeeWei: weiOf(input.fees.maxTx),
      maxWalletFeeWei: weiOf(input.fees.maxWallet),
      blacklistFeeWei: weiOf(input.fees.blacklist),
      whitelistFeeWei: weiOf(input.fees.whitelist),
      createdByAdminId: input.adminId,
      createdAt: now,
      activatedAt: now,
    });
    this.auditPush(input.adminId, "pricing_version_published", "pricing_version", `v${id}`, {
      previousVersion: previous?.version ?? null,
      baseFeeWei: weiOf(input.fees.base),
    });
    return { id, version: `v${id}` };
  }

  async listCampaigns(): Promise<CampaignRow[]> {
    return [...this.campaignsRows].sort((a, b) => {
      const time = b.startsAt.getTime() - a.startsAt.getTime();
      return time !== 0 ? time : b.id - a.id;
    });
  }

  async createCampaign(input: CreateCampaignInput): Promise<CampaignRow> {
    if (
      input.code !== null &&
      this.campaignsRows.some((row) => row.code === input.code)
    ) {
      throw new PricingStoreError(
        "conflict",
        409,
        "a campaign with this code already exists"
      );
    }
    const now = new Date();
    const row: CampaignRow = {
      id: this.campaignSeq++,
      name: input.name,
      code: input.code,
      discountType: "percent",
      discountBasisPoints: input.basisPoints,
      appliesTo: "whole_quote",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      enabled: true,
      createdByAdminId: input.adminId,
      createdAt: now,
      updatedAt: now,
    };
    this.campaignsRows.push(row);
    this.auditPush(input.adminId, "campaign_created", "campaign", String(row.id), {
      name: input.name,
      code: input.code,
      discountBasisPoints: input.basisPoints,
    });
    return row;
  }

  async patchCampaign(
    id: number,
    patch: ParsedCampaignPatch,
    adminId: number | null
  ): Promise<CampaignRow> {
    const row = this.campaignsRows.find((entry) => entry.id === id);
    if (!row) {
      throw new PricingStoreError("not-found", 404, "campaign not found");
    }
    const economic =
      patch.name !== undefined ||
      patch.code !== undefined ||
      patch.basisPoints !== undefined ||
      patch.startsAt !== undefined ||
      patch.endsAt !== undefined;
    if (economic) {
      // Mirror the SQL guard (starts_at > now()): a campaign that already
      // started keeps frozen economic terms.
      if (Date.now() >= row.startsAt.getTime()) {
        throw new PricingStoreError(
          "conflict",
          409,
          "only future campaigns may change economic terms; disable this campaign instead"
        );
      }
      if (
        patch.code !== undefined &&
        patch.code !== null &&
        this.campaignsRows.some(
          (entry) => entry.id !== id && entry.code === patch.code
        )
      ) {
        throw new PricingStoreError(
          "conflict",
          409,
          "a campaign with this code already exists"
        );
      }
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.code !== undefined) row.code = patch.code;
      if (patch.basisPoints !== undefined) {
        row.discountBasisPoints = patch.basisPoints;
      }
      if (patch.startsAt !== undefined) row.startsAt = patch.startsAt;
      if (patch.endsAt !== undefined) row.endsAt = patch.endsAt;
    }
    if (patch.enabled !== undefined) row.enabled = patch.enabled;
    row.updatedAt = new Date();
    this.auditPush(
      adminId,
      economic
        ? "campaign_updated"
        : patch.enabled === true
          ? "campaign_enabled"
          : "campaign_disabled",
      "campaign",
      String(row.id),
      {
        name: patch.name ?? null,
        code: patch.code ?? null,
        discountBasisPoints: patch.basisPoints ?? null,
        enabled: patch.enabled ?? null,
      }
    );
    return row;
  }

  async resolveCampaignForQuote(
    input: ResolveCampaignInput
  ): Promise<CampaignRow | null> {
    const nowMs = input.now.getTime();
    const window = this.campaignsRows.filter(
      (row) =>
        row.enabled &&
        row.startsAt.getTime() <= nowMs &&
        nowMs < row.endsAt.getTime()
    );
    if (input.code !== null) {
      const hit = window.find((row) => row.code === input.code);
      if (!hit) {
        throw new PricingStoreError(
          "invalid-campaign-code",
          400,
          "campaign code is not currently valid"
        );
      }
      return hit;
    }
    const automatic = window
      .filter((row) => row.code === null)
      .sort((a, b) => {
        if (b.discountBasisPoints !== a.discountBasisPoints) {
          return b.discountBasisPoints - a.discountBasisPoints;
        }
        const endOrder = a.endsAt.getTime() - b.endsAt.getTime();
        if (endOrder !== 0) return endOrder;
        return a.id - b.id;
      });
    return automatic[0] ?? null;
  }

  async listAuditEvents(limit?: number): Promise<AdminAuditEventRow[]> {
    const sorted = [...this.audit].sort((a, b) => {
      const time = b.createdAt.getTime() - a.createdAt.getTime();
      return time !== 0 ? time : b.id - a.id;
    });
    return sorted.slice(0, clampLimit(limit, 50));
  }
}

export type PricingStores = {
  pricing: PricingStore;
};

let memoryStore: InMemoryPricingStore | null = null;

/**
 * Store selector. Production ALWAYS uses Postgres. A shared in-memory
 * backend is available ONLY outside production when PRICING_STORE=memory, so
 * route handlers stay behaviorally testable without a live database.
 */
export function getPricingStores(): PricingStores {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.PRICING_STORE === "memory"
  ) {
    if (!memoryStore) memoryStore = new InMemoryPricingStore();
    return { pricing: memoryStore };
  }
  return { pricing: new PgPricingStore() };
}

/** Test escape hatch: drop shared in-memory state between isolated runs. */
export function resetPricingStoresForTests(): void {
  memoryStore = null;
}

export type QuotedCampaign = {
  id: number;
  name: string;
  code: string | null;
  basisPoints: number;
  startsAt: Date;
  endsAt: Date;
};

export type AuthoritativeSnapshot = {
  config: PricingConfig;
  /** Immutable pricing version identifier (e.g. "v3", or "dev-1" fallback). */
  version: string;
  campaign: QuotedCampaign | null;
  /** True only for the explicit non-production static fallback (no DATABASE_URL). */
  fallback: boolean;
};

/**
 * Non-production static fallback is allowed ONLY when no DATABASE_URL is
 * configured at all (zero-setup local development). Any configured database
 * — and every production environment — is strictly DB-backed and fails
 * closed (503) when pricing is unavailable.
 */
export function isDevFallbackAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return (process.env.DATABASE_URL ?? "").trim().length === 0;
}

/**
 * Loads the authoritative pricing snapshot: the single active pricing
 * version plus the currently-applicable campaign (if any), resolved against
 * SERVER time. Throws PricingStoreError("no-active-pricing"/"unavailable",
 * 503) when no price may be quoted, or ("invalid-campaign-code", 400) when
 * the caller requested a code that is not currently valid.
 */
export async function loadAuthoritativeSnapshot(
  stores: PricingStores,
  input: { now?: Date; campaignCode?: string | null } = {}
): Promise<AuthoritativeSnapshot> {
  const now = input.now ?? new Date();
  const campaignCode = input.campaignCode ?? null;
  let versionRow: PricingVersionRow | null;
  try {
    versionRow = await stores.pricing.getActiveVersion();
  } catch (error) {
    if (
      error instanceof PricingStoreError &&
      error.code === "unavailable" &&
      isDevFallbackAllowed()
    ) {
      const fallback = devPricingConfig();
      return {
        config: fallback,
        version: fallback.version,
        campaign: null,
        fallback: true,
      };
    }
    throw error;
  }
  if (!versionRow) {
    throw new PricingStoreError(
      "no-active-pricing",
      503,
      "pricing service is temporarily unavailable"
    );
  }
  const config = rowToPricingConfig(versionRow);
  const campaignRow = await stores.pricing.resolveCampaignForQuote({
    code: campaignCode,
    now,
  });
  // Defense in depth: the store already filters to the live window, but the
  // snapshot re-derives status so a stale/relayed row can never discount.
  const campaign: QuotedCampaign | null =
    campaignRow &&
    deriveCampaignStatus(
      {
        enabled: campaignRow.enabled,
        startsAt: campaignRow.startsAt,
        endsAt: campaignRow.endsAt,
      },
      now
    ) === "active"
      ? {
          id: campaignRow.id,
          name: campaignRow.name,
          code: campaignRow.code,
          basisPoints: campaignRow.discountBasisPoints,
          startsAt: campaignRow.startsAt,
          endsAt: campaignRow.endsAt,
        }
      : null;
  return { config, version: versionRow.version, campaign, fallback: false };
}
