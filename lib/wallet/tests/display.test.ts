import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveDisplayNetwork,
  walletDeploymentEligibility,
} from "../network";

const ADDRESS = "0x8d3218a2cd42388ca627a9432e8b14f65d1c9990";
const MM_UID = "863c874fad5";

/**
 * Regression coverage for the real-Chrome failure state:
 * prov-3 (MetaMask EIP-6963) CLAIMED eth_chainId 0x38 while the visible
 * MetaMask stayed on Ethereum, and the session/connector were observed
 * STALE/disconnected — yet the UI rendered BSC Mainnet Connected.
 * A bare provider claim of 56 must NEVER suffice.
 */
describe("lib/wallet — fail-closed display (real-Chrome diagnostics state)", () => {
  it("stale session + disconnected connector + provider claiming 56 => NOT connected", () => {
    const display = resolveDisplayNetwork({
      wagmiConnected: false,
      connectorUid: null,
      sessionValid: false,
      verifiedUid: MM_UID,
      liveChainId: 56,
    });
    assert.equal(display.chainId, null);
    assert.equal(display.status, "disconnected");
    assert.notEqual(display.status, "mainnet");
    assert.deepEqual(
      walletDeploymentEligibility({
        isConnected: false,
        address: ADDRESS,
        chainId: display.chainId,
      }),
      { eligible: false, reason: "disconnected" }
    );
  });

  it("connected but session invalid + provider claiming 56 => Wrong, ineligible", () => {
    const display = resolveDisplayNetwork({
      wagmiConnected: true,
      connectorUid: MM_UID,
      sessionValid: false,
      verifiedUid: MM_UID,
      liveChainId: 56,
    });
    assert.equal(display.chainId, null);
    assert.equal(display.status, "wrong");
    assert.deepEqual(
      walletDeploymentEligibility({
        isConnected: true,
        address: ADDRESS,
        chainId: display.chainId,
      }),
      { eligible: false, reason: "wrong-network" }
    );
  });

  it("connector rotated (uid mismatch) + claim 56 => Wrong, ineligible", () => {
    const display = resolveDisplayNetwork({
      wagmiConnected: true,
      connectorUid: "new-connector-uid",
      sessionValid: true,
      verifiedUid: MM_UID,
      liveChainId: 56,
    });
    assert.equal(display.chainId, null);
    assert.equal(display.status, "wrong");
    assert.deepEqual(
      walletDeploymentEligibility({
        isConnected: true,
        address: ADDRESS,
        chainId: display.chainId,
      }),
      { eligible: false, reason: "wrong-network" }
    );
  });

  it("unknown live state while connected => Wrong, never 56", () => {
    const display = resolveDisplayNetwork({
      wagmiConnected: true,
      connectorUid: MM_UID,
      sessionValid: true,
      verifiedUid: MM_UID,
      liveChainId: null,
    });
    assert.equal(display.chainId, null);
    assert.equal(display.status, "wrong");
  });

  it("valid session + live 56 => mainnet connected and eligible", () => {
    const display = resolveDisplayNetwork({
      wagmiConnected: true,
      connectorUid: MM_UID,
      sessionValid: true,
      verifiedUid: MM_UID,
      liveChainId: 56,
    });
    assert.equal(display.chainId, 56);
    assert.equal(display.status, "mainnet");
    assert.deepEqual(
      walletDeploymentEligibility({
        isConnected: true,
        address: ADDRESS,
        chainId: display.chainId,
      }),
      { eligible: true, chainId: 56 }
    );
  });

  it("valid session + live Ethereum => Wrong, ineligible", () => {
    const display = resolveDisplayNetwork({
      wagmiConnected: true,
      connectorUid: MM_UID,
      sessionValid: true,
      verifiedUid: MM_UID,
      liveChainId: 1,
    });
    assert.equal(display.chainId, 1);
    assert.equal(display.status, "wrong");
    assert.deepEqual(
      walletDeploymentEligibility({
        isConnected: true,
        address: ADDRESS,
        chainId: display.chainId,
      }),
      { eligible: false, reason: "wrong-network" }
    );
  });

  it("valid session + live testnet => testnet, not mainnet-eligible", () => {
    const display = resolveDisplayNetwork({
      wagmiConnected: true,
      connectorUid: MM_UID,
      sessionValid: true,
      verifiedUid: MM_UID,
      liveChainId: 97,
    });
    assert.equal(display.status, "testnet");
    assert.deepEqual(
      walletDeploymentEligibility({
        isConnected: true,
        address: ADDRESS,
        chainId: display.chainId,
      }),
      { eligible: false, reason: "wrong-network" }
    );
  });
});
