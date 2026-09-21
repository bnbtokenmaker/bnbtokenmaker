import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DRAFT_DEFAULTS,
  SUPPLY_DIGITS_MAX,
  SUPPLY_QUICK_PRESETS,
  draftToCreatePath,
  formatDecimals,
  formatDigitsWithCommas,
  formatSupplyDigits,
  formatSupplyDisplay,
  formatSupplyInput,
  resolveDraft,
  sanitizeDecimals,
  sanitizeName,
  sanitizeSupply,
  sanitizeSymbol,
} from "../index";

describe("lib/draft — default draft", () => {
  it("defaults to Maker / MAKER / 18 / 1,000,000,000", () => {
    assert.deepEqual(DRAFT_DEFAULTS, {
      name: "Maker",
      symbol: "MAKER",
      decimals: "18",
      supply: "1,000,000,000",
    });
  });
});

describe("lib/draft — field sanitizers", () => {
  it("sanitizes a token name", () => {
    assert.equal(sanitizeName("  My   Token  "), "My Token");
    assert.equal(sanitizeName("My Token"), "My Token");
    assert.equal(
      sanitizeName("A".repeat(40)),
      "A".repeat(40)
    );
    assert.equal(sanitizeName("A".repeat(41)), null);
    assert.equal(sanitizeName("   "), null);
    assert.equal(sanitizeName(""), null);
    assert.equal(sanitizeName("ctrl\u0001char"), null);
    assert.equal(sanitizeName(42), null);
    assert.equal(sanitizeName(undefined), null);
  });

  it("sanitizes a symbol to uppercase letters and digits", () => {
    assert.equal(sanitizeSymbol("mtk"), "MTK");
    assert.equal(sanitizeSymbol(" my-token "), "MYTOKEN");
    assert.equal(sanitizeSymbol("MAKER"), "MAKER");
    assert.equal(sanitizeSymbol("B".repeat(11)), "B".repeat(11));
    assert.equal(sanitizeSymbol("B".repeat(12)), null);
    assert.equal(sanitizeSymbol("!!!"), null);
    assert.equal(sanitizeSymbol(""), null);
  });

  it("validates decimals between 0 and 18", () => {
    assert.equal(formatDecimals("18"), "18");
    assert.equal(formatDecimals("0"), "0");
    assert.equal(formatDecimals("018"), "18");
    assert.equal(formatDecimals("7"), "7");
    assert.equal(formatDecimals("19"), null);
    assert.equal(formatDecimals("-1"), "1");
    assert.equal(formatDecimals("abc"), null);
    assert.equal(formatDecimals(""), null);
    assert.equal(sanitizeDecimals(undefined), null);
  });

  it("validates supply as a positive integer and formats display", () => {
    assert.equal(formatSupplyDigits("1000000"), "1000000");
    assert.equal(formatSupplyDigits("1,000,000"), "1000000");
    assert.equal(formatSupplyDigits("0"), null);
    assert.equal(formatSupplyDigits("-5"), "5");
    assert.equal(formatSupplyDigits("1.5"), "15");
    assert.equal(formatSupplyDigits("999999999999999999"), null);
    assert.equal(formatSupplyDisplay("1000000"), "1,000,000");
    assert.equal(sanitizeSupply(undefined), DRAFT_DEFAULTS.supply);
  });
});

describe("lib/draft — resolveDraft query parsing", () => {
  it("resolves a valid draft from query params", () => {
    const draft = resolveDraft({
      name: "My Token",
      symbol: "MTK",
      decimals: "18",
      supply: "1000000",
    });
    assert.deepEqual(draft, {
      name: "My Token",
      symbol: "MTK",
      decimals: "18",
      supply: "1,000,000",
    });
  });

  it("falls back field-by-field for missing values", () => {
    const draft = resolveDraft({});
    assert.deepEqual(draft, DRAFT_DEFAULTS);
  });

  it("falls back to defaults for invalid values", () => {
    const draft = resolveDraft({
      name: "",
      symbol: "!!!",
      decimals: "99",
      supply: "0",
    });
    assert.deepEqual(draft, DRAFT_DEFAULTS);
  });

  it("ignores array query values beyond the first element", () => {
    const draft = resolveDraft({
      name: ["Good", "Bad"],
      symbol: ["MTK"],
    });
    assert.equal(draft.name, "Good");
    assert.equal(draft.symbol, "MTK");
  });

  it("never trusts partial/oversized input", () => {
    const draft = resolveDraft({
      name: "X".repeat(60),
      symbol: "Y".repeat(20),
      decimals: "abc",
      supply: "not-a-number",
    });
    assert.deepEqual(draft, DRAFT_DEFAULTS);
  });
});

