/**
 * Phase 7B admin deployment repository (server-side ONLY).
 *
 * All admin reads go through here: overview statistics, filtered/paginated
 * deployment lists, recent deployments, and single-record detail. Every
 * aggregation (COUNT / DISTINCT / SUM / MAX) runs database-side — rows are
 * never bulk-loaded into JS for statistics. All filters are parameterized
 * Drizzle queries; no raw SQL is ever concatenated from user input (the
 * single `sql` fragment below carries only an allowlisted feature key).
 *
 * `import "server-only"` guarantees this module can never be bundled into
 * client JS at build time.
 */

import "server-only";

import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  ilike,
  lt,
  max,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { getDb } from "../../db/client";
import { deployments, type DeploymentRow } from "../../db/schema";
import { parseFeeSum } from "./format";
import {
  ADMIN_FEATURE_FILTERS,
  type AdminFeatureFilter,
  type AdminListParams,
} from "./params";

export type DashboardStats = {
  total: number;
  today: number;
  last7Days: number;
  last30Days: number;
  uniqueDeployers: number;
  /** Canonical wei TEXT (bigint-safe, summed database-side). */
  totalPlatformFeeWei: string;
  /** Per-feature deployment counts (presence flags from the stored config). */
  featureUsage: Record<AdminFeatureFilter, number>;
  latestAt: Date | null;
};

export type DeploymentListResult = {
  rows: DeploymentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function featurePresence(column: typeof deployments.featureConfig, key: string): SQL {
  // `key` is ALWAYS one of ADMIN_FEATURE_FILTERS (validated in params.ts),
  // so it is bound as a parameter — never concatenated into SQL text.
  return sql`${column}->>${key} = 'true'`;
}

function listWhere(params: AdminListParams): SQL | undefined {
  const conditions: SQL[] = [];
  if (params.chain !== null) {
    conditions.push(eq(deployments.chainId, params.chain));
  }
  if (params.search !== null) {
    const pattern = `%${params.search}%`;
    conditions.push(
      or(
        ilike(deployments.tokenName, pattern),
        ilike(deployments.tokenSymbol, pattern),
        ilike(deployments.contractAddress, pattern),
        ilike(deployments.deployerAddress, pattern),
        ilike(deployments.txHash, pattern)
      )!
    );
  }
  if (params.feature !== null) {
    conditions.push(featurePresence(deployments.featureConfig, params.feature));
  }
  if (params.from !== null) {
    conditions.push(gte(deployments.createdAt, params.from));
  }
  if (params.toExclusive !== null) {
    conditions.push(lt(deployments.createdAt, params.toExclusive));
  }
  if (conditions.length === 0) return undefined;
  return and(...conditions);
}

/** Database-backed overview statistics (all aggregates run in Postgres). */
export async function getDashboardStats(now: Date = new Date()): Promise<DashboardStats> {
  const db = getDb();
  const dayStart = startOfUtcDay(now);
  const daysAgo = (n: number) =>
    new Date(dayStart.getTime() - n * 24 * 60 * 60 * 1000);

  const [
    totalRows,
    todayRows,
    weekRows,
    monthRows,
    deployerRows,
    feeRows,
    latestRows,
    ...featureRows
  ] = await Promise.all([
    db.select({ n: count() }).from(deployments),
    db
      .select({ n: count() })
      .from(deployments)
      .where(gte(deployments.createdAt, dayStart)),
    db
      .select({ n: count() })
      .from(deployments)
      .where(gte(deployments.createdAt, daysAgo(7))),
    db
      .select({ n: count() })
      .from(deployments)
      .where(gte(deployments.createdAt, daysAgo(30))),
    db
      .select({ n: countDistinct(deployments.deployerAddress) })
      .from(deployments),
    db
      .select({
        // platform_fee_wei is TEXT: cast database-side, sum as numeric, and
        // parse back with bigint semantics in parseFeeSum (never Number()).
        total: sql<string | null>`coalesce(sum(${deployments.platformFeeWei}::numeric), 0)`,
      })
      .from(deployments),
    db.select({ latest: max(deployments.createdAt) }).from(deployments),
    ...ADMIN_FEATURE_FILTERS.map((key) =>
      db
        .select({ n: count() })
        .from(deployments)
        .where(featurePresence(deployments.featureConfig, key))
    ),
  ]);

  const featureUsage = {} as Record<AdminFeatureFilter, number>;
  ADMIN_FEATURE_FILTERS.forEach((key, index) => {
    featureUsage[key] = featureRows[index]?.[0]?.n ?? 0;
  });

  return {
    total: totalRows[0]?.n ?? 0,
    today: todayRows[0]?.n ?? 0,
    last7Days: weekRows[0]?.n ?? 0,
    last30Days: monthRows[0]?.n ?? 0,
    uniqueDeployers: deployerRows[0]?.n ?? 0,
    totalPlatformFeeWei: parseFeeSum(feeRows[0]?.total ?? null),
    featureUsage,
    latestAt: latestRows[0]?.latest ?? null,
  };
}

/** Filtered, sorted, paginated deployment list (server-side pagination). */
export async function listDeployments(
  params: AdminListParams
): Promise<DeploymentListResult> {
  const db = getDb();
  const where = listWhere(params);
  const order =
    params.sort === "oldest"
      ? [asc(deployments.createdAt), asc(deployments.id)]
      : [desc(deployments.createdAt), desc(deployments.id)];
  const offset = (params.page - 1) * params.pageSize;

  const [countRows, rows] = await Promise.all([
    db.select({ n: count() }).from(deployments).where(where),
    db
      .select()
      .from(deployments)
      .where(where)
      .orderBy(...order)
      .limit(params.pageSize)
      .offset(offset),
  ]);

  const total = countRows[0]?.n ?? 0;
  return {
    rows,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / params.pageSize),
  };
}

/** Latest deployments for the overview "recent" section. */
export async function getRecentDeployments(
  limit = 5
): Promise<DeploymentRow[]> {
  const db = getDb();
  const safeLimit = Math.min(Math.max(limit, 1), 10);
  return db
    .select()
    .from(deployments)
    .orderBy(desc(deployments.createdAt), desc(deployments.id))
    .limit(safeLimit);
}

/** Single deployment by internal DB id, or null. */
export async function getDeploymentById(
  id: number
): Promise<DeploymentRow | null> {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const db = getDb();
  const rows = await db
    .select()
    .from(deployments)
    .where(eq(deployments.id, id))
    .limit(1);
  return rows[0] ?? null;
}
