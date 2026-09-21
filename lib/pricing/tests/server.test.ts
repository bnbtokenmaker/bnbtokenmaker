import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isKnownPricingVersion,
  parseQuoteRequest,
  quotePlatformFee,
  resolveCampaignForTime,
  toQuoteDto,
} from "../server/quote";
import { TEST_PRICING_CONFIG, testPricingSource } from "./fixtures";
import { parseBnbToWei } from "../money";

const NOW = new Date("2026-09-20T12:00:00.000Z");

describe("quote service — MODULE under test: lib/pricing/server/quote.ts", () => {
  describe("parseQuoteRequest — strict input boundary", () => {
    it("accepts a valid preset", () => {
      const parsed = parseQuoteRequest({ preset: "standard" });
      assert.ok(parsed.ok);
      if (parsed.ok) {
        assert.equal(parsed.preset, "standard");
        assert.deepEqual([...parsed.selection], []);
      }
    });

    it("accepts an explicit feature list", () => {
      const parsed = parseQuoteRequest({ features: ["burn", "mint"] });
      assert.ok(parsed.ok);
      if (parsed.ok) {
        assert.deepEqual([...parsed.selection], ["burn", "mint"]);
      }
    });

    it("an explicit feature list wins over a preset", () => {
      const parsed = parseQuoteRequest({ preset: "standard", features: ["mint"] });
      assert.ok(parsed.ok);
      if (parsed.ok) {
        assert.deepEqual([...parsed.selection], ["mint"]);
      }
    });

    it("accepts an empty feature list (base-only custom)", () => {
      const parsed = parseQuoteRequest({ features: [] });
      assert.ok(parsed.ok);
      if (parsed.ok) {
        assert.deepEqual([...parsed.selection], []);
      }
    });

    it("rejects a non-object body", () => {
      for (const bad of [null, 1, "standard", ["standard"], undefined, true]) {
        const parsed = parseQuoteRequest(bad);
        assert.equal(parsed.ok, false, `expected reject for ${JSON.stringify(bad)}`);
        if (!parsed.ok) assert.equal(parsed.code, "invalid-request");
      }
    });

    it("rejects unknown top-level fields (no money/config injection)", () => {
      for (const bad of [
        { preset: "standard", totalWei: "1" },
        { features: [], baseFeeWei: "5" },
        { preset: "standard", config: {} },
        { preset: "standard", price: 0 },
        { preset: "standard", features: [], campaign: {} },
      ]) {
        const parsed = parseQuoteRequest(bad);
        assert.equal(parsed.ok, false, `expected reject for ${JSON.stringify(bad)}`);
        if (!parsed.ok) assert.equal(parsed.code, "unknown-field");
      }
    });

    it("rejects no selection at all", () => {
      const parsed = parseQuoteRequest({});
      assert.equal(parsed.ok, false);
      if (!parsed.ok) assert.equal(parsed.code, "missing-selection");
    });

    it("rejects a missing request body as invalid-json path (route-level handled separately)", () => {
      // parseQuoteRequest operates on a decoded body; undefined/null map to invalid-request
      assert.equal(parseQuoteRequest(null).ok, false);
    });

    it("rejects an unsupported preset", () => {
      const parsed = parseQuoteRequest({ preset: "premium" });
      assert.equal(parsed.ok, false);
      if (!parsed.ok) assert.equal(parsed.code, "unsupported-preset");
    });

    it("rejects a non-string preset", () => {
      for (const bad of [{ preset: 1 }, { preset: ["standard"] }, { preset: { a: 1 } }]) {
        const parsed = parseQuoteRequest(bad);
        assert.equal(parsed.ok, false);
        if (!parsed.ok) assert.equal(parsed.code, "invalid-preset");
      }
    });

    it("rejects a non-array features field", () => {
      for (const bad of [{ features: "burn" }, { features: "burn,mint" }, { features: 5 }]) {
        const parsed = parseQuoteRequest(bad);
        assert.equal(parsed.ok, false);
        if (!parsed.ok) assert.equal(parsed.code, "invalid-features");
      }
    });

    it("rejects an oversized feature array (more than paid features exist)", () => {
      const parsed = parseQuoteRequest({
        features: ["burn", "mint", "pause", "maxTx", "maxWallet", "blacklist", "whitelist", "burn"],
      });
      assert.equal(parsed.ok, false);
      if (!parsed.ok) assert.equal(parsed.code, "too-many-features");
    });

    it("rejects duplicate feature ids", () => {
      const parsed = parseQuoteRequest({ features: ["burn", "mint", "burn"] });
      assert.equal(parsed.ok, false);
      if (!parsed.ok) assert.equal(parsed.code, "duplicate-feature");
    });

    it("rejects unknown feature ids", () => {
      for (const features of [["reflection"], ["burn", "nope"], ["transferOwnership"]]) {
        const parsed = parseQuoteRequest({ features });
        assert.equal(parsed.ok, false, `expected reject for ${JSON.stringify(features)}`);
        if (!parsed.ok) assert.equal(parsed.code, "unknown-feature");
      }
    });

    it("rejects non-string feature ids (no features-shaped objects)", () => {
      const parsed = parseQuoteRequest({
        features: [{ id: "burn", priceWei: "1" }, "mint"],
      });
      assert.equal(parsed.ok, false);
      if (!parsed.ok) assert.equal(parsed.code, "invalid-feature");
    });

    it("rejects empty and overlong feature id strings", () => {
      const parsedEmpty = parseQuoteRequest({ features: [""] });
      assert.equal(parsedEmpty.ok, false);
      const parsedLong = parseQuoteRequest({ features: ["burn".padEnd(65, "x")] });
      assert.equal(parsedLong.ok, false);
    });

    it("a provided preset must be valid even when features win", () => {
      const parsed = parseQuoteRequest({ preset: "bogus", features: ["mint"] });
      assert.equal(parsed.ok, false);
      if (!parsed.ok) assert.equal(parsed.code, "unsupported-preset");
    });
  });

  describe("resolveCampaignForTime — real start/end/status semantics", () => {
    it("null campaign grants no discount", () => {
      assert.equal(resolveCampaignForTime(null, NOW), undefined);
    });

    it("inactive campaign grants no discount", () => {
      assert.equal(
        resolveCampaignForTime({ status: "inactive" }, NOW),
        undefined
      );
    });

    it("active campaign with no window grants a discount at any now", () => {
      const campaign = { status: "active" as const, referenceWei: 100n, effectiveWei: 90n };
      assert.equal(resolveCampaignForTime(campaign, NOW), campaign);
    });

    it("campaign that has not started yet grants no discount", () => {
      const campaign = {
        status: "active" as const,
        referenceWei: 100n,
        effectiveWei: 90n,
        start: "2026-10-01T00:00:00.000Z",
      };
      assert.equal(resolveCampaignForTime(campaign, NOW), undefined);
    });

    it("campaign that has expired grants no discount", () => {
      const campaign = {
        status: "active" as const,
        referenceWei: 100n,
        effectiveWei: 90n,
        end: "2026-01-01T00:00:00.000Z",
      };
      assert.equal(resolveCampaignForTime(campaign, NOW), undefined);
    });

    it("campaign active within its window grants a discount", () => {
      const campaign = {
        status: "active" as const,
        referenceWei: 100n,
        effectiveWei: 90n,
        start: "2026-09-01T00:00:00.000Z",
        end: "2026-10-01T00:00:00.000Z",
      };
      assert.equal(resolveCampaignForTime(campaign, NOW), campaign);
    });

    it("campaign with unparseable start/end never grants a discount", () => {
      for (const campaign of [
        { status: "active" as const, referenceWei: 100n, effectiveWei: 90n, start: "not-a-date" },
        { status: "active" as const, referenceWei: 100n, effectiveWei: 90n, end: "nope" },
      ]) {
        assert.equal(resolveCampaignForTime(campaign, NOW), undefined);
      }
    });

    it("omitting now keeps static pages deterministic (no discount)", () => {
      const campaign = {
        status: "active" as const,
        referenceWei: 100n,
        effectiveWei: 90n,
        start: "2026-09-01T00:00:00.000Z",
        end: "2026-10-01T00:00:00.000Z",
      };
      assert.equal(resolveCampaignForTime(campaign, undefined), undefined);
    });
  });

  describe("quotePlatformFee — server authority, no client input", () => {
    const source = testPricingSource();

    it("quotes from the source snapshot, not from any client money", () => {
      const result = quotePlatformFee(source, ["burn"], NOW);
      assert.equal(result.pricingVersion, TEST_PRICING_CONFIG.version);
      assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.055"));
    });

    it("is deterministic: same source + selection => same result", () => {
      const a = quotePlatformFee(source, ["burn", "mint"], NOW);
      const b = quotePlatformFee(source, ["burn", "mint"], NOW);
      assert.equal(a.totalPlatformFeeWei, b.totalPlatformFeeWei);
      assert.equal(a.totalPlatformFeeWei, parseBnbToWei("0.065"));
    });

    it("burn add-on quote through the service is 0.055 BNB", () => {
      assert.equal(
        quotePlatformFee(source, ["burn"], NOW).totalPlatformFeeWei,
        parseBnbToWei("0.055")
      );
    });

    it("unknown/invalid selection surfaces the domain PricingError", () => {
      assert.throws(() => quotePlatformFee(source, ["blacklist", "whitelist"], NOW));
    });

    it("passing a future-dated campaign through the service still applies windows", () => {
      const campaign = {
        status: "active" as const,
        referenceWei: parseBnbToWei("0.100"),
        effectiveWei: parseBnbToWei("0.055"),
        start: "2026-10-01T00:00:00.000Z",
      };
      const campaignSource = testPricingSource(campaign);
      const result = quotePlatformFee(campaignSource, ["burn"], NOW);
      // campaign not started yet => no discount, base+add-on applies
      assert.equal(result.totalPlatformFeeWei, parseBnbToWei("0.055"));
      assert.equal(result.campaign, null);
    });

    it("no active campaign => quote DTO carries campaign: null", () => {
      const dto = toQuoteDto(quotePlatformFee(source, ["burn"], NOW));
      assert.equal(dto.campaign, null);
      assert.equal(dto.discountWei, "0");
    });
  });

  describe("toQuoteDto — JSON-safe serialization", () => {
    it("serializes wei as strings, display as BNB decimal, no bigints leak", () => {
      const dto = toQuoteDto(quotePlatformFee(testPricingSource(), ["burn", "mint"], NOW));
      assert.equal(dto.pricingVersion, "dev-1");
      assert.equal(dto.currency, "BNB");
      assert.equal(dto.basePriceWei, ((10n ** 18n * 5n) / 100n).toString());
      assert.equal(typeof dto.basePriceWei, "string");
      assert.equal(dto.basePriceBnb, "0.050");
      assert.equal(dto.totalWei, parseBnbToWei("0.065").toString());
      assert.equal(dto.totalBnb, "0.065");
      assert.equal(dto.subtotalWei, parseBnbToWei("0.065").toString());
      assert.equal(dto.discountWei, "0");
      assert.deepEqual([...dto.selectedFeatures], ["burn", "mint"]);
      assert.deepEqual([...dto.lineItems], [
        { feature: "burn", priceWei: parseBnbToWei("0.005").toString() },
        { feature: "mint", priceWei: parseBnbToWei("0.010").toString() },
      ]);
      const json = JSON.stringify(dto);
      assert.ok(json.includes('"0.065"'));
      assert.ok(!/\dn/.test(json));
    });

    it("campaign DTO appears only when a campaign is genuinely active in-window", () => {
      const campaign = {
        status: "active" as const,
        referenceWei: parseBnbToWei("0.100"),
        effectiveWei: parseBnbToWei("0.055"),
        start: "2026-09-01T00:00:00.000Z",
        end: "2026-10-01T00:00:00.000Z",
      };
      const source = testPricingSource(campaign);
      const now = new Date("2026-09-20T00:00:00.000Z");
      const dto = toQuoteDto(quotePlatformFee(source, ["burn"], now));
      assert.notEqual(dto.campaign, null);
      if (dto.campaign !== null) {
        assert.equal(dto.campaign.referenceWei, parseBnbToWei("0.100").toString());
        assert.equal(dto.campaign.effectiveWei, parseBnbToWei("0.055").toString());
        assert.equal(dto.campaign.discountWei, parseBnbToWei("0.045").toString());
      }
      assert.equal(dto.totalBnb, "0.010"); // 0.055 subtotal − 0.045 genuine discount
    });
  });

  describe("isKnownPricingVersion", () => {
    it("matches the source's current version", () => {
      assert.equal(isKnownPricingVersion(testPricingSource(), "dev-1"), true);
      assert.equal(isKnownPricingVersion(testPricingSource(), "v9"), false);
    });
  });
});