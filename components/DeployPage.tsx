"use client";

/**
 * /deploy route client: loads the session draft carried over from /create,
 * revalidates it through the token domain rules, and renders the (unchanged)
 * Phase 6C deployment engine. Transport state is never trusted.
 *
 * Workflow gate (client-side, same tab):
 * - valid draft            → render /deploy normally (refresh-safe: the same
 *                            tab-scoped sessionStorage survives reloads);
 * - missing / malformed / domain-invalid draft → clear the stored value and
 *   router.replace("/create"), so Back never bounces into a dead /deploy
 *   and no transaction path ever renders without a valid draft.
 *
 * The gate reads storage directly in a mount effect (never window.open,
 * never a second transaction — the deploy action stays strictly
 * event-driven), while rendering stays hydration-safe via useSyncExternalStore.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { DeployFlow } from "./DeployFlow";
import {
  clearDeployDraft,
  draftDomainValid,
  loadDeployDraft,
  type DeployDraftV1,
} from "../lib/deploy/draft-transfer";

function subscribeDraft(): () => void {
  // The draft is written only during navigation (same-tab push to /deploy),
  // so no live subscription is needed; the snapshot is read per mount.
  return () => {};
}

function getDraftServerSnapshot(): DeployDraftV1 | null {
  return null;
}

/**
 * Hydration-safe draft read: the server prerender sees null (loading), the
 * client hydrates against the same null snapshot and then syncs to the
 * session draft without a hydration mismatch.
 */
function useDeployDraft(): DeployDraftV1 | null {
  const cached = useMemo(() => loadDeployDraft(), []);
  const getSnapshot = useCallback(() => cached, [cached]);
  return useSyncExternalStore(subscribeDraft, getSnapshot, getDraftServerSnapshot);
}

/**
 * Workflow entry decision, shared by the gate effect and tests:
 * only a present AND domain-valid draft may use /deploy.
 */
export function isUsableDeployDraft(stored: unknown): stored is DeployDraftV1 {
  return stored !== null && draftDomainValid(stored as DeployDraftV1);
}

export function DeployPage() {
  const draft = useDeployDraft();
  const valid = draft !== null && draftDomainValid(draft);

  useEffect(() => {
    // Edge-entry gate only (missing/malformed/invalid draft): replace to
    // /create with history-replace semantics so Back never bounces into a
    // dead /deploy. window.location is used deliberately instead of
    // useRouter: this path must stay statically renderable/testable and can
    // never depend on router context. Same tab, no new window, and the
    // deploy action stays strictly event-driven (no transaction here).
    if (typeof window === "undefined") return;
    if (!isUsableDeployDraft(loadDeployDraft())) {
      clearDeployDraft();
      window.location.replace("/create");
    }
  }, []);

  return (
    <section className="app" id="top">
      <div className="container">
        <Link className="btn btn-ghost deploy-back" href="/create">
          <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>Edit token
        </Link>
        <header className="app-head">
          <div className="kicker">
            <span className="dot"></span>Review &amp; Deploy
          </div>
          <h1>Review your token, then deploy it.</h1>
          <p className="intro">
            Check everything once — limits can&apos;t change later. Your wallet will ask you to
            confirm one transaction on BNB Smart Chain Testnet.
          </p>
        </header>

        {valid && draft ? (
          <DeployFlow
            tokenName={draft.name}
            tokenSymbol={draft.symbol}
            decimals={draft.decimals}
            supply={draft.supply}
            feats={draft.feats}
            maxTxPercent={draft.maxTxPercent}
            maxWalletPercent={draft.maxWalletPercent}
          />
        ) : (
          <div className="deploy-card" role="status" aria-live="polite">
            <h3>Preparing your deployment…</h3>
            <p className="deploy-muted">
              Checking your token setup. Nothing is deployed and no transaction is sent from
              this screen without a valid configuration.
            </p>
            <Link className="btn btn-ghost" href="/create">
              Return to Create Token
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
