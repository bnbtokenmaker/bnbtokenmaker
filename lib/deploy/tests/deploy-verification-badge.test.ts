import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SuccessPanel,
  VERIFICATION_BADGE_COPY,
  VerificationBadge,
  VerificationBadgeView,
} from "../../../components/DeployFlow";
import {
  BSC_MAINNET_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
} from "../chains";

/**
 * Verification-badge UI tests. The stateful badge performs its POST/poll
 * cycle in effects (never during render), so static renders prove the
 * initial non-blocking UI; the presentational view proves every state.
 */

const TOKEN = "0x1234567890abcdef1234567890abcdef12345678";
const TX_HASH =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;

const noop = () => {};

function renderSuccess(): string {
  return renderToStaticMarkup(
    createElement(SuccessPanel, {
      name: "Sample Token",
      symbol: "SAMPLE",
      token: TOKEN as `0x${string}`,
      txHash: TX_HASH,
      copied: null,
      onCopy: noop,
      onCreateAnother: noop,
      panelRef: null,
      feePaidWei: null,
      features: null,
      intendedChainId: BSC_MAINNET_CHAIN_ID,
    })
  );
}

function renderView(
  state: "checking" | "pending" | "verified" | "failed",
  explorerUrl: string | null = null,
  showRetry = false
): string {
  return renderToStaticMarkup(
    createElement(VerificationBadgeView, { state, explorerUrl, showRetry, onRetry: noop })
  );
}

describe("verification badge — honest states", () => {
  it("renders the checking state on mount without blocking success", () => {
    const html = renderToStaticMarkup(
      createElement(VerificationBadge, {
        chainId: BSC_MAINNET_CHAIN_ID,
        txHash: TX_HASH,
        token: TOKEN as `0x${string}`,
      })
    );
    assert.ok(html.includes("Checking BscScan…"));
    assert.ok(!html.includes("Verified on BscScan"));
  });

  it("renders pending without ever claiming verified", () => {
    const html = renderView("pending");
    assert.ok(html.includes("Pending"));
    assert.ok(!html.includes("Verified on BscScan"));
    assert.ok(!html.includes("Retry"));
  });

  it("renders verified only with the chain-aware BscScan link", () => {
    const url = `https://bscscan.com/address/${TOKEN}`;
    const html = renderView("verified", url);
    assert.ok(html.includes("Verified on BscScan"));
    assert.ok(html.includes(`href="${url}"`));
    assert.ok(!html.includes("Retry"));
  });

  it("renders failed with an explicit retry", () => {
    const html = renderView("failed", null, true);
    assert.ok(html.includes("Verification needs another try"));
    assert.ok(html.includes("Retry"));
    assert.ok(!html.includes("Verified on BscScan"));
  });

  it("keeps provenance and BscScan verification separate", () => {
    for (const state of ["checking", "pending", "verified", "failed"] as const) {
      const html = renderView(state, `https://bscscan.com/address/${TOKEN}`, true);
      assert.ok(!html.includes("BNBTOKENMAKER"), state);
      assert.ok(!html.includes("provenance"), state);
    }
  });

  it("uses the required copy", () => {
    assert.equal(VERIFICATION_BADGE_COPY.checking.body, "Checking BscScan…");
    assert.equal(VERIFICATION_BADGE_COPY.pending.body, "Pending");
    assert.equal(VERIFICATION_BADGE_COPY.verified.body, "Verified on BscScan");
    assert.equal(VERIFICATION_BADGE_COPY.failed.body, "Verification needs another try");
  });
});

describe("verification badge — success integration", () => {
  it("success panel mounts the badge without hiding deployment success", () => {
    const html = renderSuccess();
    assert.ok(html.includes("Token deployed"));
    assert.ok(html.includes("Checking BscScan…"));
  });

  it("badge links use the canonical chain-aware explorer helper", () => {
    const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const source = readFileSync(join(ROOT, "components/DeployFlow.tsx"), "utf8");
    assert.ok(source.includes("v1ExplorerAddressUrl(chainId, token)"));
    const start = source.indexOf("export function VerificationBadge({");
    const end = source.indexOf("\nexport ", start + 10);
    const badgeRegion = source.slice(start, end === -1 ? undefined : end);
    assert.ok(!badgeRegion.includes("bscscan.com"), "badge must not hardcode an explorer host");
    assert.ok(!badgeRegion.includes("testnet"), "badge must not name a testnet host");
  });

  it("badge posts only chainId and txHash (structural)", () => {
    const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const source = readFileSync(join(ROOT, "components/DeployFlow.tsx"), "utf8");
    assert.ok(source.includes('"/api/deployments/verify"'));
    assert.ok(source.includes("JSON.stringify({ chainId, txHash })"));
  });

  it("badge polls on a bounded cadence", () => {
    const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const source = readFileSync(join(ROOT, "components/DeployFlow.tsx"), "utf8");
    assert.ok(source.includes("VERIFY_MAX_POLLS"));
    assert.ok(source.includes("VERIFY_POLL_INTERVAL_MS"));
    assert.ok(!/while\s*\(\s*true/.test(source));
  });

  it("testnet success still routes its own chain", () => {
    const html = renderToStaticMarkup(
      createElement(SuccessPanel, {
        name: "Sample Token",
        symbol: "SAMPLE",
        token: TOKEN as `0x${string}`,
        txHash: TX_HASH,
        copied: null,
        onCopy: noop,
        onCreateAnother: noop,
        panelRef: null,
        feePaidWei: null,
        features: null,
        intendedChainId: BSC_TESTNET_CHAIN_ID,
      })
    );
    assert.ok(html.includes("Checking BscScan…"));
  });
});
