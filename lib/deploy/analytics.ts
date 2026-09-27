/**
 * Phase 7D-E2 internal GA4 events (pure builders + guarded sender).
 *
 * Privacy: event payloads carry feature ids, chain ids and outcome codes
 * ONLY — never private keys, signatures, full wallet payloads, addresses,
 * or raw provider errors. The sender no-ops without a gtag implementation,
 * and callers deduplicate by key (no duplicate events on rerender — events
 * fire from explicit user-action handlers, never from render effects).
 */

export type CreateAnalyticsEvent =
  | { name: "create_started" }
  | { name: "feature_selected"; feature: string; enabled: boolean }
  | { name: "deployment_reviewed"; features: readonly string[] }
  | { name: "authorization_requested"; features: readonly string[] }
  | { name: "authorization_received"; chainId: number }
  | { name: "authorization_expired" }
  | { name: "deployment_submitted"; chainId: number }
  | { name: "deployment_confirmed"; chainId: number }
  | { name: "deployment_failed"; code: string };

export function buildAnalyticsParams(
  event: CreateAnalyticsEvent
): Record<string, unknown> {
  switch (event.name) {
    case "create_started":
      return {};
    case "feature_selected":
      return { feature: event.feature, enabled: event.enabled ? "1" : "0" };
    case "deployment_reviewed":
    case "authorization_requested":
      return { features: event.features.join(",") };
    case "authorization_received":
    case "deployment_submitted":
    case "deployment_confirmed":
      return { chain_id: event.chainId };
    case "authorization_expired":
      return {};
    case "deployment_failed":
      return { code: event.code };
  }
}

export type GtagLike = (
  command: string,
  eventName: string,
  params?: Record<string, unknown>
) => void;

/** Fire-and-forget sender. No-ops without gtag; never throws. */
export function trackCreateEvent(
  event: CreateAnalyticsEvent,
  gtag?: GtagLike | undefined
): void {
  try {
    gtag?.("event", event.name, buildAnalyticsParams(event));
  } catch {
    /* analytics must never break the flow */
  }
}
