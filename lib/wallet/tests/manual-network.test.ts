import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BNB_MAINNET_CHAIN_ID, BNB_TESTNET_CHAIN_ID } from "../chains";
import {
  classifyWalletNetwork,
  resolveDisplayNetwork,
  walletDeploymentEligibility,
} from "../network";
import { parseChainId } from "../switch";

const ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ETH_HEX = "0x1";
const BASE_HEX = "0x2105";
const BSC_HEX = "0x38";
const MM_UID = "test-connector-uid";

function eligibilityFor(chainId: number | null) {
  return walletDeploymentEligibility({
    isConnected: true,
    address: ADDRESS,
    chainId,
  });
}

/**
 * Manual-network-change UX (Phase 6A): the app never requests a chain change.
 * Users switch inside their wallet; the app observes the live provider via
 * `eth_chainId` / `chainChanged` and only renders Connected on a verified 56.
 */
describe("manual network change — observed states", () => {
  it("1. disconnected renders Not connected and stays ineligible", () => {
    const display = resolveDisplayNetwork({
      wagmiConnected: false,
      connectorUid: null,
      sessionValid: false,
      verifiedUid: null,
      liveChainId: null,
    });
    assert.equal(display.status, "disconnected");
    assert.equal(display.chainId, null);
    assert.deepEqual(
      walletDeploymentEligibility({
        isConnected: false,
        address: ADDRESS,
        chainId: display.chainId,
      }),
      { eligible: false, reason: "disconnected" }
    );
  });

  it("2. connected on Ethereum renders Wrong Network and stays ineligible", () => {
    const chainId = parseChainId(ETH_HEX);
    assert.equal(chainId, 1);
    assert.equal(classifyWalletNetwork(true, chainId), "wrong");
    assert.deepEqual(eligibilityFor(chainId), {
      eligible: false,
      reason: "wrong-network",
    });
  });

  it("3. connected on Base renders Wrong Network and stays ineligible", () => {
    const chainId = parseChainId(BASE_HEX);
    assert.equal(chainId, 8453);
    assert.equal(classifyWalletNetwork(true, chainId), "wrong");
    assert.deepEqual(eligibilityFor(chainId), {
      eligible: false,
      reason: "wrong-network",
    });
  });

  it("4. manual chainChanged Ethereum -> 56 becomes Connected and eligible", () => {
    const seen: string[] = [];
    for (const raw of [ETH_HEX, BSC_HEX]) {
      const id = parseChainId(raw);
      assert.ok(typeof id === "number");
      seen.push(classifyWalletNetwork(true, id));
    }
    assert.deepEqual(seen, ["wrong", "mainnet"]);
    const display = resolveDisplayNetwork({
      wagmiConnected: true,
      connectorUid: MM_UID,
      sessionValid: true,
      verifiedUid: MM_UID,
      liveChainId: BNB_MAINNET_CHAIN_ID,
    });
    assert.equal(display.status, "mainnet");
    assert.deepEqual(eligibilityFor(display.chainId), {
      eligible: true,
      chainId: BNB_MAINNET_CHAIN_ID,
    });
  });

  it("5. manual chainChanged 56 -> Ethereum becomes Wrong Network, ineligible", () => {
    const seen: string[] = [];
    for (const raw of [BSC_HEX, ETH_HEX]) {
      const id = parseChainId(raw);
      assert.ok(typeof id === "number");
      seen.push(classifyWalletNetwork(true, id));
    }
    assert.deepEqual(seen, ["mainnet", "wrong"]);
    const display = resolveDisplayNetwork({
      wagmiConnected: true,
      connectorUid: MM_UID,
      sessionValid: true,
      verifiedUid: MM_UID,
      liveChainId: 1,
    });
    assert.equal(display.status, "wrong");
    assert.deepEqual(eligibilityFor(display.chainId), {
      eligible: false,
      reason: "wrong-network",
    });
  });

  it("6. unknown/stale provider is not eligible (Create Token stays disabled)", () => {
    for (const liveChainId of [null, undefined]) {
      const display = resolveDisplayNetwork({
        wagmiConnected: true,
        connectorUid: MM_UID,
        sessionValid: false,
        verifiedUid: MM_UID,
        liveChainId: liveChainId ?? null,
      });
      assert.equal(display.chainId, null);
      assert.equal(display.status, "wrong");
      assert.deepEqual(eligibilityFor(display.chainId), {
        eligible: false,
        reason: "wrong-network",
      });
    }
  });

  it("8. Create Token stays disabled in every non-56-verified state", () => {
    for (const chainId of [null, 1, 8453, BNB_TESTNET_CHAIN_ID]) {
      const eligibility = eligibilityFor(chainId);
      assert.equal(eligibility.eligible, false);
    }
    assert.deepEqual(eligibilityFor(BNB_MAINNET_CHAIN_ID), {
      eligible: true,
      chainId: BNB_MAINNET_CHAIN_ID,
    });
  });
});
