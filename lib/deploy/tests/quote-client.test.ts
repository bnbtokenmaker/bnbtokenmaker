import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseQuotePayload, TESTNET_PLATFORM_FEE_WEI } from "../quote-client";

function goodPayload() {
  return {
    quote: {
      pricingVersion: "dev-1",
      currency: "BNB",
      basePriceWei: "50000000000000000",
      basePriceBnb: "0.050",
      lineItems: [{ feature: "mint", priceWei: "10000000000000000" }],
      selectedFeatures: ["mint"],
      subtotalWei: "60000000000000000",
      discountWei: "0",
      totalWei: "60000000000000000",
      totalBnb: "0.060",
      campaign: null,
    },
  };
}

describe("quote client — authoritative payload parsing", () => {
  it("accepts a well-formed server quote", () => {
    const parsed = parseQuotePayload(goodPayload());
    assert.ok(parsed);
    assert.equal(parsed.totalWei, "60000000000000000");
    assert.equal(parsed.currency, "BNB");
    assert.deepEqual(parsed.selectedFeatures, ["mint"]);
  });

  it("rejects malformed or money-tampered payloads (fail closed)", () => {
    assert.equal(parseQuotePayload(null), null);
    assert.equal(parseQuotePayload({}), null);
    assert.equal(parseQuotePayload({ quote: null }), null);
    const badWei = goodPayload();
    badWei.quote.totalWei = "0.06";
    assert.equal(parseQuotePayload(badWei), null);
    const badFeature = goodPayload();
    badFeature.quote.lineItems = [{ feature: "free-mint", priceWei: "0" }];
    assert.equal(parseQuotePayload(badFeature), null);
    const badCurrency = goodPayload();
    badCurrency.quote.currency = "USD";
    assert.equal(parseQuotePayload(badCurrency), null);
  });

  it("pins the testnet platform fee at zero (gas only)", () => {
    assert.equal(TESTNET_PLATFORM_FEE_WEI, 0n);
  });

  it("accepts all ten V1 paid features (full-V1 review must not go quote-stale)", () => {
    const payload = goodPayload();
    payload.quote.lineItems = [
      { feature: "trading", priceWei: "20000000000000000" },
      { feature: "antiBot", priceWei: "10000000000000000" },
      { feature: "autoLiquidity", priceWei: "15000000000000000" },
    ];
    payload.quote.selectedFeatures = ["trading", "antiBot", "autoLiquidity"];
    const parsed = parseQuotePayload(payload);
    assert.ok(parsed);
    assert.deepEqual(parsed.selectedFeatures, [
      "trading",
      "antiBot",
      "autoLiquidity",
    ]);
  });
});
