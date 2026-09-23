/**
 * Phase 7C admin pricing page (server-rendered, authenticated only).
 *
 * Shows the current ACTIVE pricing version, a publish form for new immutable
 * versions, version history (read-only), and recent financial-config audit
 * events. Publishing affects NEW quotes only — historical deployment
 * snapshots are never rewritten.
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_SESSION_COOKIE } from "../../../lib/admin/session";
import { getAdminStores } from "../../../lib/admin/stores";
import { resolveAdminAccess } from "../../../lib/admin/dashboard/access";
import {
  formatUtc,
} from "../../../lib/admin/dashboard/format";
import { formatWeiBnb } from "../../../lib/pricing/money";
import { getPricingStores } from "../../../lib/pricing/server/store";
import { AdminShell } from "../_components/admin-shell";
import { PublishForm } from "./publish-form";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Pricing — BNB Token Maker",
  robots: { index: false, follow: false },
};

const FEE_LABELS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "base", label: "Base BEP-20 token" },
  { key: "burn", label: "Burnable" },
  { key: "mint", label: "Mintable" },
  { key: "pause", label: "Pausable" },
  { key: "maxTx", label: "Max transaction" },
  { key: "maxWallet", label: "Max wallet" },
  { key: "blacklist", label: "Blacklist" },
  { key: "whitelist", label: "Whitelist" },
];

function weiToBnbText(wei: string): string {
  try {
    return `${formatWeiBnb(BigInt(wei))} BNB`;
  } catch {
    return "—";
  }
}

function feeOf(
  row: {
    baseFeeWei: string;
    featureFees: Record<string, string>;
  },
  key: string
): string {
  if (key === "base") return row.baseFeeWei;
  return row.featureFees[key] ?? "0";
}

export default async function AdminPricingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? null;
  const access = await resolveAdminAccess(token, getAdminStores());
  if (!access.ok) {
    if (access.reason === "unavailable") {
      return <PricingErrorState />;
    }
    redirect("/admin/login");
  }

  let snapshot: {
    activeRow: {
      version: string;
      baseFeeWei: string;
      featureFees: Record<string, string>;
      activatedAt: string | null;
    } | null;
    versions: Array<{
      version: string;
      status: string;
      baseFeeWei: string;
      featureFees: Record<string, string>;
      createdAt: string;
      activatedAt: string | null;
    }>;
    audit: Array<{
      id: number;
      action: string;
      entityType: string;
      entityId: string;
      createdAt: string;
    }>;
  } | null = null;

  try {
    const { pricing } = getPricingStores();
    const [activeRow, versions, audit] = await Promise.all([
      pricing.getActiveVersion(),
      pricing.listVersions(20),
      pricing.listAuditEvents(10),
    ]);
    snapshot = {
      activeRow: activeRow
        ? {
            version: activeRow.version,
            baseFeeWei: activeRow.baseFeeWei,
            featureFees: {
              burn: activeRow.burnFeeWei,
              mint: activeRow.mintFeeWei,
              pause: activeRow.pauseFeeWei,
              maxTx: activeRow.maxTxFeeWei,
              maxWallet: activeRow.maxWalletFeeWei,
              blacklist: activeRow.blacklistFeeWei,
              whitelist: activeRow.whitelistFeeWei,
            },
            activatedAt: activeRow.activatedAt
              ? activeRow.activatedAt.toISOString()
              : null,
          }
        : null,
      versions: versions.map((row) => ({
        version: row.version,
        status: row.status,
        baseFeeWei: row.baseFeeWei,
        featureFees: {
          burn: row.burnFeeWei,
          mint: row.mintFeeWei,
          pause: row.pauseFeeWei,
          maxTx: row.maxTxFeeWei,
          maxWallet: row.maxWalletFeeWei,
          blacklist: row.blacklistFeeWei,
          whitelist: row.whitelistFeeWei,
        },
        createdAt: row.createdAt.toISOString(),
        activatedAt: row.activatedAt ? row.activatedAt.toISOString() : null,
      })),
      audit: audit.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  } catch {
    return (
      <AdminShell identifier={access.identifier} active="pricing">
        <PricingErrorState />
      </AdminShell>
    );
  }

  if (!snapshot) {
    return (
      <AdminShell identifier={access.identifier} active="pricing">
        <PricingErrorState />
      </AdminShell>
    );
  }

  const current = snapshot.activeRow;
  const presetTotals = current
    ? {
        standard: current.baseFeeWei,
        mintable: (
          BigInt(current.baseFeeWei) + BigInt(current.featureFees.mint)
        ).toString(),
        community: (
          BigInt(current.baseFeeWei) +
          BigInt(current.featureFees.maxTx) +
          BigInt(current.featureFees.maxWallet)
        ).toString(),
      }
    : null;

  return (
    <AdminShell identifier={access.identifier} active="pricing">
      <header className={styles.pageHead}>
        <div className={styles.kicker}>
          <span className={styles.dot}></span>Site administration
        </div>
        <h1>Pricing</h1>
        <p>
          Commercial platform pricing for NEW quotes. Publishing creates a new
          immutable version — historical versions and past deployment snapshots
          are never rewritten. Testnet deployments stay fee-free regardless of
          these values.
        </p>
      </header>

      <div className={styles.card}>
        <h2>Current active pricing</h2>
        {current ? (
          <>
            <dl className={styles.dl}>
              <dt>Version</dt>
              <dd className={styles.mono}>{current.version}</dd>
              <dt>Activated</dt>
              <dd>
                {current.activatedAt
                  ? formatUtc(new Date(current.activatedAt))
                  : "—"}
              </dd>
              <dt>Standard preset</dt>
              <dd>{presetTotals && weiToBnbText(presetTotals.standard)}</dd>
              <dt>Mintable preset</dt>
              <dd>{presetTotals && weiToBnbText(presetTotals.mintable)}</dd>
              <dt>Community preset</dt>
              <dd>{presetTotals && weiToBnbText(presetTotals.community)}</dd>
            </dl>
            <div className={`${styles.tableWrap}`} style={{ marginTop: "1rem" }}>
              <table className={styles.table}>
                <caption>Active fee schedule (commercial reference)</caption>
                <thead>
                  <tr>
                    <th scope="col">Fee</th>
                    <th scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {FEE_LABELS.map(({ key, label }) => (
                    <tr key={key}>
                      <td>{label}</td>
                      <td className={styles.mono}>
                        {weiToBnbText(feeOf(current, key))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            <h2>No active pricing version</h2>
            <p className={styles.muted}>
              Public quotes are unavailable until a pricing version is
              published. Run the pricing bootstrap, then publish below.
            </p>
          </div>
        )}
      </div>

      <div className={styles.sectionTitle}>
        <h2>Publish new pricing</h2>
      </div>
      <div className={styles.card}>
        <p className={`${styles.muted} ${styles.small}`} style={{ marginBottom: "1rem" }}>
          Enter amounts in BNB (up to 18 decimals, max 1 BNB per field, max 5
          BNB combined). Review the OLD → NEW comparison, then publish. The
          new version takes effect for new quotes immediately; testnet
          deployments remain 0 BNB.
        </p>
        <PublishForm
          current={
            current
              ? {
                  base: formatWeiBnb(BigInt(current.baseFeeWei)),
                  burn: formatWeiBnb(BigInt(current.featureFees.burn)),
                  mint: formatWeiBnb(BigInt(current.featureFees.mint)),
                  pause: formatWeiBnb(BigInt(current.featureFees.pause)),
                  maxTx: formatWeiBnb(BigInt(current.featureFees.maxTx)),
                  maxWallet: formatWeiBnb(BigInt(current.featureFees.maxWallet)),
                  blacklist: formatWeiBnb(BigInt(current.featureFees.blacklist)),
                  whitelist: formatWeiBnb(BigInt(current.featureFees.whitelist)),
                }
              : null
          }
        />
      </div>

      <div className={styles.sectionTitle}>
        <h2>Version history</h2>
      </div>
      {snapshot.versions.length === 0 ? (
        <div className={styles.card}>
          <div className={styles.empty}>
            <h2>No pricing versions yet</h2>
            <p>Publish the first version above, or run the bootstrap script.</p>
          </div>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption>Pricing versions (read-only history)</caption>
            <thead>
              <tr>
                <th scope="col">Version</th>
                <th scope="col">Status</th>
                <th scope="col">Base fee</th>
                <th scope="col">Activated</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.versions.map((row) => (
                <tr key={row.version}>
                  <td className={`${styles.mono} ${styles.cellMain}`}>
                    {row.version}
                  </td>
                  <td>
                    {row.status === "active" ? (
                      <span className={`${styles.badge} ${styles.badgeOn}`}>
                        Active
                      </span>
                    ) : (
                      <span className={styles.badge}>Inactive</span>
                    )}
                  </td>
                  <td className={styles.mono}>{weiToBnbText(row.baseFeeWei)}</td>
                  <td className={styles.cellSub}>
                    {row.activatedAt
                      ? formatUtc(new Date(row.activatedAt))
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.sectionTitle}>
        <h2>Recent audit events</h2>
      </div>
      {snapshot.audit.length === 0 ? (
        <div className={styles.card}>
          <p className={styles.muted}>No pricing or campaign changes recorded yet.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption>Financial-configuration audit trail</caption>
            <thead>
              <tr>
                <th scope="col">Action</th>
                <th scope="col">Entity</th>
                <th scope="col">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.audit.map((entry) => (
                <tr key={entry.id}>
                  <td className={styles.mono}>{entry.action}</td>
                  <td className={styles.cellSub}>
                    {entry.entityType} · {entry.entityId}
                  </td>
                  <td className={styles.cellSub}>
                    {formatUtc(new Date(entry.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

function PricingErrorState() {
  return (
    <div className={styles.admin}>
      <div className={`${styles.container} ${styles.main}`}>
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <h2>Pricing service unavailable</h2>
          <p className={styles.muted}>
            The pricing database could not be reached. Please try again in a
            moment.
          </p>
          <p>
            <a className={styles.link} href="/admin/pricing">
              Retry
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
