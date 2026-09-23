import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ADMIN_SESSION_COOKIE } from "../../../../lib/admin/session";
import { getAdminStores } from "../../../../lib/admin/stores";
import { resolveAdminAccess } from "../../../../lib/admin/dashboard/access";
import {
  abbreviateAddress,
  abbreviateTxHash,
  chainLabel,
  explorerAddressUrl,
  explorerTxUrl,
  formatBaseUnitsToHuman,
  formatUtc,
  formatWeiTextToBnb,
  normalizeFeatureDisplay,
} from "../../../../lib/admin/dashboard/format";
import { getDeploymentById } from "../../../../lib/admin/dashboard/repository";
import { AdminShell } from "../../_components/admin-shell";
import { CopyButton } from "../../_components/copy-button";
import styles from "../../admin.module.css";

/**
 * Phase 7B admin deployment detail (server-rendered, authenticated).
 *
 * Shows ONLY authoritative stored facts: chain/transaction identity, token
 * data decoded from the on-chain event, the versioned feature config, and
 * the persisted pricing snapshot. No secrets, no session material, no
 * internal error details. Unknown ids render the admin 404.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deployment detail — Admin Dashboard",
  robots: { index: false, follow: false },
};

function HashField({ label, value }: { label: string; value: string }) {
  const short =
    value.length === 66 ? abbreviateTxHash(value) : abbreviateAddress(value);
  return (
    <div className={styles.hashRow}>
      <span className={styles.mono} title={value}>
        {short}
      </span>
      <CopyButton value={value} label={label} />
    </div>
  );
}

export default async function AdminDeploymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? null;
  const access = await resolveAdminAccess(token, getAdminStores());
  if (!access.ok) {
    if (access.reason === "unavailable") {
      return <DetailError />;
    }
    redirect("/admin/login");
  }

  const { id: rawId } = await params;
  const id = /^\d+$/.test((rawId ?? "").trim()) ? Number(rawId.trim()) : NaN;
  if (!Number.isSafeInteger(id) || id < 1) {
    notFound();
  }

  let row;
  try {
    row = await getDeploymentById(id);
  } catch {
    return (
      <AdminShell identifier={access.identifier} active="deployments">
        <DetailError />
      </AdminShell>
    );
  }
  if (row === null) {
    notFound();
  }

  const contractUrl = explorerAddressUrl(row.chainId, row.contractAddress);
  const factoryUrl = explorerAddressUrl(row.chainId, row.factoryAddress);
  const deployerUrl = explorerAddressUrl(row.chainId, row.deployerAddress);
  const txUrl = explorerTxUrl(row.chainId, row.txHash);
  const features = normalizeFeatureDisplay(row.featureConfig);
  const feeBnb = formatWeiTextToBnb(row.platformFeeWei);
  const supplyHuman = formatBaseUnitsToHuman(row.initialSupplyBase, row.decimals);
  const snapshot = (
    row.quoteSnapshot !== null && typeof row.quoteSnapshot === "object"
      ? (row.quoteSnapshot as Record<string, unknown>)
      : {}
  ) as Record<string, unknown>;
  const snapshotTotal =
    typeof snapshot.totalWei === "string"
      ? formatWeiTextToBnb(snapshot.totalWei)
      : null;
  const snapshotFeatures = Array.isArray(snapshot.selectedFeatures)
    ? (snapshot.selectedFeatures as unknown[]).filter(
        (item): item is string => typeof item === "string"
      )
    : [];

  return (
    <AdminShell identifier={access.identifier} active="deployments">
      <header className={styles.pageHead}>
        <div className={styles.kicker}>
          <span className={styles.dot}></span>
          <Link href="/admin/deployments" className={styles.link}>
            Deployments
          </Link>
          &nbsp;/ record #{row.id}
        </div>
        <h1>
          {row.tokenName} <span className={styles.muted}>({row.tokenSymbol})</span>
        </h1>
        <p>
          <span className={`${styles.badge} ${styles.badgeTestnet}`}>
            {chainLabel(row.chainId)}
          </span>{" "}
          <span className={styles.cellSub}>
            recorded {row.createdAt ? formatUtc(row.createdAt) : "—"}
          </span>
        </p>
      </header>

      <div className={styles.detailGrid}>
        <section className={styles.card} aria-labelledby="detail-deployment">
          <h2 id="detail-deployment">Deployment</h2>
          <dl className={styles.dl}>
            <dt>Transaction</dt>
            <dd>
              <HashField label="transaction hash" value={row.txHash} />
              {txUrl ? (
                <a
                  href={txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.link} ${styles.extLink}`}
                >
                  View on BscScan →
                </a>
              ) : null}
            </dd>
            <dt>Block</dt>
            <dd>
              <span className={styles.mono}>
                {row.blockNumber === null || row.blockNumber === undefined
                  ? "—"
                  : row.blockNumber}
              </span>
            </dd>
            <dt>Contract</dt>
            <dd>
              <HashField label="contract address" value={row.contractAddress} />
              {contractUrl ? (
                <a
                  href={contractUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.link} ${styles.extLink}`}
                >
                  View on BscScan →
                </a>
              ) : null}
            </dd>
            <dt>Factory</dt>
            <dd>
              <HashField label="factory address" value={row.factoryAddress} />
              {factoryUrl ? (
                <a
                  href={factoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.link} ${styles.extLink}`}
                >
                  View on BscScan →
                </a>
              ) : null}
            </dd>
            <dt>Deployer</dt>
            <dd>
              <HashField label="deployer address" value={row.deployerAddress} />
              {deployerUrl ? (
                <a
                  href={deployerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.link} ${styles.extLink}`}
                >
                  View on BscScan →
                </a>
              ) : null}
            </dd>
          </dl>
        </section>

        <section className={styles.card} aria-labelledby="detail-token">
          <h2 id="detail-token">Token</h2>
          <dl className={styles.dl}>
            <dt>Name</dt>
            <dd>{row.tokenName}</dd>
            <dt>Symbol</dt>
            <dd>
              <span className={styles.mono}>{row.tokenSymbol}</span>
            </dd>
            <dt>Decimals</dt>
            <dd>
              <span className={styles.mono}>{row.decimals}</span>
            </dd>
            <dt>Initial supply</dt>
            <dd>
              <span className={styles.mono}>
                {supplyHuman === null ? "—" : supplyHuman}
              </span>
              <div className={styles.cellSub}>
                <span className={styles.mono}>{row.initialSupplyBase}</span> base
                units
              </div>
            </dd>
          </dl>
        </section>

        <section className={styles.card} aria-labelledby="detail-features">
          <h2 id="detail-features">Features</h2>
          {features.unknownVersion ? (
            <p className={styles.small} role="note">
              <span className={`${styles.badge} ${styles.badgeUnknown}`}>
                Unrecognized config version
                {features.version === null ? "" : ` ${features.version}`}
              </span>{" "}
              This record uses a feature-config version newer than this
              dashboard understands; flags are shown as stored, without
              reinterpretation.
            </p>
          ) : null}
          {!features.unknownVersion && features.flags.length > 0 ? (
            <ul className={styles.usageList}>
              {features.flags.map((flag) => (
                <li key={flag.id} className={styles.usageRow}>
                  <span style={{ minWidth: "9rem" }}>{flag.label}</span>
                  <span
                    className={`${styles.badge} ${
                      flag.enabled === true
                        ? styles.badgeOn
                        : flag.enabled === false
                          ? styles.badgeOff
                          : styles.badgeUnknown
                    }`}
                  >
                    {flag.enabled === true
                      ? "Enabled"
                      : flag.enabled === false
                        ? "Disabled"
                        : "Unknown"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {features.extra.length > 0 ? (
            <div className={styles.small}>
              <p className={styles.muted}>Additional stored fields:</p>
              <dl className={styles.dl}>
                {features.extra.map((item) => (
                  <div key={item.key} style={{ display: "contents" }}>
                    <dt>
                      <span className={styles.mono}>{item.key}</span>
                    </dt>
                    <dd>
                      <span className={styles.mono}>{item.raw}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </section>

        <section className={styles.card} aria-labelledby="detail-pricing">
          <h2 id="detail-pricing">Pricing snapshot</h2>
          <p className={`${styles.muted} ${styles.small}`}>
            Informational reconciliation data captured at record time — not a
            blockchain fact.
          </p>
          <dl className={styles.dl}>
            <dt>Pricing version</dt>
            <dd>
              <span className={styles.mono}>
                {typeof snapshot.pricingVersion === "string"
                  ? snapshot.pricingVersion
                  : "—"}
              </span>
            </dd>
            <dt>Platform fee</dt>
            <dd>
              <span className={styles.mono}>
                {feeBnb === null ? "—" : `${feeBnb} BNB`}
              </span>
              <div className={styles.cellSub}>
                <span className={styles.mono}>{row.platformFeeWei}</span> wei
              </div>
            </dd>
            <dt>Quoted total</dt>
            <dd>
              <span className={styles.mono}>
                {snapshotTotal === null ? "—" : `${snapshotTotal} BNB`}
              </span>
            </dd>
            <dt>Quoted features</dt>
            <dd>
              {snapshotFeatures.length === 0 ? (
                <span className={styles.cellSub}>none</span>
              ) : (
                <span className={styles.badgeRow}>
                  {snapshotFeatures.map((id) => (
                    <span key={id} className={styles.badge}>
                      {id}
                    </span>
                  ))}
                </span>
              )}
            </dd>
          </dl>
        </section>
      </div>
    </AdminShell>
  );
}

function DetailError() {
  return (
    <div className={styles.admin}>
      <div className={`${styles.container} ${styles.main}`}>
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <h2>Deployment unavailable</h2>
          <p className={styles.muted}>
            This record could not be loaded. Please try again in a moment.
          </p>
          <p>
            <Link className={styles.link} href="/admin/deployments">
              Back to deployments
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
