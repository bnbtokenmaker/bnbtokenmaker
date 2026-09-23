import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authenticateAdmin } from "../../../lib/admin/service";
import { ADMIN_SESSION_COOKIE } from "../../../lib/admin/session";
import { getAdminStores } from "../../../lib/admin/stores";
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
    <section className="app" id="top">
      <div className="container">
        <header className="app-head">
          <div className="kicker">
            <span className="dot"></span>Site administration
          </div>
          <h1>Admin sign in</h1>
          <p className="intro">
            Restricted area. If you are not the site operator, please leave.
          </p>
        </header>
        <div className="deploy-card">
          <LoginForm />
        </div>
      </div>
    </section>
  );
}
