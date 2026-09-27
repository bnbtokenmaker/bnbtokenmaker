/**
 * Phase 7D-E3 manager analytics (pure builders + guarded sender).
 *
 * Privacy: only categorical metadata (action type, chain, own-token vs
 * external, feature category). Never signatures, addresses, raw provider
 * errors, or wallet payloads. Events fire from explicit handlers with
 * caller-side dedup keys — never from render effects.
 */

export type ManagerAnalyticsEvent =
  | { name: "manager_opened"; chainId: number }
  | { name: "token_inspected"; chainId: number; kind: string }
  | { name: "manager_action_started"; action: string; kind: string }
  | { name: "manager_action_submitted"; action: string; chainId: number }
  | { name: "manager_action_confirmed"; action: string; chainId: number }
  | { name: "manager_action_failed"; action: string; code: string };

export function buildManagerAnalyticsParams(
  event: ManagerAnalyticsEvent
): Record<string, unknown> {
  switch (event.name) {
    case "manager_opened":
      return { chain_id: event.chainId };
    case "token_inspected":
      return { chain_id: event.chainId, kind: event.kind };
    case "manager_action_started":
      return { action: event.action, kind: event.kind };
    case "manager_action_submitted":
    case "manager_action_confirmed":
      return { action: event.action, chain_id: event.chainId };
    case "manager_action_failed":
      return { action: event.action, code: event.code };
  }
}

export type ManagerGtagLike = (
  command: string,
  eventName: string,
  params?: Record<string, unknown>
) => void;

/** Fire-and-forget sender. No-ops without gtag; never throws. */
export function trackManagerEvent(
  event: ManagerAnalyticsEvent,
  gtag?: ManagerGtagLike | undefined
): void {
  try {
    gtag?.("event", event.name, buildManagerAnalyticsParams(event));
  } catch {
    /* analytics must never break the flow */
  }
}
