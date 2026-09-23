import Link from "next/link";

import type { DeploymentRow } from "../../../lib/db/schema";
import {
  abbreviateAddress,
  abbreviateTxHash,
  chainLabel,
  enabledFeatureIds,
  explorerAddressUrl,
  explorerTxUrl,
  formatUtc,
  formatWeiTextToBnb,
} from "../../../lib/admin/dashboard/format";
import styles from "../admin.module.css";

/**
 * Phase 7B shared deployment table (server component).
 *
 * Abbreviated values on screen; full canonical values in `title` attributes
 * and explorer links. External links open safely; no contract-source claims.
 */
export function DeploymentTable({ rows }: { rows: DeploymentRow[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.muted}>
          {rows.length === 0
            ? "No deployments"
            : `${rows.length} deployment${rows.length === 1 ? "" : "s"}`}
        </caption>
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Contract</th>
            <th scope="col">Deployer</th>
            <th scope="col">Chain</th>
            <th scope="col">Features</th>
            <th scope="col">Fee</th>
            <th scope="col">Deployed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const contractUrl = explorerAddressUrl(row.chainId, row.contractAddress);
            const deployerUrl = explorerAddressUrl(row.chainId, row.deployerAddress);
            const txUrl = explorerTxUrl(row.chainId, row.txHash);
            const features = enabledFeatureIds(row.featureConfig);
            const fee = formatWeiTextToBnb(row.platformFeeWei);
            return (
              <tr key={row.id}>
                <td>
                  <Link href={`/admin/deployments/${row.id}`} className={styles.rowLink}>
                    <span className={styles.cellMain}>{row.tokenName}</span>
                  </Link>
                  <div className={styles.cellSub}>
                    <span className={styles.mono}>{row.tokenSymbol}</span>
                  </div>
                </td>
                <td>
                  {contractUrl ? (
                    <a
                      href={contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles.mono} ${styles.link} ${styles.extLink}`}
                      title={row.contractAddress}
                    >
                      {abbreviateAddress(row.contractAddress)}
                    </a>
                  ) : (
                    <span className={styles.mono} title={row.contractAddress}>
                      {abbreviateAddress(row.contractAddress)}
                    </span>
                  )}
                  {txUrl ? (
                    <div className={styles.cellSub}>
                      <a
                        href={txUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.mono} ${styles.link} ${styles.extLink}`}
                        title={row.txHash}
                      >
                        tx {abbreviateTxHash(row.txHash)}
                      </a>
                    </div>
                  ) : null}
                </td>
                <td>
                  {deployerUrl ? (
                    <a
                      href={deployerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles.mono} ${styles.link} ${styles.extLink}`}
                      title={row.deployerAddress}
                    >
                      {abbreviateAddress(row.deployerAddress)}
                    </a>
                  ) : (
                    <span className={styles.mono} title={row.deployerAddress}>
                      {abbreviateAddress(row.deployerAddress)}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`${styles.badge} ${styles.badgeTestnet}`}>
                    {chainLabel(row.chainId)}
                  </span>
                  {row.blockNumber !== null && row.blockNumber !== undefined ? (
                    <div className={styles.cellSub}>
                      block <span className={styles.mono}>{row.blockNumber}</span>
                    </div>
                  ) : null}
                </td>
                <td>
                  {features.length === 0 ? (
                    <span className={styles.cellSub}>standard</span>
                  ) : (
                    <span className={styles.badgeRow}>
                      {features.map((id) => (
                        <span key={id} className={styles.badge}>
                          {id}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td>
                  <span className={styles.mono}>
                    {fee === null ? "—" : `${fee} BNB`}
                  </span>
                </td>
                <td>
                  <span className={styles.cellSub}>
                    {row.createdAt ? formatUtc(row.createdAt) : "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
