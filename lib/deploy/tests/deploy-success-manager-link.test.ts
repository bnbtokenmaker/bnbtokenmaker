import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SuccessPanel } from "../../../components/DeployFlow";
import {
  BSC_MAINNET_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
} from "../chains";

/**
 * Regression cover for the C23 defect: after a successful deployment the
 * "Manage Token" CTA was hardcoded to /manage/97/... even for a mainnet
 * deployment, so mainnet owners were dropped onto a testnet manager route.
 *
 * These render the real production SuccessPanel (no duplicated link-building
 * logic) and assert the emitted anchor for both supported chains.
 */

const TOKEN = "0x1234567890abcdef1234567890abcdef12345678";
const TX_HASH = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const noop = () => {};

function renderSuccess(intendedChainId: number, token: string = TOKEN, txHash: string | null = TX_HASH): string {
  return renderToStaticMarkup(
    createElement(SuccessPanel, {
      name: "Sample Token",
      symbol: "SAMPLE",
      token: token as `0x${string}`,
      txHash: txHash as `0x${string}` | null,
      copied: null,
      onCopy: noop,
      onCreateAnother: noop,
      panelRef: null,
      feePaidWei: null,
      features: null,
      intendedChainId,
    })
  );
}

function manageHref(html: string): string | null {
  const match = html.match(/href="(\/manage\/[^"]*)"/);
  return match ? match[1] : null;
}

function explorerHrefs(html: string): string[] {
  return Array.from(html.matchAll(/href="(https:\/\/[^"]*bscscan\.com[^"]*)"/g), (match) => match[1]);
}

describe("deploy success — Manage Token deep link follows intendedChainId", () => {
  it("links a mainnet deployment to /manage/56", () => {
    assert.equal(
      manageHref(renderSuccess(BSC_MAINNET_CHAIN_ID)),
      `/manage/${BSC_MAINNET_CHAIN_ID}/${TOKEN}`
    );
  });

  it("links a testnet deployment to /manage/97", () => {
    assert.equal(
      manageHref(renderSuccess(BSC_TESTNET_CHAIN_ID)),
      `/manage/${BSC_TESTNET_CHAIN_ID}/${TOKEN}`
    );
  });

  it("never hardcodes the testnet manager route on a mainnet deployment", () => {
    const html = renderSuccess(BSC_MAINNET_CHAIN_ID);
    assert.ok(
      !html.includes("/manage/97/"),
      "mainnet success must not emit a /manage/97 route"
    );
    assert.ok(!html.includes("/manage/97"), "no hardcoded testnet route at all");
  });

  it("interpolates the intended chain faithfully (the 56/97 gate is upstream)", () => {
    // SuccessPanel must not second-guess the chain it was handed: every caller
    // resolves intendedChainId through resolveIntendedChainId(), which only
    // ever yields 56 or 97 (covered by intended-chain.test.ts). The link is
    // therefore rendered exactly as resolved, never silently coerced to 97.
    for (const chainId of [BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID]) {
      assert.equal(manageHref(renderSuccess(chainId)), `/manage/${chainId}/${TOKEN}`);
    }
  });

  it("preserves the deployed address verbatim in the link", () => {
    const mixedCase = "0xAbCdEf1234567890aBcDeF1234567890aBcDeF12";
    assert.equal(
      manageHref(renderSuccess(BSC_MAINNET_CHAIN_ID, mixedCase)),
      `/manage/${BSC_MAINNET_CHAIN_ID}/${mixedCase}`
    );
  });

  it("stays a same-tab navigation (no target=_blank on the manager CTA)", () => {
    const html = renderSuccess(BSC_MAINNET_CHAIN_ID);
    const anchor = html.match(/<a[^>]*\/manage\/[^>]*>/);
    assert.ok(anchor, "expected a manager anchor");
    assert.ok(!anchor[0].includes("target="), "manager CTA must not open a new tab");
  });

  it("routes mainnet explorer links to bscscan.com", () => {
    const links = explorerHrefs(renderSuccess(BSC_MAINNET_CHAIN_ID));
    assert.ok(links.includes(`https://bscscan.com/token/${TOKEN}`));
    assert.ok(links.includes(`https://bscscan.com/tx/${TX_HASH}`));
    assert.ok(!links.some((link) => link.includes("testnet.bscscan.com")));
  });

  it("routes testnet explorer links to testnet.bscscan.com", () => {
    const links = explorerHrefs(renderSuccess(BSC_TESTNET_CHAIN_ID));
    assert.ok(links.includes(`https://testnet.bscscan.com/token/${TOKEN}`));
    assert.ok(links.includes(`https://testnet.bscscan.com/tx/${TX_HASH}`));
  });

  it("omits explorer links for malformed deployment values", () => {
    const links = explorerHrefs(renderSuccess(BSC_MAINNET_CHAIN_ID, "0x123", "0x123"));
    assert.deepEqual(links, []);
  });
});
