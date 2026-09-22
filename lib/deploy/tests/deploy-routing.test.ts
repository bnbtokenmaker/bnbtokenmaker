import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SummaryActions } from "../../../components/CreateBuilder";
import { DeployPage, isUsableDeployDraft } from "../../../components/DeployPage";
import {
  PRODUCT_PRICE_LABEL,
  shouldScrollToSuccess,
} from "../../../components/DeployFlow";

const noop = () => {};

function renderActions(
  overrides: Partial<Parameters<typeof SummaryActions>[0]> = {}
): string {
  return renderToStaticMarkup(
    createElement(SummaryActions, {
      walletConnected: true,
      needsNetworkSwitch: false,
      connectorName: "MetaMask",
      walletAddrText: "0x8d32\u20259990",
      eligible: false,
      wrongChainLabel: null,
      onConnect: noop,
      onOpenAccount: noop,
      ...overrides,
    })
  );
}

describe("deploy routing — /create continuation CTA", () => {
  it("enables Create Token only when the caller allows continuation", () => {
    const enabled = renderActions({ canContinue: true, onContinue: noop });
    assert.ok(enabled.includes('id="createBtn"'));
    assert.ok(!enabled.includes("disabled"));
    const blocked = renderActions({ canContinue: false });
    assert.ok(blocked.includes("disabled"));
  });

  it("stays a same-tab action: no new tab, window, or popup behavior", () => {
    const html = renderActions({ canContinue: true, onContinue: noop });
    assert.ok(!html.includes("target="));
    assert.ok(!html.includes("window.open"));
    assert.ok(!html.includes("_blank"));
  });

  it("explains the next step instead of implying deployment here", () => {
    assert.ok(
      renderActions({ canContinue: true }).includes("Ready — continue to review and deploy.")
    );
    assert.ok(
      renderActions({ canContinue: false }).includes("Complete the token details above to continue.")
    );
  });
});

describe("deploy polish — terminology and success announcement", () => {
  it("labels the server quote as product price, never Standard", () => {
    assert.equal(PRODUCT_PRICE_LABEL, "Product price (server quote)");
    assert.ok(!PRODUCT_PRICE_LABEL.includes("Standard"));
  });

  it("announces success for scroll/focus only once per confirmed hash", () => {
    const hash =
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    assert.equal(shouldScrollToSuccess("success", hash, null), true);
    assert.equal(shouldScrollToSuccess("success", hash, hash), false);
    assert.equal(shouldScrollToSuccess("success", null, null), false);
    assert.equal(shouldScrollToSuccess("confirming", hash, null), false);
    assert.equal(shouldScrollToSuccess("error", hash, null), false);
    assert.equal(shouldScrollToSuccess("idle", null, null), false);
  });
});

describe("deploy routing — /deploy entry gate", () => {
  it("accepts only present, domain-valid drafts (missing/malformed/invalid rejected)", () => {
    const good = {
      version: 1,
      name: "Maker",
      symbol: "MAKER",
      decimals: "18",
      supply: "1,000,000",
      feats: {
        burn: false,
        mint: true,
        pause: false,
        maxTx: false,
        maxWallet: false,
        blacklist: false,
        whitelist: false,
      },
      maxTxPercent: "1",
      maxWalletPercent: "2",
      savedAt: 1,
    };
    assert.equal(isUsableDeployDraft(good), true);
    assert.equal(isUsableDeployDraft(null), false);
    assert.equal(isUsableDeployDraft(undefined), false);
    assert.equal(isUsableDeployDraft("corrupt-string"), false);
    assert.equal(isUsableDeployDraft({ version: 999 }), false);
    assert.equal(isUsableDeployDraft({ ...good, supply: "0" }), false);
    assert.equal(
      isUsableDeployDraft({
        ...good,
        feats: { ...good.feats, blacklist: true, whitelist: true },
      }),
      false
    );
  });

  it("renders a minimal loading state — never a transaction — before the gate resolves", () => {
    // Node has no sessionStorage, so the static render exercises the
    // pre-resolution branch (the client effect replaces to /create).
    const html = renderToStaticMarkup(createElement(DeployPage));
    assert.ok(html.includes("Preparing your deployment"));
    assert.ok(html.includes("Return to Create Token"));
    assert.ok(html.includes('href="/create"'));
    assert.ok(!html.includes("No token configuration found"));
    // No transaction path renders without a usable draft.
    assert.ok(!html.includes("Deploy token"));
    assert.ok(!html.includes("data-deploy-phase"));
    assert.ok(!html.includes("_blank"));
  });

  it("styles Edit token as a secondary button that preserves the draft", () => {
    const html = renderToStaticMarkup(createElement(DeployPage));
    assert.ok(html.includes("btn btn-ghost deploy-back"));
    assert.ok(html.includes("Edit token"));
    assert.ok(html.includes('href="/create"'));
    assert.ok(!html.includes("btn-primary deploy-back"));
  });
});

describe("deploy routing — shared chrome is navigation-independent", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const readApp = (rel: string): string =>
    readFileSync(join(here, "..", "..", "..", "app", rel), "utf8");

  it("/deploy explicitly loads the shared site shell (no /create visit needed)", () => {
    const page = readApp(join("deploy", "page.tsx"));
    assert.ok(page.includes("site-chrome.css"));
  });

  it("the shared shell styles body, header, footer, and buttons", () => {
    const chrome = readApp("site-chrome.css");
    for (const selector of [
      "body{",
      ".site-header{",
      ".nav-links",
      ".nav-toggle",
      ".footer{",
      ".footer-grid",
      ".btn{",
      ".btn-primary",
      ".container{",
    ]) {
      assert.ok(chrome.includes(selector), `missing ${selector}`);
    }
  });
});
