import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isManagerChainSupported,
  managerPublicClient,
} from "../client";
import {
  BSC_MAINNET_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
} from "../../deploy/chains";

/**
 * Regression cover for the C23 defect: manager reads and receipt polls used a
 * hardcoded testnet client, so mainnet managers silently queried chain 97.
 *
 * These tests never call the RPC layer — they only assert which chain a
 * returned client is pinned to, and that selection is explicit and fail-closed.
 */

describe("managerPublicClient — chain selection is explicit", () => {
  it("returns a client pinned to BSC mainnet for 56", () => {
    const client = managerPublicClient(BSC_MAINNET_CHAIN_ID);
    assert.ok(client, "expected a client for chain 56");
    assert.equal(client.chain.id, 56);
    assert.equal(client.chain.name, "BNB Smart Chain");
  });

  it("returns a client pinned to BSC testnet for 97", () => {
    const client = managerPublicClient(BSC_TESTNET_CHAIN_ID);
    assert.ok(client, "expected a client for chain 97");
    assert.equal(client.chain.id, 97);
    assert.equal(client.chain.name, "BNB Smart Chain Testnet");
  });

  it("never returns a mainnet client for a testnet id (and vice versa)", () => {
    assert.equal(
      managerPublicClient(BSC_MAINNET_CHAIN_ID)?.chain.id,
      BSC_MAINNET_CHAIN_ID
    );
    assert.equal(
      managerPublicClient(BSC_TESTNET_CHAIN_ID)?.chain.id,
      BSC_TESTNET_CHAIN_ID
    );
  });

  it("fails closed for unsupported, nullish and non-BSC chain ids", () => {
    for (const bad of [
      0, 1, 137, 8453, 42161, -1, 56.5, Number.NaN, null, undefined,
    ]) {
      assert.equal(
        managerPublicClient(bad),
        null,
        `chain ${String(bad)} must not resolve to a client`
      );
    }
  });

  it("does not treat chain 56 and 97 as interchangeable", () => {
    const mainnet = managerPublicClient(BSC_MAINNET_CHAIN_ID);
    const testnet = managerPublicClient(BSC_TESTNET_CHAIN_ID);
    assert.notEqual(mainnet, testnet);
  });
});

describe("managerPublicClient — client reuse", () => {
  it("returns the identical instance across calls (no per-render recreation)", () => {
    assert.equal(
      managerPublicClient(BSC_MAINNET_CHAIN_ID),
      managerPublicClient(BSC_MAINNET_CHAIN_ID)
    );
    assert.equal(
      managerPublicClient(BSC_TESTNET_CHAIN_ID),
      managerPublicClient(BSC_TESTNET_CHAIN_ID)
    );
  });

  it("exposes the RPC surface the manager relies on", () => {
    for (const chainId of [BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID]) {
      const client = managerPublicClient(chainId);
      assert.ok(client);
      for (const method of [
        "waitForTransactionReceipt",
        "readContract",
        "getBytecode",
        "getBlockNumber",
      ] as const) {
        assert.equal(
          typeof client[method],
          "function",
          `chain ${chainId} client must expose ${method}`
        );
      }
    }
  });
});

describe("isManagerChainSupported", () => {
  it("is true only for the two supported chains", () => {
    assert.equal(isManagerChainSupported(BSC_MAINNET_CHAIN_ID), true);
    assert.equal(isManagerChainSupported(BSC_TESTNET_CHAIN_ID), true);
    assert.equal(isManagerChainSupported(1), false);
    assert.equal(isManagerChainSupported(137), false);
    assert.equal(isManagerChainSupported(null), false);
    assert.equal(isManagerChainSupported(undefined), false);
  });

  it("agrees with managerPublicClient", () => {
    for (const chainId of [56, 97, 1, 137, null, undefined]) {
      assert.equal(
        isManagerChainSupported(chainId),
        managerPublicClient(chainId) !== null
      );
    }
  });
});
