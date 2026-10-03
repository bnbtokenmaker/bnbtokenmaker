"use client";

import { useEffect, useState } from "react";

import { v1ExplorerAddressUrl } from "../lib/deploy/chains";

/**
 * Shared BscScan source-verification badge (async, non-blocking).
 *
 * Used by the deploy success panel AND the token manager: same states,
 * same copy, same retry semantics — never a divergent second
 * implementation. Mounted only AFTER a known-good deployment context
 * (confirmed receipt on /deploy; resolved deployment record on /manage).
 * On mount it fire-and-forgets POST /api/deployments/verify
 * {chainId, txHash} — the server proves the deployment and submits — then
 * polls the persisted status on a bounded cadence.
 *
 * Verification can only ADD information: it never hides deployment
 * success, and "Verified on BscScan" renders ONLY on authoritative
 * verified state. On-chain provenance ("CREATED WITH BNBTOKENMAKER")
 * lives in the token manager and is never mentioned here.
 */

export type VerificationBadgeState = "checking" | "pending" | "verified" | "failed";

/** POST verify budget: server may perform ~25 reads + upstream calls. */
export const VERIFY_POST_TIMEOUT_MS = 45_000;
/** GET status budget: single upstream check at most. */
export const VERIFY_STATUS_TIMEOUT_MS = 25_000;
export const VERIFY_POLL_INTERVAL_MS = 20_000;
export const VERIFY_MAX_POLLS = 20;

export const VERIFICATION_BADGE_COPY = {
  checking: { title: "Source verification", body: "Checking BscScan…" },
  pending: { title: "Source verification", body: "Verification pending…" },
  verified: { title: "Source verification", body: "Verified on BscScan ✓" },
  failed: { title: "Source verification", body: "Verification needs another try" },
} as const;

/**
 * Bounded fetch for browser runtimes: aborts after timeoutMs (throws a
 * timeout error) and propagates a parent abort signal for unmount
 * cancellation. Uses an explicit AbortController (widely supported);
 * never relies on AbortSignal.timeout.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit | undefined,
  timeoutMs: number,
  parentSignal?: AbortSignal | null
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const onParentAbort = () => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) controller.abort();
    else parentSignal.addEventListener("abort", onParentAbort, { once: true });
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new Error("verification-fetch-timeout");
    throw error;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", onParentAbort);
  }
}

/**
 * Framework-agnostic verification flow runner (fully unit-testable).
 *
 * `submit`/`pollStatus` resolve the server verification status string
 * ("pending" | "verified" | "failed" | other) or null on transport-level
 * failure (timeout, network error, malformed body). Terminal states stop
 * immediately; anything else becomes "pending" with bounded polling.
 * Exhaustion from ANY non-terminal state ends in "failed" so Retry is
 * always reachable — no state can stall forever.
 */
export async function runVerificationFlow(options: {
  submit: () => Promise<string | null>;
  pollStatus: () => Promise<string | null>;
  maxPolls: number;
  pollIntervalMs: number;
  sleep: (ms: number) => Promise<void>;
  onState: (state: VerificationBadgeState) => void;
  isCancelled: () => boolean;
}): Promise<void> {
  const settle = (status: string | null): VerificationBadgeState | null => {
    if (status === "verified") return "verified";
    if (status === "failed") return "failed";
    if (status === "pending") return "pending";
    return null;
  };
  const first = await options.submit();
  if (options.isCancelled()) return;
  const firstState = settle(first);
  if (firstState === "verified" || firstState === "failed") {
    options.onState(firstState);
    return;
  }
  options.onState("pending");
  for (let i = 0; i < options.maxPolls; i += 1) {
    await options.sleep(options.pollIntervalMs);
    if (options.isCancelled()) return;
    const next = await options.pollStatus();
    if (options.isCancelled()) return;
    const nextState = settle(next);
    if (nextState === "verified" || nextState === "failed") {
      options.onState(nextState);
      return;
    }
    options.onState("pending");
  }
  if (!options.isCancelled()) options.onState("failed");
}

export function VerificationBadgeView({
  state,
  explorerUrl,
  showRetry,
  busy,
  onRetry,
}: {
  state: VerificationBadgeState;
  explorerUrl: string | null;
  showRetry: boolean;
  busy: boolean;
  onRetry: () => void;
}) {
  const copy = VERIFICATION_BADGE_COPY[state];
  return (
    <div
      className="deploy-verify"
      role={state === "failed" ? "alert" : "status"}
    >
      <span className="deploy-verify-label">{copy.title}</span>{" "}
      <span className="deploy-verify-state">{copy.body}</span>
      {state === "verified" && explorerUrl ? (
        <>
          {" "}
          <a
            className="linklike"
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on BscScan
          </a>
        </>
      ) : null}
      {showRetry ? (
        <>
          {" "}
          <button
            type="button"
            className="linklike"
            disabled={busy}
            onClick={onRetry}
          >
            Retry verification
          </button>
        </>
      ) : null}
    </div>
  );
}

export function VerificationBadge({
  chainId,
  txHash,
  token,
}: {
  chainId: number;
  txHash: `0x${string}`;
  token: `0x${string}`;
}) {
  const [state, setState] = useState<VerificationBadgeState>("checking");
  const [busy, setBusy] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const explorerUrl = v1ExplorerAddressUrl(chainId, token);
  useEffect(() => {
    let cancelled = false;
    const aborter = new AbortController();
    const readStatus = async (res: Response | null): Promise<string | null> => {
      try {
        const body = res ? ((await res.json().catch(() => null)) as unknown) : null;
        const verification = (
          body as { verification?: { status?: unknown } } | null
        )?.verification;
        // A terminal server rejection is honest failure, not "checking":
        // only retryable/unknown outcomes stay in the recovery posture.
        if (verification && typeof verification === "object") {
          const retryable = (verification as { retryable?: unknown }).retryable;
          if (retryable === false) return "failed";
        }
        const status = (verification as { status?: unknown } | undefined)?.status;
        return typeof status === "string" ? status : null;
      } catch {
        return null;
      }
    };
    const submit = async (): Promise<string | null> => {
      setBusy(true);
      try {
        const res = await fetchWithTimeout(
          "/api/deployments/verify",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ chainId, txHash }),
          },
          VERIFY_POST_TIMEOUT_MS,
          aborter.signal
        );
        return await readStatus(res);
      } catch {
        return null;
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    const pollStatus = async (): Promise<string | null> => {
      try {
        const res = await fetchWithTimeout(
          `/api/deployments/verify?chainId=${chainId}&contractAddress=${token}`,
          undefined,
          VERIFY_STATUS_TIMEOUT_MS,
          aborter.signal
        );
        return await readStatus(res);
      } catch {
        return null;
      }
    };
    void runVerificationFlow({
      submit,
      pollStatus,
      maxPolls: VERIFY_MAX_POLLS,
      pollIntervalMs: VERIFY_POLL_INTERVAL_MS,
      sleep: (ms: number) =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, ms);
        }),
      onState: (next) => {
        if (!cancelled) setState(next);
      },
      isCancelled: () => cancelled,
    });
    return () => {
      cancelled = true;
      aborter.abort();
    };
  }, [chainId, txHash, token, retryNonce]);
  return (
    <VerificationBadgeView
      state={state}
      explorerUrl={explorerUrl}
      showRetry={state === "failed"}
      busy={busy}
      onRetry={() => {
        if (busy) return;
        setBusy(true);
        setRetryNonce((n) => n + 1);
      }}
    />
  );
}
