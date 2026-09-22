import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BNB_MAINNET_CHAIN_ID } from "../chains";
import {
  classifyWalletNetwork,
  DeploymentChainMismatchError,
  walletDeploymentEligibility,
} from "../network";
import {
  assertDeploymentChain,
  getAuthoritativeChainId,
  parseChainId,
  readProviderChainId,
  resolveAuthoritativeChainId,
} from "../switch";

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const BASE_HEX = "0x2105"; // 8453
const BSC_HEX = "0x38"; // 56
const BSC_TESTNET_HEX = "0x61"; // 97

/** Read-only fake EIP-1193 provider: answers eth_chainId, nothing else. */
function makeProvider(initialChainHex: string) {
  const requests: string[] = [];
  const state = { requests, chainHex: initialChainHex };
  const provider = {
    ...state,
    async request(args: { method: string; params?: unknown }): Promise<unknown> {
      requests.push(args.method);
      if (args.method === "eth_chainId") return state.chainHex;
      throw { code: -32601, message: "Method not found." };
    },
  };
  return provider;
}

function makeConnector(provider: { request: unknown }) {
  return { uid: "metamask-uid", getProvider: async () => provider };
}

describe("lib/wallet — live chain observation (no automatic switching)", () => {
  it("observes the live chain with a single eth_chainId read", async () => {
    const provider = makeProvider("0x1");
    assert.equal(await getAuthoritativeChainId(makeConnector(provider)), 1);
    assert.deepEqual(provider.requests, ["eth_chainId"]);
  });

  it("readProviderChainId parses the live provider value", async () => {
    assert.equal(await readProviderChainId(makeProvider(BSC_HEX)), 56);
    assert.equal(await readProviderChainId(makeProvider(BASE_HEX)), 8453);
    await assert.rejects(() => readProviderChainId(makeProvider("0x")));
  });

  it("provider reporting Base stays Wrong Network and ineligible", () => {
    const chainId = resolveAuthoritativeChainId(8453);
    assert.equal(chainId, 8453);
    assert.equal(classifyWalletNetwork(true, chainId), "wrong");
    assert.deepEqual(
      walletDeploymentEligibility({ isConnected: true, address: ADDRESS, chainId }),
      { eligible: false, reason: "wrong-network" }
    );
  });

  it("unknown live provider state fails closed, never claims 56", () => {
    assert.equal(resolveAuthoritativeChainId(null), null);
    assert.equal(resolveAuthoritativeChainId(undefined), null);
    assert.equal(classifyWalletNetwork(true, null), "disconnected");
    assert.deepEqual(
      walletDeploymentEligibility({
        isConnected: true,
        address: ADDRESS,
        chainId: null,
      }),
      { eligible: false, reason: "wrong-network" }
    );
  });
});

describe("lib/wallet — chain id parsing", () => {
  it("parses hex, decimal and numeric chain ids", () => {
    assert.equal(parseChainId(BSC_HEX), 56);
    assert.equal(parseChainId(BSC_TESTNET_HEX), 97);
    assert.equal(parseChainId("56"), 56);
    assert.equal(parseChainId(56), 56);
    assert.equal(parseChainId("0X38"), 56);
  });

  it("rejects unparseable values", () => {
    assert.equal(parseChainId(""), null);
    assert.equal(parseChainId("0x"), null);
    assert.equal(parseChainId("not-a-chain"), null);
    assert.equal(parseChainId(null), null);
    assert.equal(parseChainId(undefined), null);
    assert.equal(parseChainId({}), null);
  });
});

describe("lib/wallet — pre-deployment guard (Phase 6B/6C)", () => {
  it("reads the authoritative chain live from the selected provider", async () => {
    const provider = makeProvider(BSC_HEX);
    assert.equal(
      await getAuthoritativeChainId(makeConnector(provider)),
      BNB_MAINNET_CHAIN_ID
    );
  });

  it("assertDeploymentChain passes on 56 and throws a typed error otherwise", async () => {
    const good = makeProvider(BSC_HEX);
    assert.equal(
      await assertDeploymentChain(makeConnector(good)),
      BNB_MAINNET_CHAIN_ID
    );
    const stale = makeProvider(BASE_HEX);
    await assert.rejects(
      () => assertDeploymentChain(makeConnector(stale)),
      (error: unknown) => {
        assert.ok(error instanceof DeploymentChainMismatchError);
        assert.equal(error.actualChainId, 8453);
        assert.equal(error.expectedChainId, BNB_MAINNET_CHAIN_ID);
        return true;
      }
    );
  });
});
