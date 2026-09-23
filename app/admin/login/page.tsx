import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authenticateAdmin } from "../../../lib/admin/service";
import { ADMIN_SESSION_COOKIE } from "../../../lib/admin/session";
import { getAdminStores } from "../../../lib/admin/stores";
import styles from "../admin.module.css";
import { LoginForm } from "./form";

/** Phase 7A admin sign-in. Already-authenticated sessions skip to /admin. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin sign in — BNB Token Maker",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? null;
  try {
    await authenticateAdmin(token, getAdminStores());
    redirect("/admin");
  } catch {
    // Not authenticated: render the sign-in form below.
  }

  return (
    <div className={styles.admin}>
      <div className={`${styles.container} ${styles.loginWrap}`}>
        <header className={styles.pageHead}>
          <div className={styles.kicker}>
            <span className={styles.dot}></span>Site administration
          </div>
          <h1>Admin sign in</h1>
          <p>Restricted area. If you are not the site operator, please leave.</p>
        </header>
        <div className={styles.loginCard}>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
