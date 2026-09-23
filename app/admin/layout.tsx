import type { ReactNode } from "react";

import "../site-chrome.css";

/**
 * Phase 7B admin segment layout.
 *
 * Declares the shared site-chrome dependency EXPLICITLY for every /admin
 * route. The root layout renders the global <Header /> and <Footer /> on
 * admin pages, so their styles must be a declared import of this segment —
 * previously they arrived only incidentally via the shared CSS chunk pulled
 * in by app/not-found.tsx, which made admin chrome silently dependent on an
 * unrelated file's imports (production incident: header/footer rendered
 * unstyled when that incidental sharing was disturbed).
 *
 * Next.js deduplicates the identical site-chrome.css module, so this adds no
 * bytes: admin HTML keeps referencing the same shared chunk hash.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
