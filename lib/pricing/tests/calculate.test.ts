import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculatePlatformFee, validateConfig, validateSelection } from "../calculate";
import { PricingError } from "../errors";
import { PAID_FEATURES } from "../features";
import { parseBnbToWei } from "../money";

const TEST_CONFIG = {
  version: "test-fixture-1",
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

function expectPricingError(fn: () => unknown, code: string): PricingError {
  let caught: unknown;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof PricingError, "expected a PricingError to be thrown");
  assert.equal(caught.code, code);
  return caught;
}

function expectValidationError(fn: () => ReturnType<typeof validateSelection>, code: string): void {
  const result = fn();
  assert.ok(!result.ok, "expected validation to fail");
  if (!result.ok) {
    assert.ok(
      result.errors.some((error) => error.code === code),
      `expected error code ${code}, got ${result.errors.map((error) => error.code).join(", ")}`
    );
  }
}

describe("calculatePlatformFee — NON-PRODUCTION TEST FIXTURES", () => {
  it("base fee only when nothing is selected", () => {
    const result = calculatePlatformFee(TEST_CONFIG, []);
    assert.equal(result.pricingVersion, "test-fixture-1");
    assert.equal(result.baseFeeWei, parseBnbToWei("0.050"));
    assert.deepEqual(result.selectedFeatures, []);
    assert.deepEqual(result.lineItems, []);
    assert.equal(result.subtotalWei, parseBnbToWei("0.050"));
    assert.equal(result.discountWei, 0n);
    assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.050"));
    assert.equal(result.campaign, null);
  });

  it("adds a single paid feature", () => {
    const result = calculatePlatformFee(TEST_CONFIG, ["burn"]);
    assert.deepEqual(result.selectedFeatures, ["burn"]);
    assert.deepEqual(result.lineItems, [
      { feature: "burn", priceWei: parseBnbToWei("0.005") },
    ]);
    assert.equal(result.subtotalWei, parseBnbToWei("0.055"));
    assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.055"));
  });

  it("updates arithmetic in wei without floating point drift", () => {
    const result = calculatePlatformFee(
      TEST_CONFIG,
      ["burn", "mint", "pause", "maxTx", "maxWallet", "blacklist"]
    );
    assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.1"));
  });

  it("keeps included ownership features at zero additional cost", () => {
    const result = calculatePlatformFee(TEST_CONFIG, []);
    assert.deepEqual(result.includedFeatures, ["transferOwnership", "renounceOwnership"]);
    assert.equal(result.lineItems.length, 0);
    assert.equal(result.totalPlatformFeeWei, result.subtotalWei);
  });

  it("is deterministic: result order is canonical regardless of selection order", () => {
    const a = calculatePlatformFee(TEST_CONFIG, ["mint", "burn", "maxWallet"]);
    const b = calculatePlatformFee(TEST_CONFIG, ["maxWallet", "mint", "burn"]);
    assert.deepEqual(a.selectedFeatures, ["burn", "mint", "maxWallet"]);
    assert.deepEqual(b.selectedFeatures, ["burn", "mint", "maxWallet"]);
    assert.deepEqual(a.lineItems, b.lineItems);
    assert.equal(a.totalPlatformFeeWei, b.totalPlatformFeeWei);
  });
});

describe("validateSelection", () => {
  it("rejects duplicate ids explicitly", () => {
    expectValidationError(() => validateSelection(TEST_CONFIG, ["burn", "burn"]), "duplicate-feature");
  });

  it("rejects mutually exclusive blacklist + whitelist", () => {
    expectValidationError(
      () => validateSelection(TEST_CONFIG, ["blacklist", "whitelist"]),
      "incompatible-features"
    );
  });

  it("rejects unknown feature ids", () => {
    expectValidationError(() => validateSelection(TEST_CONFIG, ["reflection"]), "unknown-feature");
  });

  it("rejects included ownership features as priced add-ons", () => {
    expectValidationError(
      () => validateSelection(TEST_CONFIG, ["transferOwnership"]),
      "included-feature-selected"
    );
  });

  it("retired coming-soon ids are unknown (folded into trading)", () => {
    expectValidationError(() => validateSelection(TEST_CONFIG, ["buySellTax"]), "unknown-feature");
    expectValidationError(() => validateSelection(TEST_CONFIG, ["marketingWallet"]), "unknown-feature");
    expectValidationError(() => validateSelection(TEST_CONFIG, ["feeExemption"]), "unknown-feature");
  });

  it("unoffered V1 capabilities fail closed with feature-not-offered", () => {
    // TEST_CONFIG is a legacy 7-fee config: trading/antiBot/autoLiquidity
    // are valid ids but not offered in this version.
    for (const id of ["trading", "antiBot", "autoLiquidity"]) {
      expectValidationError(() => validateSelection(TEST_CONFIG, [id]), "feature-not-offered");
    }
  });

  it("offered V1 capabilities price from a complete config", () => {
    const full = {
      ...TEST_CONFIG,
      featureFees: {
        ...TEST_CONFIG.featureFees,
        trading: parseBnbToWei("0.020"),
        antiBot: parseBnbToWei("0.010"),
        autoLiquidity: parseBnbToWei("0.015"),
      },
    };
    assert.deepEqual(validateConfig(full), { ok: true });
    assert.deepEqual(validateSelection(full, ["trading", "antiBot"]), { ok: true });
    const result = calculatePlatformFee(full, ["trading", "autoLiquidity"]);
    assert.equal(
      result.totalPlatformFeeWei,
      parseBnbToWei("0.050") + parseBnbToWei("0.020") + parseBnbToWei("0.015")
    );
    assert.deepEqual(
      result.lineItems.map((item) => item.feature),
      ["trading", "autoLiquidity"]
    );
  });

  it("accepts a valid selection", () => {
    const result = validateSelection(TEST_CONFIG, ["burn", "whitelist"]);
    assert.deepEqual(result, { ok: true });
  });
});

