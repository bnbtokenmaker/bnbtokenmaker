import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authenticateAdmin } from "../../lib/admin/service";
import { ADMIN_SESSION_COOKIE } from "../../lib/admin/session";
import { getAdminStores } from "../../lib/admin/stores";
import { LogoutButton } from "./logout-button";

/**
 * Phase 7A protected admin shell (minimal — NOT the dashboard).
 *
 * Authorization happens HERE at the server boundary: the session cookie is
 * validated against the DB-backed session store before ANY admin content
 * renders. Unauthenticated requests never receive admin data in HTML or in
 * RSC payloads — they are redirected to /admin/login.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — BNB Token Maker",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? null;
  let identifier: string;
  try {
    const admin = await authenticateAdmin(token, getAdminStores());
    identifier = admin.identifier;
  } catch {
    redirect("/admin/login");
  }

  return (
    <section className="app" id="top">
      <div className="container">
        <header className="app-head">
          <div className="kicker">
            <span className="dot"></span>Site administration
          </div>
          <h1>BNB Token Maker Admin</h1>
          <p className="intro">Authenticated session active.</p>
        </header>
        <div className="deploy-card" role="status">
          <h3>Signed in</h3>
          <p className="deploy-muted">
            Session for <code className="mono">{identifier}</code>. The full
            management dashboard arrives in Phase 7B.
          </p>
          <LogoutButton />
        </div>
      </div>
    </section>
  );
}
