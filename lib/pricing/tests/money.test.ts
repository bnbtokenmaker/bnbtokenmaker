import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PricingError } from "../errors";
import {
  MAX_BNB_DECIMALS,
  WEI_PER_BNB,
  formatWeiBnb,
  formatWeiBnbDisplay,
  parseBnbToWei,
  parseWeiStringToBigint,
} from "../money";

describe("parseBnbToWei", () => {
  it("parses zero", () => {
    assert.equal(parseBnbToWei("0"), 0n);
  });

  it("parses whole BNB", () => {
    assert.equal(parseBnbToWei("1"), WEI_PER_BNB);
  });

  it("parses 0.001 BNB exactly", () => {
    assert.equal(parseBnbToWei("0.001"), 10n ** 15n);
  });

  it("parses 0.050 BNB exactly (trailing zero preserved in input)", () => {
    assert.equal(parseBnbToWei("0.050"), 50n * 10n ** 15n);
  });

  it("parses 18 decimal places exactly", () => {
    assert.equal(parseBnbToWei("1.234567890123456789"), 1234567890123456789n);
  });

  it("parses 1 wei", () => {
    assert.equal(parseBnbToWei("0.000000000000000001"), 1n);
  });

  it("parses amounts far beyond Number.MAX_SAFE_INTEGER without precision loss", () => {
    const huge = "9007199254740991";
    assert.equal(parseBnbToWei(huge), BigInt(huge) * WEI_PER_BNB);
  });

  it("rejects more than 18 decimal places", () => {
    const tooMany = `0.${"0".repeat(MAX_BNB_DECIMALS + 1)}1`;
    assert.throws(
      () => parseBnbToWei(tooMany),
      (error) => error instanceof PricingError && error.code === "too-many-decimals"
    );
  });

  it("rejects negative values", () => {
    assert.throws(
      () => parseBnbToWei("-0.001"),
      (error) => error instanceof PricingError && error.code === "negative-bnb-amount"
    );
    assert.throws(
      () => parseBnbToWei("-1"),
      (error) => error instanceof PricingError && error.code === "negative-bnb-amount"
    );
  });

  it("rejects floating point and malformed inputs", () => {
    for (const bad of ["", " ", "1.2.3", ".5", "5.", "abc", "1,5", "NaN", "Infinity"]) {
      assert.throws(
        () => parseBnbToWei(bad),
        (error) => error instanceof PricingError && error.code === "invalid-bnb-amount"
      );
    }
  });

  it("rejects a leading plus sign", () => {
    assert.throws(
      () => parseBnbToWei("+1"),
      (error) => error instanceof PricingError && error.code === "invalid-bnb-amount"
    );
  });

  it("rejects scientific notation", () => {
    for (const bad of ["1e18", "1.5e-3", "1E18"]) {
      assert.throws(
        () => parseBnbToWei(bad),
        (error) => error instanceof PricingError && error.code === "invalid-bnb-amount"
      );
    }
  });
});

describe("formatWeiBnb", () => {
  it("formats whole BNB without decimals", () => {
    assert.equal(formatWeiBnb(WEI_PER_BNB), "1");
    assert.equal(formatWeiBnb(0n), "0");
  });

  it("formats fractional BNB, trimming trailing zeros", () => {
    assert.equal(formatWeiBnb(10n ** 15n), "0.001");
    assert.equal(formatWeiBnb(50n * 10n ** 15n), "0.05");
    assert.equal(formatWeiBnb(1234567890123456789n), "1.234567890123456789");
  });

  it("round-trips parse -> format -> parse without precision loss", () => {
    const samples = ["0", "0.001", "0.050", "1", "1.234567890123456789", "9007199254740991.000000000000000123"];
    for (const sample of samples) {
      const wei = parseBnbToWei(sample);
      assert.equal(parseBnbToWei(formatWeiBnb(wei)), wei);
    }
  });

  it("rejects negative wei", () => {
    assert.throws(
      () => formatWeiBnb(-1n),
      (error) => error instanceof PricingError && error.code === "negative-bnb-amount"
    );
  });
});

describe("formatWeiBnbDisplay", () => {
  it("emits exactly three visible decimals from wei without floating point", () => {
    assert.equal(formatWeiBnbDisplay(parseBnbToWei("0.050")), "0.050");
    assert.equal(formatWeiBnbDisplay(parseBnbToWei("0.005")), "0.005");
    assert.equal(formatWeiBnbDisplay(parseBnbToWei("0.010")), "0.010");
    assert.equal(formatWeiBnbDisplay(parseBnbToWei("0.055")), "0.055");
    assert.equal(formatWeiBnbDisplay(parseBnbToWei("0.1")), "0.100");
    assert.equal(formatWeiBnbDisplay(parseBnbToWei("1")), "1.000");
    assert.equal(formatWeiBnbDisplay(0n), "0.000");
  });

  it("truncates deeper precision deterministically instead of rounding", () => {
    assert.equal(formatWeiBnbDisplay(parseBnbToWei("0.0014")), "0.001");
    assert.equal(formatWeiBnbDisplay(parseBnbToWei("0.123456789")), "0.123");
    assert.equal(formatWeiBnbDisplay(parseBnbToWei("1.234567890123456789")), "1.234");
  });

  it("sits alongside the canonical formatter (0.05 vs 0.050)", () => {
    assert.equal(formatWeiBnb(parseBnbToWei("0.050")), "0.05");
    assert.equal(formatWeiBnbDisplay(parseBnbToWei("0.050")), "0.050");
  });

  it("rejects negative wei", () => {
    assert.throws(
      () => formatWeiBnbDisplay(-1n),
      (error) => error instanceof PricingError && error.code === "negative-bnb-amount"
    );
  });
});

describe("parseWeiStringToBigint", () => {
  it("parses a wei decimal string back to a bigint exactly", () => {
    assert.equal(parseWeiStringToBigint("50000000000000000"), 50000000000000000n);
    assert.equal(parseWeiStringToBigint("0"), 0n);
    assert.equal(parseWeiStringToBigint("18446744073709551615"), 18446744073709551615n);
  });

  it("rejects malformed wei strings", () => {
    for (const bad of ["", " ", "-1", "1.5", "0x10", "1e18", "abc", "1,000"]) {
      assert.throws(
        () => parseWeiStringToBigint(bad),
        (error) => error instanceof PricingError && error.code === "invalid-config"
      );
    }
  });
});

describe("NON-PRODUCTION TEST FIXTURES", () => {
  it("example amounts are pure test data, not final commercial prices", () => {
    assert.equal(parseBnbToWei("0.050"), 50n * 10n ** 15n);
    assert.equal(parseBnbToWei("0.001"), 10n ** 15n);
  });
});