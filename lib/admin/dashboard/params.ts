/**
 * Phase 7B admin deployments list — query validation boundary (pure).
 *
 * Every value arrives from URL query parameters (untrusted strings) and is
 * normalized here before it ever reaches Drizzle. Invalid values fall back
 * to safe defaults — the page never crashes on bad input and no raw user
 * text is ever concatenated into SQL (Drizzle parameterizes everything;
 * LIKE wildcards are stripped below).
 */

export const ADMIN_SEARCH_MAX_LENGTH = 128;
export const ADMIN_PAGE_DEFAULT = 1;
export const ADMIN_PAGE_SIZE_DEFAULT = 20;
export const ADMIN_PAGE_SIZE_MAX = 50;
export const ADMIN_PAGE_MAX = 100_000;

export type AdminSort = "newest" | "oldest";

export const ADMIN_FEATURE_FILTERS = [
  "burn",
  "mint",
  "pause",
  "maxTx",
  "maxWallet",
  "blacklist",
  "whitelist",
] as const;

export type AdminFeatureFilter = (typeof ADMIN_FEATURE_FILTERS)[number];

export function isAdminFeatureFilter(value: unknown): value is AdminFeatureFilter {
  return (
    typeof value === "string" &&
    (ADMIN_FEATURE_FILTERS as readonly string[]).includes(value)
  );
}

export type AdminListParams = {
  /** Trimmed, wildcard-stripped search text, or null when empty. */
  search: string | null;
  /** Exact chain filter, or null for all chains (today only 97 exists). */
  chain: number | null;
  /** Feature-presence filter, or null. */
  feature: AdminFeatureFilter | null;
  /** Inclusive lower bound (UTC midnight), or null. */
  from: Date | null;
  /** Exclusive upper bound (UTC midnight after the `to` day), or null. */
  toExclusive: Date | null;
  sort: AdminSort;
  page: number;
  pageSize: number;
};

function firstString(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : null;
}

/** Trim + strip LIKE wildcards (`%`, `_`, `\`) so search can't alter matching. */
export function sanitizeAdminSearch(value: unknown): string | null {
  const raw = firstString(value);
  if (raw === null) return null;
  const cleaned = raw
    .trim()
    .replace(/[%_\\]/g, "")
    .trim()
    .slice(0, ADMIN_SEARCH_MAX_LENGTH);
  return cleaned.length === 0 ? null : cleaned;
}

function parsePositiveInt(value: unknown): number | null {
  const raw = firstString(value);
  if (raw === null || !/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw.trim());
  if (!Number.isSafeInteger(n) || n < 1) return null;
  return n;
}

function parseDateDay(value: unknown): Date | null {
  const raw = firstString(value);
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Reject impossible dates (e.g. month 13, Feb 30) via round-trip check.
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

/**
 * Parse raw URL query input into validated list parameters. Accepts the
 * `searchParams` record shape (string | string[] | undefined values).
 */
export function parseAdminListParams(
  input: Record<string, unknown>
): AdminListParams {
  const search = sanitizeAdminSearch(input.search);

  const chainRaw = parsePositiveInt(input.chain);
  const chain = chainRaw;

  const featureRaw = firstString(input.feature);
  const feature = isAdminFeatureFilter(featureRaw) ? featureRaw : null;

  const from = parseDateDay(input.from);
  const toDay = parseDateDay(input.to);
  const toExclusive =
    toDay === null ? null : new Date(toDay.getTime() + 24 * 60 * 60 * 1000);

  const sortRaw = firstString(input.sort)?.trim().toLowerCase();
  const sort: AdminSort = sortRaw === "oldest" ? "oldest" : "newest";

  const pageRaw = parsePositiveInt(input.page);
  const page =
    pageRaw === null ? ADMIN_PAGE_DEFAULT : Math.min(pageRaw, ADMIN_PAGE_MAX);

  const pageSizeRaw = parsePositiveInt(input.pageSize);
  const pageSize =
    pageSizeRaw === null
      ? ADMIN_PAGE_SIZE_DEFAULT
      : Math.min(pageSizeRaw, ADMIN_PAGE_SIZE_MAX);

  return { search, chain, feature, from, toExclusive, sort, page, pageSize };
}
