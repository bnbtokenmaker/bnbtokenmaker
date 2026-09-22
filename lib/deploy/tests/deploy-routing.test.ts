import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SummaryActions } from "../../../components/CreateBuilder";
import { DeployPage } from "../../../components/DeployPage";
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

describe("deploy routing — /deploy without a draft fails closed", () => {
  it("shows no-deploy UI with a same-tab return link (node has no sessionStorage)", () => {
    const html = renderToStaticMarkup(createElement(DeployPage));
    assert.ok(html.includes("No token configuration found"));
    assert.ok(html.includes("Return to Create Token"));
    assert.ok(html.includes('href="/create"'));
    // No transaction path renders without a draft.
    assert.ok(!html.includes("Deploy token"));
    assert.ok(!html.includes("data-deploy-phase"));
    assert.ok(!html.includes("_blank"));
  });
});
