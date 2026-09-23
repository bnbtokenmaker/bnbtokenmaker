import Link from "next/link";

import styles from "../../admin.module.css";

/** Admin deployment 404: unknown record id (authenticated shell context). */
export default function AdminDeploymentNotFound() {
  return (
    <div className={styles.admin}>
      <div className={`${styles.container} ${styles.main}`}>
        <div className={styles.card}>
          <div className={styles.empty}>
            <h2>Deployment not found</h2>
            <p>
              No deployment record exists with this identifier. It may never
              have been recorded.
            </p>
            <p>
              <Link href="/admin/deployments" className={styles.link}>
                Back to deployments
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
