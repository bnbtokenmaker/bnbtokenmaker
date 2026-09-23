import Link from "next/link";

import { LogoutButton } from "../logout-button";
import styles from "../admin.module.css";

/**
 * Phase 7B shared admin chrome (server component).
 *
 * Rendered ONLY after the page has authenticated the session at the server
 * boundary — it receives the already-verified identifier as a prop and never
 * touches cookies, tokens, or the database itself.
 */
export function AdminShell({
  identifier,
  active,
  children,
}: {
  identifier: string;
  active: "overview" | "deployments";
  children: React.ReactNode;
}) {
  return (
    <div className={styles.admin}>
      <div className={styles.topbar}>
        <div className={`${styles.container} ${styles.topbarInner}`}>
          <span className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              B
            </span>
            BNB Token Maker
          </span>
          <span className={styles.brandSub}>Admin Dashboard</span>
          <span className={styles.topbarSpacer} />
          <span className={styles.account}>
            Signed in as <code>{identifier}</code>
          </span>
          <LogoutButton />
        </div>
      </div>
      <nav className={styles.nav} aria-label="Admin sections">
        <div className={styles.container} style={{ display: "flex", gap: ".35rem" }}>
          <Link
            href="/admin"
            className={styles.navLink}
            aria-current={active === "overview" ? "page" : undefined}
          >
            Overview
          </Link>
          <Link
            href="/admin/deployments"
            className={styles.navLink}
            aria-current={active === "deployments" ? "page" : undefined}
          >
            Deployments
          </Link>
        </div>
      </nav>
      <main className={`${styles.container} ${styles.main}`}>{children}</main>
    </div>
  );
}
