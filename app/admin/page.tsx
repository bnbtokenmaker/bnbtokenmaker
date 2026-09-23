import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_SESSION_COOKIE } from "../../lib/admin/session";
import { getAdminStores } from "../../lib/admin/stores";
import { resolveAdminAccess } from "../../lib/admin/dashboard/access";
import {
  formatUtc,
  formatWeiTextToBnb,
} from "../../lib/admin/dashboard/format";
import { ADMIN_FEATURE_FILTERS } from "../../lib/admin/dashboard/params";
import {
  getDashboardStats,
  getRecentDeployments,
} from "../../lib/admin/dashboard/repository";
import { AdminShell } from "./_components/admin-shell";
import { DeploymentTable } from "./_components/deployment-table";
import styles from "./admin.module.css";

/**
 * Phase 7B admin overview dashboard.
 *
 * Server-rendered from database-side aggregates (COUNT / DISTINCT / SUM /
 * MAX). Unauthenticated requests are redirected before any admin data is
 * fetched or rendered; a database outage renders a sanitized error state.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard — BNB Token Maker",
  robots: { index: false, follow: false },
};

const FEATURE_LABELS: Record<string, string> = {
  burn: "Burnable",
  mint: "Mintable",
  pause: "Pausable",
  maxTx: "Max transaction",
  maxWallet: "Max wallet",
  blacklist: "Blacklist",
  whitelist: "Whitelist",
};

export default async function AdminOverviewPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? null;
  const access = await resolveAdminAccess(token, getAdminStores());
  if (!access.ok) {
    if (access.reason === "unavailable") {
      return <AdminErrorState />;
    }
    redirect("/admin/login");
  }

  let stats;
  let recent;
  try {
    [stats, recent] = await Promise.all([
      getDashboardStats(),
      getRecentDeployments(5),
    ]);
  } catch {
    return (
      <AdminShell identifier={access.identifier} active="overview">
        <AdminErrorState />
      </AdminShell>
    );
  }

  const totalFee = formatWeiTextToBnb(stats.totalPlatformFeeWei) ?? "0";
  const maxUsage = Math.max(
    1,
    ...ADMIN_FEATURE_FILTERS.map((key) => stats.featureUsage[key] ?? 0)
  );

  return (
    <AdminShell identifier={access.identifier} active="overview">
      <header className={styles.pageHead}>
        <div className={styles.kicker}>
          <span className={styles.dot}></span>Site administration
        </div>
        <h1>Overview</h1>
        <p>
          Trusted deployment records verified on-chain before persistence. All
          figures below come directly from the deployments database.
        </p>
      </header>

      <div className={`${styles.grid} ${styles.statsGrid}`} role="list" aria-label="Deployment statistics">
        <div className={styles.card} role="listitem">
          <div className={styles.statLabel}>Total deployments</div>
          <div className={styles.statValue}>{stats.total}</div>
        </div>
        <div className={styles.card} role="listitem">
          <div className={styles.statLabel}>Today</div>
          <div className={styles.statValue}>{stats.today}</div>
          <div className={styles.statNote}>UTC day</div>
        </div>
        <div className={styles.card} role="listitem">
          <div className={styles.statLabel}>Last 7 days</div>
          <div className={styles.statValue}>{stats.last7Days}</div>
        </div>
        <div className={styles.card} role="listitem">
          <div className={styles.statLabel}>Last 30 days</div>
          <div className={styles.statValue}>{stats.last30Days}</div>
        </div>
        <div className={styles.card} role="listitem">
          <div className={styles.statLabel}>Unique deployers</div>
          <div className={styles.statValue}>{stats.uniqueDeployers}</div>
        </div>
        <div className={styles.card} role="listitem">
          <div className={styles.statLabel}>Recorded platform fees</div>
          <div className={styles.statValue}>
            {totalFee} <small>BNB</small>
          </div>
          <div className={styles.statNote}>
            Testnet deployments carry no fee — not revenue.
          </div>
        </div>
        <div className={styles.card} role="listitem">
          <div className={styles.statLabel}>Latest deployment</div>
          <div className={styles.statValue} style={{ fontSize: "1.05rem" }}>
            {stats.latestAt ? formatUtc(stats.latestAt) : "—"}
          </div>
        </div>
        <div className={styles.card} role="listitem">
          <div className={styles.statLabel}>Chain scope</div>
          <div className={styles.statValue} style={{ fontSize: "1.05rem" }}>
            BSC Testnet
          </div>
          <div className={styles.statNote}>chain 97 only</div>
        </div>
      </div>

      <div className={styles.card} style={{ marginTop: "1rem" }}>
        <h2>Feature usage</h2>
        <p className={`${styles.muted} ${styles.small}`}>
          Deployments carrying each optional feature flag.
        </p>
        <ul className={styles.usageList}>
          {ADMIN_FEATURE_FILTERS.map((key) => {
            const count = stats.featureUsage[key] ?? 0;
            return (
              <li key={key} className={styles.usageRow}>
                <span style={{ minWidth: "9rem" }}>{FEATURE_LABELS[key] ?? key}</span>
                <span className={styles.usageBar} aria-hidden="true">
                  <span
                    className={styles.usageFill}
                    style={{ width: `${Math.round((count / maxUsage) * 100)}%` }}
                  />
                </span>
                <span className={styles.usageCount}>{count}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.sectionTitle}>
        <h2>Recent deployments</h2>
        <Link href="/admin/deployments" className={styles.link}>
          View all deployments →
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className={styles.card}>
          <div className={styles.empty}>
            <h2>No deployments recorded yet</h2>
            <p>
              Records appear here automatically after verified BSC Testnet
              deployments are persisted.
            </p>
          </div>
        </div>
      ) : (
        <DeploymentTable rows={recent} />
      )}
    </AdminShell>
  );
}

function AdminErrorState() {
  return (
    <div className={styles.admin}>
      <div className={`${styles.container} ${styles.main}`}>
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <h2>Admin service unavailable</h2>
          <p className={styles.muted}>
            The administration database could not be reached. Please try again
            in a moment.
          </p>
          <p>
            <a className={styles.link} href="/admin">
              Retry
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
