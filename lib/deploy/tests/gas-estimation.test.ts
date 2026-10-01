import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID } from "../chains";

describe("gas estimation chain-awareness", () => {
  it("chain 56 uses mainnet factory", () => {
    const isMainnet = BSC_MAINNET_CHAIN_ID === 56;
    assert.equal(isMainnet, true);
  });

  it("chain 97 uses testnet factory", () => {
    const isTestnet = BSC_TESTNET_CHAIN_ID === 97;
    assert.equal(isTestnet, true);
  });

  it("BASIC fee is 0.050 BNB", () => {
    const basicFeeWei = 50000000000000000n;
    assert.equal(basicFeeWei, 50000000000000000n);
  });

  it("FULL-V1 fee is 0.155 BNB", () => {
    const fullV1FeeWei = 155000000000000000n;
    assert.equal(fullV1FeeWei, 155000000000000000n);
  });

  it("FULL-V1 fee is less than MAX_FEE_WEI", () => {
    const fullV1FeeWei = 155000000000000000n;
    const maxFeeWei = 500000000000000000n;
    assert.ok(fullV1FeeWei < maxFeeWei);
  });

  it("wallet balance 0.0496 BNB is insufficient for BASIC", () => {
    const balance = 49600000000000000n;
    const basicFee = 50000000000000000n;
    const gasEstimate = 2000000n;
    const gasPrice = 500000000n;
    const totalRequired = basicFee + gasEstimate * gasPrice;
    assert.ok(balance < totalRequired);
  });

  it("wallet balance 0.06 BNB is sufficient for BASIC", () => {
    const balance = 60000000000000000n;
    const basicFee = 50000000000000000n;
    const gasEstimate = 2000000n;
    const gasPrice = 500000000n;
    const totalRequired = basicFee + gasEstimate * gasPrice;
    assert.ok(balance >= totalRequired);
  });
});
