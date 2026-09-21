import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BNB_MAINNET_CHAIN_ID,
  BNB_TESTNET_CHAIN_ID,
  networkLabel,
} from "../chains";
import {
  classifyWalletNetwork,
  DeploymentChainMismatchError,
  revalidateActiveChain,
  walletDeploymentEligibility,
} from "../network";

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

describe("lib/wallet — network classification", () => {
  it("classifies the active chain id", () => {
    assert.equal(classifyWalletNetwork(true, BNB_MAINNET_CHAIN_ID), "mainnet");
    assert.equal(classifyWalletNetwork(true, BNB_TESTNET_CHAIN_ID), "testnet");
    assert.equal(classifyWalletNetwork(true, 1), "wrong");
    assert.equal(classifyWalletNetwork(true, 5042002), "wrong");
    assert.equal(classifyWalletNetwork(true, 0), "wrong");
  });

  it("is disconnected without a connected chain", () => {
    assert.equal(classifyWalletNetwork(false, BNB_MAINNET_CHAIN_ID), "disconnected");
    assert.equal(classifyWalletNetwork(false, undefined), "disconnected");
    assert.equal(classifyWalletNetwork(true, undefined), "disconnected");
    assert.equal(classifyWalletNetwork(true, null), "disconnected");
  });
});

describe("lib/wallet — network labels", () => {
  it("labels supported chains by their canonical name", () => {
    assert.equal(networkLabel(BNB_MAINNET_CHAIN_ID), "BNB Smart Chain");
    assert.equal(networkLabel(BNB_TESTNET_CHAIN_ID), "BNB Smart Chain Testnet");
  });

  it("labels known unsupported chains safely by name", () => {
    assert.equal(networkLabel(1), "Ethereum Mainnet");
    assert.equal(networkLabel(137), "Polygon");
  });

  it("never guesses an unknown chain, reporting its id instead", () => {
    assert.equal(networkLabel(5042002), "Unsupported network (chain 5042002)");
    assert.equal(networkLabel(undefined), "Unsupported network");
  });
});

describe("lib/wallet — deployment eligibility", () => {
  it("requires a connected account on the deployment chain", () => {
    assert.deepEqual(
      walletDeploymentEligibility({
        isConnected: true,
        address: ADDRESS,
        chainId: BNB_MAINNET_CHAIN_ID,
      }),
      { eligible: true, chainId: BNB_MAINNET_CHAIN_ID }
    );
  });

  it("rejects a disconnected wallet", () => {
    assert.deepEqual(
      walletDeploymentEligibility({ isConnected: false, address: ADDRESS, chainId: 56 }),
      { eligible: false, reason: "disconnected" }
    );
  });

  it("rejects a missing account", () => {
    assert.deepEqual(
      walletDeploymentEligibility({ isConnected: true, address: null, chainId: 56 }),
      { eligible: false, reason: "no-account" }
    );
  });

  it("rejects testnet and unsupported chains", () => {
    assert.deepEqual(
      walletDeploymentEligibility({
        isConnected: true,
        address: ADDRESS,
        chainId: BNB_TESTNET_CHAIN_ID,
      }),
      { eligible: false, reason: "wrong-network" }
    );
    assert.deepEqual(
      walletDeploymentEligibility({
        isConnected: true,
        address: ADDRESS,
        chainId: 5042002,
      }),
      { eligible: false, reason: "wrong-network" }
    );
  });
});

describe("lib/wallet — deployment chain revalidation", () => {
  it("resolves when the live provider chain matches", async () => {
    const chainId = await revalidateActiveChain({
      getChainId: async () => BNB_MAINNET_CHAIN_ID,
    });
    assert.equal(chainId, BNB_MAINNET_CHAIN_ID);
  });

  it("throws a typed error when the live provider chain is stale/unsupported", async () => {
    await assert.rejects(
      () => revalidateActiveChain({ getChainId: async () => 5042002 }),
      (error: unknown) => {
        assert.ok(error instanceof DeploymentChainMismatchError);
        assert.equal(error.actualChainId, 5042002);
        assert.equal(error.expectedChainId, BNB_MAINNET_CHAIN_ID);
        return true;
      }
    );
  });
});
