import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import { resolveIntendedChainId } from "../intended-chain";
import { BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID } from "../chains";

describe("resolveIntendedChainId", () => {
  const original = process.env.NEXT_PUBLIC_DEPLOY_CHAIN_ID;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_DEPLOY_CHAIN_ID;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_DEPLOY_CHAIN_ID;
    } else {
      process.env.NEXT_PUBLIC_DEPLOY_CHAIN_ID = original;
    }
  });

  it("defaults to chain 56 (BSC Mainnet) when env is not set", () => {
    assert.equal(resolveIntendedChainId(), BSC_MAINNET_CHAIN_ID);
  });

  it("defaults to chain 56 when env is empty", () => {
    process.env.NEXT_PUBLIC_DEPLOY_CHAIN_ID = "";
    assert.equal(resolveIntendedChainId(), BSC_MAINNET_CHAIN_ID);
  });

  it("resolves chain 56 when explicitly set", () => {
    process.env.NEXT_PUBLIC_DEPLOY_CHAIN_ID = "56";
    assert.equal(resolveIntendedChainId(), 56);
  });

  it("resolves chain 97 for testnet development", () => {
    process.env.NEXT_PUBLIC_DEPLOY_CHAIN_ID = "97";
    assert.equal(resolveIntendedChainId(), BSC_TESTNET_CHAIN_ID);
  });

  it("fails closed to 56 on unsupported chain", () => {
    process.env.NEXT_PUBLIC_DEPLOY_CHAIN_ID = "1";
    assert.equal(resolveIntendedChainId(), BSC_MAINNET_CHAIN_ID);
  });

  it("fails closed to 56 on malformed value", () => {
    process.env.NEXT_PUBLIC_DEPLOY_CHAIN_ID = "not-a-number";
    assert.equal(resolveIntendedChainId(), BSC_MAINNET_CHAIN_ID);
  });
});
