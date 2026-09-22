"use client";

/**
 * /deploy route client: loads the session draft carried over from /create,
 * revalidates it through the token domain rules, and renders the (unchanged)
 * Phase 6C deployment engine. Transport state is never trusted: an absent,
 * malformed, or domain-invalid draft fails closed — no transaction path.
 */

import Link from "next/link";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import { DeployFlow } from "./DeployFlow";
import {
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
 * Hydration-safe draft read: the server prerender sees null (fail-closed),
 * the client hydrates against the same null snapshot and then syncs to the
 * session draft without a hydration mismatch.
 */
function useDeployDraft(): DeployDraftV1 | null {
  const cached = useMemo(() => loadDeployDraft(), []);
  const getSnapshot = useCallback(() => cached, [cached]);
  return useSyncExternalStore(subscribeDraft, getSnapshot, getDraftServerSnapshot);
}

export function DeployPage() {
  const draft = useDeployDraft();
  const valid = draft !== null && draftDomainValid(draft);

  return (
    <section className="app" id="top">
      <div className="container">
        <Link className="deploy-back" href="/create">
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
          <div className="deploy-card" role="alert">
            <h3>No token configuration found</h3>
            <p className="deploy-muted">
              Your token setup didn&apos;t carry over to this page. Nothing was deployed and no
              transaction was sent.
            </p>
            <Link className="btn btn-primary" href="/create">
              Return to Create Token
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
