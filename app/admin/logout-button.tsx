"use client";

/**
 * Phase 7A admin logout button (client).
 *
 * POSTs to the revocation endpoint, then navigates to the login screen.
 * No credentials ever touch localStorage/sessionStorage — the session
 * lives only in its HttpOnly cookie, cleared server-side on logout.
 */

import { useState } from "react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Revocation is best-effort here; the cookie is cleared server-side
      // and navigation always proceeds.
    } finally {
      window.location.replace("/admin/login");
    }
  }

  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => void onLogout()}
      disabled={busy}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
