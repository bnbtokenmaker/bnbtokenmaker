import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_SESSION_COOKIE } from "../../../lib/admin/session";
import { getAdminStores } from "../../../lib/admin/stores";
import { resolveAdminAccess } from "../../../lib/admin/dashboard/access";
import {
  ADMIN_FEATURE_FILTERS,
  ADMIN_PAGE_SIZE_MAX,
  parseAdminListParams,
} from "../../../lib/admin/dashboard/params";
import { listDeployments } from "../../../lib/admin/dashboard/repository";
import { AdminShell } from "../_components/admin-shell";
import { DeploymentTable } from "../_components/deployment-table";
import styles from "../admin.module.css";

/**
 * Phase 7B admin deployments list.
 *
 * Server-side search / filter / sort / pagination over database queries —
 * the browser never receives more than one page. Filter state lives in URL
 * query parameters via a native GET form (no client JS required); invalid
 * parameters fall back to safe defaults.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deployments — Admin Dashboard",
  robots: { index: false, follow: false },
};

type RawParams = Record<string, string | string[] | undefined>;

function hrefWith(
  base: Record<string, string>,
  overrides: Record<string, string | null>
): string {
  const params = new URLSearchParams(base);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query === "" ? "/admin/deployments" : `/admin/deployments?${query}`;
}

export default async function AdminDeploymentsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? null;
  const access = await resolveAdminAccess(token, getAdminStores());
  if (!access.ok) {
    if (access.reason === "unavailable") {
      return <AdminListError />;
    }
    redirect("/admin/login");
  }

  const raw = await searchParams;
  const params = parseAdminListParams(raw);

  let result;
  try {
    result = await listDeployments(params);
  } catch {
    return (
      <AdminShell identifier={access.identifier} active="deployments">
        <AdminListError />
      </AdminShell>
    );
  }

  // Echo the VALIDATED values back into links so pagination preserves state.
  const base: Record<string, string> = {};
  if (params.search !== null) base.search = params.search;
  if (params.chain !== null) base.chain = String(params.chain);
  if (params.feature !== null) base.feature = params.feature;
  if (params.from !== null)
    base.from = params.from.toISOString().slice(0, 10);
  if (params.toExclusive !== null)
    base.to = new Date(params.toExclusive.getTime() - 86_400_000)
      .toISOString()
      .slice(0, 10);
  if (params.sort !== "newest") base.sort = params.sort;
  if (params.pageSize !== 20) base.pageSize = String(params.pageSize);

  const start = result.total === 0 ? 0 : (params.page - 1) * params.pageSize + 1;
  const end = Math.min(params.page * params.pageSize, result.total);

  return (
    <AdminShell identifier={access.identifier} active="deployments">
      <header className={styles.pageHead}>
        <div className={styles.kicker}>
          <span className={styles.dot}></span>Site administration
        </div>
        <h1>Deployments</h1>
        <p>
          Every record below was independently verified on-chain before
          persistence. This view observes trusted records — it cannot alter
          deployed contracts.
        </p>
      </header>

      <form method="GET" action="/admin/deployments" className={styles.filters} role="search" aria-label="Search deployments">
        <div className={styles.field}>
          <label htmlFor="admin-search">Search</label>
          <input
            id="admin-search"
            name="search"
            type="search"
            className={`${styles.input} ${styles.searchInput}`}
            defaultValue={params.search ?? ""}
            placeholder="Name, symbol, address, tx hash…"
            maxLength={128}
            autoComplete="off"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="admin-feature">Feature</label>
          <select
            id="admin-feature"
            name="feature"
            className={styles.select}
            defaultValue={params.feature ?? ""}
          >
            <option value="">All features</option>
            {ADMIN_FEATURE_FILTERS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="admin-sort">Sort</label>
          <select
            id="admin-sort"
            name="sort"
            className={styles.select}
            defaultValue={params.sort}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="admin-from">From</label>
          <input
            id="admin-from"
            name="from"
            type="date"
            className={styles.input}
            defaultValue={params.from ? params.from.toISOString().slice(0, 10) : ""}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="admin-to">To</label>
          <input
            id="admin-to"
            name="to"
            type="date"
            className={styles.input}
            defaultValue={
              params.toExclusive
                ? new Date(params.toExclusive.getTime() - 86_400_000)
                    .toISOString()
                    .slice(0, 10)
                : ""
            }
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="admin-clear">&nbsp;</label>
          <span style={{ display: "flex", gap: ".5rem" }}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}>
              Apply
            </button>
            <Link href="/admin/deployments" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
              Reset
            </Link>
          </span>
        </div>
      </form>

      {result.total === 0 ? (
        <div className={styles.card}>
          <div className={styles.empty}>
            <h2>
              {params.search !== null ||
              params.feature !== null ||
              params.from !== null ||
              params.toExclusive !== null
                ? "No deployments match"
                : "No deployments recorded yet"}
            </h2>
            <p>
              {params.search !== null ||
              params.feature !== null ||
              params.from !== null ||
              params.toExclusive !== null ? (
                <>
                  Try a different search or{" "}
                  <Link href="/admin/deployments" className={styles.link}>
                    clear the filters
                  </Link>
                  .
                </>
              ) : (
                "Records appear here automatically after verified BSC Testnet deployments are persisted."
              )}
            </p>
          </div>
        </div>
      ) : (
        <>
          <DeploymentTable rows={result.rows} />
          <div className={styles.pager}>
            <span className={styles.pagerInfo} role="status">
              Showing {start}–{end} of {result.total} (page {params.page}
              {result.totalPages > 0 ? ` of ${result.totalPages}` : ""})
            </span>
            <span className={styles.pagerLinks}>
              {params.page > 1 ? (
                <Link
                  href={hrefWith(base, { page: String(params.page - 1) })}
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                  aria-label="Previous page"
                >
                  ← Newer
                </Link>
              ) : null}
              {result.totalPages > 0 && params.page < result.totalPages ? (
                <Link
                  href={hrefWith(base, { page: String(params.page + 1) })}
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                  aria-label="Next page"
                >
                  Older →
                </Link>
              ) : null}
            </span>
            <span className={`${styles.pagerInfo} ${styles.small}`}>
              Page size {params.pageSize} (max {ADMIN_PAGE_SIZE_MAX})
            </span>
          </div>
        </>
      )}
    </AdminShell>
  );
}

function AdminListError() {
  return (
    <div className={styles.admin}>
      <div className={`${styles.container} ${styles.main}`}>
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <h2>Deployments unavailable</h2>
          <p className={styles.muted}>
            The deployment records could not be loaded. Please try again in a
            moment.
          </p>
          <p>
            <Link className={styles.link} href="/admin/deployments">
              Retry
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
