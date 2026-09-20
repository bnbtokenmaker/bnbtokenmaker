import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculatePlatformFee } from "../calculate";
import { PricingError } from "../errors";
import { parseBnbToWei } from "../money";
import { toPlatformFeeDto } from "../dto";

const TEST_CONFIG = {
  version: "dto-fixture-1",
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

describe("toPlatformFeeDto — NON-PRODUCTION TEST FIXTURES", () => {
  it("serializes all wei fields to decimal strings", () => {
    const result = calculatePlatformFee(TEST_CONFIG, ["burn", "mint"]);
    const dto = toPlatformFeeDto(result);
    assert.equal(dto.pricingVersion, "dto-fixture-1");
    assert.equal(dto.baseFeeWei, "50000000000000000");
    assert.deepEqual(dto.selectedFeatures, ["burn", "mint"]);
    assert.deepEqual(dto.lineItems, [
      { feature: "burn", priceWei: "5000000000000000" },
      { feature: "mint", priceWei: "10000000000000000" },
    ]);
    assert.equal(dto.subtotalWei, "65000000000000000");
    assert.equal(dto.discountWei, "0");
    assert.equal(dto.totalPlatformFeeWei, "65000000000000000");
    assert.equal(dto.campaign, null);
  });

  it("is JSON-stringify safe (no bigint leakage)", () => {
    const result = calculatePlatformFee(TEST_CONFIG, ["burn"], {
      status: "active",
      referenceWei: parseBnbToWei("0.060"),
      effectiveWei: parseBnbToWei("0.055"),
    });
    const dto = toPlatformFeeDto(result);
    const roundTripped = JSON.parse(JSON.stringify(dto)) as ReturnType<typeof toPlatformFeeDto>;
    assert.deepEqual(roundTripped, dto);
    assert.equal(roundTripped.totalPlatformFeeWei, "50000000000000000");
    assert.deepEqual(roundTripped.campaign, {
      referenceWei: "60000000000000000",
      effectiveWei: "55000000000000000",
      discountWei: "5000000000000000",
    });
  });

  it("keeps original bigint result authoritative", () => {
    const result = calculatePlatformFee(TEST_CONFIG, ["burn"]);
    const dto = toPlatformFeeDto(result);
    assert.equal(dto.totalPlatformFeeWei, result.totalPlatformFeeWei.toString());
  });
});

describe("barrel exports compile", () => {
  it("exposes the public API surface", async () => {
    const pricing = await import("../index");
    assert.equal(typeof pricing.parseBnbToWei, "function");
    assert.equal(typeof pricing.formatWeiBnb, "function");
    assert.equal(typeof pricing.calculatePlatformFee, "function");
    assert.equal(typeof pricing.validateConfig, "function");
    assert.equal(typeof pricing.validateSelection, "function");
    assert.equal(typeof pricing.toPlatformFeeDto, "function");
    assert.ok(Array.isArray(pricing.PAID_FEATURES));
    assert.ok(Array.isArray(pricing.INCLUDED_FEATURES));
    assert.ok(Array.isArray(pricing.COMING_SOON_FEATURES));
    assert.equal(typeof PricingError, "function");
  });
});