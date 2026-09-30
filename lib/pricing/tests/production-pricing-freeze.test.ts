import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseBnbToWei } from "../money";

describe("production pricing freeze", () => {
  const PRODUCTION_FEES_BNB = {
    base: "0.050",
    burn: "0.005",
    mint: "0.010",
    pause: "0.005",
    maxTx: "0.010",
    maxWallet: "0.010",
    blacklist: "0.010",
    whitelist: "0.010",
    trading: "0.020",
    antiBot: "0.010",
    autoLiquidity: "0.015",
  } as const;

  const MAX_FEE_WEI = 500000000000000000n;

  it("sum of all production fees equals 0.155 BNB", () => {
    const sum = Object.values(PRODUCTION_FEES_BNB).reduce(
      (acc, bnb) => acc + parseBnbToWei(bnb),
      0n
    );
    assert.equal(sum, 155000000000000000n);
    assert.equal(sum, parseBnbToWei("0.155"));
  });

  it("maximum subtotal is less than MAX_FEE_WEI", () => {
    const sum = Object.values(PRODUCTION_FEES_BNB).reduce(
      (acc, bnb) => acc + parseBnbToWei(bnb),
      0n
    );
    assert.ok(sum < MAX_FEE_WEI);
  });

  it("MAX_FEE_WEI is 0.5 BNB", () => {
    assert.equal(MAX_FEE_WEI, parseBnbToWei("0.5"));
  });

  it("headroom ratio is at least 3x", () => {
    const sum = Object.values(PRODUCTION_FEES_BNB).reduce(
      (acc, bnb) => acc + parseBnbToWei(bnb),
      0n
    );
    const ratio = Number(MAX_FEE_WEI) / Number(sum);
    assert.ok(ratio >= 3);
  });
});