describe("validateConfig", () => {
  it("accepts a fully priced configuration", () => {
    assert.deepEqual(validateConfig(TEST_CONFIG), { ok: true });
  });

  it("rejects a missing feature fee", () => {
    const withoutOne = {
      ...TEST_CONFIG,
      featureFees: { ...TEST_CONFIG.featureFees, burn: undefined as unknown as bigint },
    };
    expectValidationError(() => validateConfig(withoutOne), "missing-feature-fee");
  });

  it("rejects a fee for an unknown feature", () => {
    const withUnknown = {
      ...TEST_CONFIG,
      featureFees: { ...TEST_CONFIG.featureFees, reflection: parseBnbToWei("0.010") },
    };
    expectValidationError(() => validateConfig(withUnknown), "unknown-feature-fee");
  });

  it("rejects negative fees", () => {
    const withNegative = {
      ...TEST_CONFIG,
      featureFees: { ...TEST_CONFIG.featureFees, burn: -1n },
    };
    expectValidationError(() => validateConfig(withNegative), "negative-fee");
    expectValidationError(() => validateConfig({ ...TEST_CONFIG, baseFeeWei: -1n }), "negative-fee");
  });

  it("rejects an empty version", () => {
    expectValidationError(() => validateConfig({ ...TEST_CONFIG, version: "  " }), "invalid-config-version");
  });
});

describe("calculatePlatformFee errors", () => {
  it("throws the first validation error for invalid selections", () => {
    expectPricingError(() => calculatePlatformFee(TEST_CONFIG, ["blacklist", "whitelist"]), "incompatible-features");
    expectPricingError(() => calculatePlatformFee(TEST_CONFIG, ["burn", "burn"]), "duplicate-feature");
  });

  it("throws for an unknown campaign status", () => {
    expectPricingError(
      () => calculatePlatformFee(TEST_CONFIG, [], { status: "draft" as never }),
      "invalid-campaign"
    );
  });

  it("throws when effective price exceeds the reference price", () => {
    expectPricingError(
      () =>
        calculatePlatformFee(TEST_CONFIG, [], {
          status: "active",
          referenceWei: parseBnbToWei("0.040"),
          effectiveWei: parseBnbToWei("0.050"),
        }),
      "invalid-campaign"
    );
  });

  it("throws when a discount exceeds the subtotal", () => {
    expectPricingError(
      () =>
        calculatePlatformFee(TEST_CONFIG, [], {
          status: "active",
          referenceWei: parseBnbToWei("0.100"),
          effectiveWei: 0n,
        }),
      "invalid-campaign"
    );
  });

  it("throws when an active campaign omits amounts", () => {
    expectPricingError(
      () => calculatePlatformFee(TEST_CONFIG, [], { status: "active" }),
      "invalid-campaign"
    );
  });
});

describe("calculatePlatformFee campaign", () => {
  it("ignores an inactive campaign", () => {
    const result = calculatePlatformFee(TEST_CONFIG, [], { status: "inactive" });
    assert.equal(result.campaign, null);
    assert.equal(result.discountWei, 0n);
    assert.equal(result.totalPlatformFeeWei, result.subtotalWei);
  });

  it("applies a genuine discount when active with a real reference price", () => {
    const result = calculatePlatformFee(TEST_CONFIG, ["burn"], {
      status: "active",
      referenceWei: parseBnbToWei("0.060"),
      effectiveWei: parseBnbToWei("0.055"),
      start: "2026-01-01",
      end: "2026-02-01",
    });
    assert.deepEqual(result.campaign, {
      referenceWei: parseBnbToWei("0.060"),
      effectiveWei: parseBnbToWei("0.055"),
      discountWei: parseBnbToWei("0.005"),
      start: "2026-01-01",
      end: "2026-02-01",
    });
    assert.equal(result.subtotalWei, parseBnbToWei("0.055"));
    assert.equal(result.discountWei, parseBnbToWei("0.005"));
    assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.05"));
  });

  it("produces no negative total in any accepted configuration", () => {
    for (const selected of [[], ["burn"], PAID_FEATURES.slice(0, 4)]) {
      const base = calculatePlatformFee(TEST_CONFIG, selected);
      const result = calculatePlatformFee(TEST_CONFIG, selected, {
        status: "active",
        referenceWei: base.subtotalWei,
        effectiveWei: 0n,
      });
      assert.ok(result.totalPlatformFeeWei >= 0n);
      assert.equal(result.totalPlatformFeeWei, 0n);
    }
  });
});