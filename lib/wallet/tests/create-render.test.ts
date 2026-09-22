import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SummaryActions } from "../../../components/CreateBuilder";
import {
  NetStatePill,
  netStateForStatus,
} from "../../../components/wallet/NetState";

const noop = () => {};

function renderSummary(
  overrides: Partial<Parameters<typeof SummaryActions>[0]> = {}
): string {
  return renderToStaticMarkup(
    createElement(SummaryActions, {
      walletConnected: false,
      needsNetworkSwitch: false,
      connectorName: null,
      walletAddrText: "",
      eligible: false,
      wrongChainLabel: null,
      onConnect: noop,
      onOpenAccount: noop,
      ...overrides,
    })
  );
}

/**
 * Rendered-output regression coverage for the real-Chrome failure state:
 *   MetaMask eth_chainId = 0x1, session = none, connector = disconnected
 * must render the disconnected banner/summary — never BSC Connected — and
 * the connected-on-Ethereum state must render Wrong Network with the switch
 * CTA and an ineligible Create Token. Asserts actual markup, not helpers.
 */
describe("create page — banner pill mapping", () => {
  it("maps only live-verified mainnet to connected", () => {
    assert.equal(netStateForStatus("mainnet"), "connected");
    assert.equal(netStateForStatus("testnet"), "testnet");
    assert.equal(netStateForStatus("wrong"), "wrong");
    assert.equal(netStateForStatus("disconnected"), "disconnected");
  });

  it("renders the disconnected pill without any Connected claim", () => {
    const html = renderToStaticMarkup(
      createElement(NetStatePill, { state: "disconnected" })
    );
    assert.ok(html.includes('data-netstate="disconnected"'));
    assert.ok(!html.includes('data-netstate="connected"'));
    assert.ok(!html.includes("Connected"));
  });

  it("renders the wrong-network pill without any Connected claim", () => {
    const html = renderToStaticMarkup(
      createElement(NetStatePill, { state: "wrong" })
    );
    assert.ok(html.includes('data-netstate="wrong"'));
    assert.ok(!html.includes("Connected"));
  });

  it("renders the connected pill only for the verified-mainnet state", () => {
    const html = renderToStaticMarkup(
      createElement(NetStatePill, { state: "connected" })
    );
    assert.ok(html.includes('data-netstate="connected"'));
  });
});

describe("create page — deployment summary for the exact failure state", () => {
  it("disconnected + no session renders Connect, ineligible, no warn, no switch", () => {
    const html = renderSummary();
    assert.ok(html.includes("Connect Wallet"));
    assert.ok(html.includes('data-deploy-eligible="false"'));
    assert.ok(html.includes("Connect your wallet to continue."));
    assert.ok(!html.includes("Switch network in your wallet"));
    assert.ok(!html.includes("sumNetWarn"));
    assert.ok(!html.includes("sum-wallet"));
    assert.ok(!html.includes("Wrong network"));
  });

  it("connected on Ethereum renders Wrong Network + manual-switch info, ineligible", () => {
    const html = renderSummary({
      walletConnected: true,
      needsNetworkSwitch: true,
      connectorName: "MetaMask",
      walletAddrText: "0x8d32\u20259990",
      wrongChainLabel: "Ethereum",
    });
    assert.ok(html.includes("Switch network in your wallet"));
    // The removed automatic CTA must not render as an action.
    assert.ok(!html.includes(">Switch to BNB Smart Chain<"));
    assert.ok(html.includes('id="sumNetWarn"'));
    assert.ok(html.includes("Wrong network"));
    assert.ok(
      html.includes(
        "Your wallet is connected to Ethereum. Switch to BNB Smart Chain in your wallet to continue."
      )
    );
    assert.ok(html.includes("Wrong Network"));
    assert.ok(html.includes("Ethereum"));
    assert.ok(html.includes('data-deploy-eligible="false"'));
    assert.ok(!html.includes("sum-wallet"));
  });

  it("manual-switch explanation opens on demand and sends no transaction", () => {
    const closed = renderSummary({
      walletConnected: true,
      needsNetworkSwitch: true,
      wrongChainLabel: "Ethereum",
    });
    assert.ok(
      !closed.includes("set the network for this site to BNB Smart Chain")
    );
    const open = renderSummary({
      walletConnected: true,
      needsNetworkSwitch: true,
      wrongChainLabel: "Ethereum",
      forceShowHelp: true,
    });
    assert.ok(
      open.includes(
        "Open your wallet and set the network for this site to BNB Smart Chain (BSC)"
      )
    );
    assert.ok(
      open.includes("separate network for each site")
    );
    assert.ok(open.includes('data-deploy-eligible="false"'));
  });

  it("documents the single legitimate connected rendering (verified mainnet)", () => {
    const html = renderSummary({
      walletConnected: true,
      needsNetworkSwitch: false,
      eligible: true,
      connectorName: "MetaMask",
      walletAddrText: "0x8d32\u20259990",
    });
    assert.ok(html.includes("sum-wallet"));
    assert.ok(html.includes("MetaMask"));
    assert.ok(html.includes('data-deploy-eligible="true"'));
    assert.ok(!html.includes("Switch network in your wallet"));
    assert.ok(!html.includes("sumNetWarn"));
  });
});
