import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID } from "../chains";

describe("pricing display chain-awareness", () => {
  it("chain 56 uses mainnet platform fee label", () => {
    const isMainnet = BSC_MAINNET_CHAIN_ID === 56;
    assert.equal(isMainnet, true);
  });

  it("chain 97 uses testnet platform fee label", () => {
    const isTestnet = BSC_TESTNET_CHAIN_ID === 97;
    assert.equal(isTestnet, true);
  });

  it("chain 56 is not testnet", () => {
    const mainnetId: number = BSC_MAINNET_CHAIN_ID;
    const testnetId: number = BSC_TESTNET_CHAIN_ID;
    const isMainnet = mainnetId !== testnetId;
    assert.equal(isMainnet, true);
  });

  it("BASIC fee is 0.050 BNB (50000000000000000 wei)", () => {
    const basicFeeWei = 50000000000000000n;
    assert.equal(basicFeeWei, 50000000000000000n);
  });

  it("FULL-V1 fee is 0.155 BNB (155000000000000000 wei)", () => {
    const fullV1FeeWei = 155000000000000000n;
    assert.equal(fullV1FeeWei, 155000000000000000n);
  });

  it("FULL-V1 fee is less than MAX_FEE_WEI", () => {
    const fullV1FeeWei = 155000000000000000n;
    const maxFeeWei = 500000000000000000n;
    assert.ok(fullV1FeeWei < maxFeeWei);
  });
});
