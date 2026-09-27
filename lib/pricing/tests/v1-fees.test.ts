import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculatePlatformFee, validateConfig } from "../calculate";
import { OPTIONAL_FEATURES, PAID_FEATURES, REQUIRED_FEATURES } from "../features";
import { parseBnbToWei } from "../money";
import type { PricingConfig } from "../types";
import { fromPricingConfigDto, toPricingConfigDto } from "../dto";

function fullConfig(): PricingConfig {
  return {
    version: "v1-test",
    baseFeeWei: parseBnbToWei("0.050"),
    featureFees: {
      burn: parseBnbToWei("0.005"),
      mint: parseBnbToWei("0.010"),
      pause: parseBnbToWei("0.005"),
      maxTx: parseBnbToWei("0.010"),
      maxWallet: parseBnbToWei("0.010"),
      blacklist: parseBnbToWei("0.010"),
      whitelist: parseBnbToWei("0.010"),
      trading: parseBnbToWei("0.020"),
      antiBot: parseBnbToWei("0.010"),
      autoLiquidity: parseBnbToWei("0.015"),
    },
  };
}

describe("pricing V1 capabilities", () => {
  it("extends the paid set to ten with required/optional split", () => {
    assert.equal(PAID_FEATURES.length, 10);
    assert.deepEqual(REQUIRED_FEATURES.length, 7);
    assert.deepEqual(OPTIONAL_FEATURES, ["trading", "antiBot", "autoLiquidity"]);
  });

  it("prices all ten capabilities with exact bigint arithmetic", () => {
    const result = calculatePlatformFee(fullConfig(), [
      "trading",
      "antiBot",
      "autoLiquidity",
    ]);
    assert.equal(
      result.totalPlatformFeeWei,
      parseBnbToWei("0.050") + parseBnbToWei("0.020") + parseBnbToWei("0.010") + parseBnbToWei("0.015")
    );
    assert.deepEqual(
      result.lineItems.map((i) => [i.feature, i.priceWei]),
      [
        ["trading", parseBnbToWei("0.020")],
        ["antiBot", parseBnbToWei("0.010")],
        ["autoLiquidity", parseBnbToWei("0.015")],
      ]
    );
  });

  it("legacy 7-fee configs still validate and quote (backward compatible)", () => {
    const legacy: PricingConfig = {
      version: "v0-legacy",
      baseFeeWei: parseBnbToWei("0.050"),
      featureFees: {
        burn: parseBnbToWei("0.005"),
        mint: parseBnbToWei("0.010"),
        pause: parseBnbToWei("0.005"),
        maxTx: parseBnbToWei("0.010"),
        maxWallet: parseBnbToWei("0.010"),
        blacklist: parseBnbToWei("0.010"),
        whitelist: parseBnbToWei("0.010"),
      },
    };
    assert.deepEqual(validateConfig(legacy), { ok: true });
    const result = calculatePlatformFee(legacy, ["burn", "mint"]);
    assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.065"));
  });

  it("campaign discounts apply over extended line items (integer math)", () => {
    const result = calculatePlatformFee(fullConfig(), ["trading"], {
      status: "active",
      referenceWei: parseBnbToWei("0.070"),
      effectiveWei: parseBnbToWei("0.063"),
    });
    // subtotal 0.070, discount 0.007, total 0.063 — all exact.
    assert.equal(result.subtotalWei, parseBnbToWei("0.070"));
    assert.equal(result.discountWei, parseBnbToWei("0.007"));
    assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.063"));
  });

  it("config DTO round-trips partial (not-offered) fee sets", () => {
    const legacy: PricingConfig = {
      version: "v0",
      baseFeeWei: 1n,
      featureFees: { burn: 2n },
    };
    const dto = toPricingConfigDto(legacy);
    assert.deepEqual(dto.featureFees, { burn: "2" });
    const rebuilt = fromPricingConfigDto(JSON.parse(JSON.stringify(dto)));
    assert.equal(rebuilt.featureFees.burn, 2n);
    assert.equal(rebuilt.featureFees.trading, undefined);
    const full = fromPricingConfigDto(toPricingConfigDto(fullConfig()));
    assert.equal(full.featureFees.autoLiquidity, parseBnbToWei("0.015"));
  });

  it("no floating point anywhere in V1 fee math", () => {
    const result = calculatePlatformFee(
      fullConfig(),
      PAID_FEATURES.filter((id) => id !== "whitelist")
    );
    assert.equal(typeof result.totalPlatformFeeWei, "bigint");
    assert.equal(typeof result.subtotalWei, "bigint");
    for (const item of result.lineItems) {
      assert.equal(typeof item.priceWei, "bigint");
    }
  });
});