describe("lib/draft — create path building", () => {
  it("builds an encoded create URL", () => {
    const path = draftToCreatePath({
      name: "My Token",
      symbol: "MTK",
      decimals: "18",
      supply: "1,000,000",
    });
    assert.equal(path, "/create?name=My+Token&symbol=MTK&decimals=18&supply=1000000");
  });

  it("falls back to defaults for empty draft fields", () => {
    const path = draftToCreatePath({
      name: "",
      symbol: "",
      decimals: "",
      supply: "",
    });
    assert.equal(
      path,
      `/create?name=${encodeURIComponent(DRAFT_DEFAULTS.name)}&symbol=${DRAFT_DEFAULTS.symbol}&decimals=${DRAFT_DEFAULTS.decimals}&supply=${formatSupplyDigits(DRAFT_DEFAULTS.supply)}`
    );
  });

  it("round-trips through resolveDraft", () => {
    const draft = resolveDraft({
      name: "Round Trip",
      symbol: "RTP",
      decimals: "9",
      supply: "123456789",
    });
    const again = resolveDraft({
      name: draft.name,
      symbol: draft.symbol,
      decimals: draft.decimals,
      supply: draft.supply,
    });
    assert.deepEqual(again, draft);
  });
});

describe("lib/draft — supply input formatting", () => {
  it("keeps commas readable while typing", () => {
    assert.equal(formatSupplyInput("1000000"), "1,000,000");
    assert.equal(formatSupplyInput("1,000,000"), "1,000,000");
    assert.equal(formatSupplyInput("12345678901234567890"), "123,456,789,012,345");
    assert.equal(formatSupplyInput("999999999999999"), "999,999,999,999,999");
  });

  it("strips anything that is not a digit", () => {
    assert.equal(formatSupplyInput("1,000 abc"), "1,000");
    assert.equal(formatSupplyInput("12.5"), "125");
    assert.equal(formatSupplyInput("abc"), "");
  });

  it("handles leading zeros without collapsing a single zero", () => {
    assert.equal(formatSupplyInput("0"), "0");
    assert.equal(formatSupplyInput("000"), "0");
    assert.equal(formatSupplyInput("007"), "7");
    assert.equal(formatSupplyInput(""), "");
  });

  it("caps the number of digits at the safe layer bound", () => {
    const cappedDigits = formatSupplyInput("9".repeat(SUPPLY_DIGITS_MAX + 4));
    const digits = cappedDigits.replace(/\D/g, "");
    assert.equal(digits.length, SUPPLY_DIGITS_MAX);
    assert.equal(formatDigitsWithCommas("9".repeat(SUPPLY_DIGITS_MAX)), cappedDigits);
    assert.equal(
      Number(cappedDigits.replace(/\D/g, "")),
      999_999_999_999_999,
    );
    assert.equal(Number(cappedDigits.replace(/\D/g, "")) <= Number.MAX_SAFE_INTEGER, true);
  });

  it("groups digits into comma-separated thousands", () => {
    assert.equal(formatDigitsWithCommas("1"), "1");
    assert.equal(formatDigitsWithCommas("12"), "12");
    assert.equal(formatDigitsWithCommas("123"), "123");
    assert.equal(formatDigitsWithCommas("1234"), "1,234");
    assert.equal(formatDigitsWithCommas("1234567"), "1,234,567");
  });

  it("quick supply presets are safe and formatted readably", () => {
    assert.deepEqual(SUPPLY_QUICK_PRESETS.map((p) => p.label), [
      "1M",
      "10M",
      "100M",
      "1B",
      "10B",
    ]);
    for (const preset of SUPPLY_QUICK_PRESETS) {
      assert.equal(preset.digits.length <= SUPPLY_DIGITS_MAX, true);
      assert.equal(Number(preset.digits) <= Number.MAX_SAFE_INTEGER, true);
    }
    assert.equal(formatSupplyInput("1000000"), "1,000,000");
    assert.equal(formatSupplyInput("10000000"), "10,000,000");
    assert.equal(formatSupplyInput("100000000"), "100,000,000");
    assert.equal(formatSupplyInput("1000000000"), "1,000,000,000");
    assert.equal(formatSupplyInput("10000000000"), "10,000,000,000");
  });
});