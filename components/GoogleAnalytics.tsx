"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";

declare global {
  interface Window {
    gtag?: (
      command: string,
      id: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

/**
 * Google Analytics 4 integration.
 *
 * - Rendered globally from the root layout; renders nothing when the
 *   measurement ID is missing/invalid, so the app works unchanged.
 * - `@next/third-parties` `GoogleAnalytics` injects the gtag loader and the
 *   initial `gtag('config', id)`, which sends the first page_view.
 * - That integration does NOT track App Router client-side navigations, so
 *   `NavigationPageViews` sends exactly one `page_view` per subsequent
 *   navigation (initial mount is skipped — no duplicate page_view).
 */
function NavigationPageViews({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? "";
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      // Initial page_view was already sent by gtag('config', ...).
      isFirstRender.current = false;
      return;
    }
    window.gtag?.("config", gaId, {
      page_path: query ? `${pathname}?${query}` : pathname,
    });
  }, [pathname, query, gaId]);

  return null;
}

/** Fail-safe GA mount: returns null unless gaId is a plausible GA4 ID. */
export function GoogleAnalytics({ gaId }: { gaId?: string }) {
  const id = (gaId ?? "").trim();
  if (!/^G-[A-Za-z0-9-]{4,40}$/.test(id)) return null;
  return (
    <>
      <NextGoogleAnalytics gaId={id} />
      <Suspense fallback={null}>
        <NavigationPageViews gaId={id} />
      </Suspense>
    </>
  );
}
