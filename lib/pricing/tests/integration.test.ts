import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculatePlatformFee,
  formatWeiBnb,
  formatWeiBnbDisplay,
  INCLUDED_FEATURES,
  parseBnbToWei,
  toPlatformFeeDto,
  toPricingConfigDto,
  fromPricingConfigDto,
  validateConfig,
  validateSelection,
} from "../index";
import { TEST_PRICING_CONFIG as DEVELOPMENT_PRICING_CONFIG } from "./fixtures";
import { PAID_FEATURES } from "../features";
import { DEFAULT_FEAT_SELECTION, PRESETS, selectedFeatureIds } from "../presets";

describe("builder pricing adapter integration — NON-PRODUCTION TEST FIXTURES", () => {
  it("temporary development config validates", () => {
    const validation = validateConfig(DEVELOPMENT_PRICING_CONFIG);
    assert.ok(validation.ok, "dev config must be a valid PricingConfig");
    assert.equal(DEVELOPMENT_PRICING_CONFIG.version, "dev-1");
  });

  it("base price is 0.050 BNB equivalent wei", () => {
    assert.equal(DEVELOPMENT_PRICING_CONFIG.baseFeeWei, parseBnbToWei("0.050"));
  });

  it("burn add-on: base + 0.005 BNB", () => {
    const result = calculatePlatformFee(DEVELOPMENT_PRICING_CONFIG, ["burn"]);
    assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.055"));
    assert.equal(formatWeiBnb(result.totalPlatformFeeWei), "0.055");
  });

  it("mint add-on: base + 0.010 BNB", () => {
    const result = calculatePlatformFee(DEVELOPMENT_PRICING_CONFIG, ["mint"]);
    assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.060"));
  });

  it("multiple features sum in wei without drift", () => {
    const result = calculatePlatformFee(
      DEVELOPMENT_PRICING_CONFIG,
      ["burn", "mint", "pause", "maxTx", "maxWallet", "blacklist"]
    );
    assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.1"));
    assert.equal(formatWeiBnb(result.totalPlatformFeeWei), "0.1");
  });

  it("STANDARD preset result", () => {
    const ids = selectedFeatureIds(PRESETS.standard);
    assert.deepEqual([...ids], ["burn"]);
    const result = calculatePlatformFee(DEVELOPMENT_PRICING_CONFIG, ids);
    assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.055"));
  });

  it("MINTABLE preset result", () => {
    const ids = selectedFeatureIds(PRESETS.mintable);
    assert.deepEqual([...ids], ["burn", "mint"]);
    const result = calculatePlatformFee(DEVELOPMENT_PRICING_CONFIG, ids);
    assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.065"));
  });

  it("COMMUNITY preset result", () => {
    const ids = selectedFeatureIds(PRESETS.community);
    assert.deepEqual([...ids], ["burn", "maxTx", "maxWallet"]);
    const result = calculatePlatformFee(DEVELOPMENT_PRICING_CONFIG, ids);
    assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.075"));
  });

  it("CUSTOM preset base-only result", () => {
    const ids = selectedFeatureIds(PRESETS.custom);
    assert.deepEqual([...ids], []);
    const result = calculatePlatformFee(DEVELOPMENT_PRICING_CONFIG, ids);
    assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.050"));
  });

  it("default selection equals the STANDARD preset", () => {
    assert.deepEqual(DEFAULT_FEAT_SELECTION, PRESETS.standard);
  });

  it("blacklist + whitelist rejected by domain validation", () => {
    const validation = validateSelection(DEVELOPMENT_PRICING_CONFIG, ["blacklist", "whitelist"]);
    assert.ok(!validation.ok);
    if (!validation.ok) {
      assert.ok(validation.errors.some((error) => error.code === "incompatible-features"));
    }
  });

  it("included ownership features do not increase the platform fee", () => {
    const result = calculatePlatformFee(DEVELOPMENT_PRICING_CONFIG, ["burn"]);
    assert.deepEqual([...result.includedFeatures], INCLUDED_FEATURES);
    const paidSum = result.lineItems.reduce((sum, item) => sum + item.priceWei, 0n);
    assert.equal(result.subtotalWei, result.baseFeeWei + paidSum);
    assert.equal(result.totalPlatformFeeWei, result.subtotalWei);
  });

  it("Coming Soon features cannot be priced", () => {
    for (const id of ["buySellTax", "marketingWallet", "feeExemption", "antiBot", "autoLiquidity"]) {
      assert.throws(
        () => calculatePlatformFee(DEVELOPMENT_PRICING_CONFIG, [id]),
        (error) =>
          error instanceof Error &&
          "code" in error &&
          (error as { code: string }).code === "coming-soon-feature-selected"
      );
    }
  });

  it("config DTO round-trip retains exact wei values", () => {
    const dto = toPricingConfigDto(DEVELOPMENT_PRICING_CONFIG);
    const rebuilt = fromPricingConfigDto(dto);
    assert.equal(rebuilt.baseFeeWei, DEVELOPMENT_PRICING_CONFIG.baseFeeWei);
    for (const id of PAID_FEATURES) {
      assert.equal(rebuilt.featureFees[id], DEVELOPMENT_PRICING_CONFIG.featureFees[id]);
    }
    const json = JSON.parse(JSON.stringify(dto)) as unknown;
    assert.deepEqual(json, dto);
  });

  it("config DTO rejects malformed transport data", () => {
    assert.throws(
      () => fromPricingConfigDto({ ...toPricingConfigDto(DEVELOPMENT_PRICING_CONFIG), version: " " }),
      (error) => error instanceof Error && "code" in error
    );
    assert.throws(
      () =>
        fromPricingConfigDto({
          ...toPricingConfigDto(DEVELOPMENT_PRICING_CONFIG),
          baseFeeWei: "not-a-number",
        }),
      (error) => error instanceof Error && "code" in error
    );
  });

  it("result DTO round-trip keeps exact total wei string", () => {
    const result = calculatePlatformFee(DEVELOPMENT_PRICING_CONFIG, selectedFeatureIds(PRESETS.mintable));
    const resultDto = toPlatformFeeDto(result);
    const roundTripped = JSON.parse(JSON.stringify(resultDto)) as ReturnType<typeof toPlatformFeeDto>;
    assert.equal(roundTripped.totalPlatformFeeWei, result.totalPlatformFeeWei.toString());
    assert.equal(roundTripped.totalPlatformFeeWei, parseBnbToWei("0.065").toString());
  });

  it("display formatting uses no floating point (wei -> string only)", () => {
    const total = calculatePlatformFee(DEVELOPMENT_PRICING_CONFIG, ["burn", "mint"])
      .totalPlatformFeeWei;
    assert.equal(formatWeiBnbDisplay(total), "0.065");
    assert.equal(formatWeiBnbDisplay(parseBnbToWei("0.050")), "0.050");
    assert.equal(formatWeiBnbDisplay(parseBnbToWei("0.005")), "0.005");
  });

  it("same selection produces a deterministic total", () => {
    const selection = selectedFeatureIds(PRESETS.community);
    const a = calculatePlatformFee(DEVELOPMENT_PRICING_CONFIG, selection);
    const b = calculatePlatformFee(DEVELOPMENT_PRICING_CONFIG, selection);
    assert.equal(a.totalPlatformFeeWei, b.totalPlatformFeeWei);
    assert.equal(a.totalPlatformFeeWei, parseBnbToWei("0.075"));
  });

  it("no preset embeds a hard-coded total", () => {
    for (const preset of [PRESETS.standard, PRESETS.mintable, PRESETS.community]) {
      const containsMoneyShape = Object.values(preset).some(
        (value) => typeof value === "number" || typeof value === "bigint"
      );
      assert.equal(containsMoneyShape, false, "presets must only select boolean flags");
    }
  });
});