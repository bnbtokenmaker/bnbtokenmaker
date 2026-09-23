import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deriveCampaignStatus,
  discountWeiForSubtotal,
  isCampaignUsableNow,
  normalizeCampaignCode,
  parseCampaignCreateInput,
  parseCampaignPatchInput,
  parsePricingPublishInput,
  quoteWithPercentCampaign,
} from "../server/campaign-policy";
import { devPricingConfig } from "../server/dev-values";
import { parseBnbToWei } from "../money";

const NOW = new Date("2026-09-23T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function window(
  overrides: Partial<{ enabled: boolean; startsAt: Date; endsAt: Date }> = {}
) {
  return {
    enabled: overrides.enabled ?? true,
    startsAt:
      overrides.startsAt ?? new Date(NOW.getTime() - HOUR),
    endsAt: overrides.endsAt ?? new Date(NOW.getTime() + HOUR),
  };
}

describe("phase 7C policy — MODULE under test: lib/pricing/server/campaign-policy.ts", () => {
  describe("normalizeCampaignCode", () => {
    it("absent input means no code", () => {
      assert.equal(normalizeCampaignCode(undefined), null);
      assert.equal(normalizeCampaignCode(null), null);
      assert.equal(normalizeCampaignCode(""), null);
      assert.equal(normalizeCampaignCode("   "), null);
    });

    it("trims and uppercases", () => {
      assert.equal(normalizeCampaignCode("  launch10 "), "LAUNCH10");
    });

    it("rejects malformed codes", () => {
      for (const bad of ["AB", "A".repeat(33), "HAS SPACE", "lower!", 42, {}, "ab"]) {
        assert.throws(() => normalizeCampaignCode(bad), Error);
      }
    });
  });

  describe("deriveCampaignStatus / isCampaignUsableNow", () => {
    it("active while enabled and in-window", () => {
      assert.equal(deriveCampaignStatus(window(), NOW), "active");
      assert.equal(isCampaignUsableNow(window(), NOW), true);
    });

    it("scheduled before start", () => {
      const w = window({
        startsAt: new Date(NOW.getTime() + HOUR),
        endsAt: new Date(NOW.getTime() + 2 * HOUR),
      });
      assert.equal(deriveCampaignStatus(w, NOW), "scheduled");
      assert.equal(isCampaignUsableNow(w, NOW), false);
    });

    it("ended at and after end (exact end boundary is exclusive)", () => {
      const end = new Date(NOW.getTime() + HOUR);
      assert.equal(
        deriveCampaignStatus(window({ endsAt: end }), new Date(end.getTime() - 1)),
        "active"
      );
      assert.equal(deriveCampaignStatus(window({ endsAt: end }), end), "ended");
    });

    it("exact start boundary is inclusive", () => {
      const start = new Date(NOW.getTime());
      const w = window({
        startsAt: start,
        endsAt: new Date(start.getTime() + HOUR),
      });
      assert.equal(deriveCampaignStatus(w, new Date(start.getTime() - 1)), "scheduled");
      assert.equal(deriveCampaignStatus(w, start), "active");
    });

    it("disabled always wins over the window", () => {
      assert.equal(deriveCampaignStatus(window({ enabled: false }), NOW), "disabled");
      assert.equal(isCampaignUsableNow(window({ enabled: false }), NOW), false);
    });

    it("expired and future campaigns are not usable", () => {
      assert.equal(
        isCampaignUsableNow(
          window({
            startsAt: new Date(NOW.getTime() - 2 * HOUR),
            endsAt: new Date(NOW.getTime() - HOUR),
          }),
          NOW
        ),
        false
      );
      assert.equal(
        isCampaignUsableNow(
          window({
            startsAt: new Date(NOW.getTime() + HOUR),
            endsAt: new Date(NOW.getTime() + 2 * HOUR),
          }),
          NOW
        ),
        false
      );
    });
  });

  describe("discountWeiForSubtotal", () => {
    it("computes exact integer discounts", () => {
      // 10.00% of 0.05 BNB (50000000000000000 wei) = 0.005 BNB exactly.
      assert.equal(
        discountWeiForSubtotal(50_000_000_000_000_000n, 1000),
        5_000_000_000_000_000n
      );
      // 90.00% (the maximum) of 0.05 BNB = 0.045 BNB exactly.
      assert.equal(
        discountWeiForSubtotal(50_000_000_000_000_000n, 9000),
        45_000_000_000_000_000n
      );
    });

    it("enforces the 90.00% cap at the boundaries", () => {
      // 8999 and 9000 bp accepted.
      assert.equal(discountWeiForSubtotal(100_000n, 8999), 89_990n);
      assert.equal(discountWeiForSubtotal(100_000n, 9000), 90_000n);
      // 9001 and 10000 bp rejected — 100% must never be quotable.
      for (const bp of [9001, 10000]) {
        assert.throws(() => discountWeiForSubtotal(100_000n, bp), Error);
      }
    });

    it("final price stays positive for any positive subtotal at the cap", () => {
      const config = devPricingConfig();
      const result = quoteWithPercentCampaign(config, [], {
        basisPoints: 9000,
      });
      assert.equal(result.subtotalWei, 50_000_000_000_000_000n);
      assert.equal(result.discountWei, 45_000_000_000_000_000n);
      assert.equal(result.totalPlatformFeeWei, 5_000_000_000_000_000n);
      assert.ok(result.totalPlatformFeeWei > 0n);
      // Dust subtotal: floor rounding keeps the total at 1 wei, never zero
      // via discount and never negative.
      assert.equal(discountWeiForSubtotal(1n, 9000), 0n);
    });

    it("rounds DOWN deterministically (house never over-discounts)", () => {
      // 10% of 1 wei truncates to 0, not up.
      assert.equal(discountWeiForSubtotal(1n, 1000), 0n);
      // 33.33% of 100 wei = 33 (not 33.33, not 34).
      assert.equal(discountWeiForSubtotal(100n, 3333), 33n);
    });

    it("rejects nonsensical discounts", () => {
      for (const bp of [0, -1, 9001, 10000, 10001, 1.5, Number.NaN]) {
        assert.throws(() => discountWeiForSubtotal(100n, bp), Error);
      }
      assert.throws(() => discountWeiForSubtotal(-1n, 1000), Error);
    });
  });

  describe("quoteWithPercentCampaign", () => {
    it("prices base-only with a 10% campaign in exact wei", () => {
      const result = quoteWithPercentCampaign(devPricingConfig(), [], {
        basisPoints: 1000,
      });
      assert.equal(result.pricingVersion, "dev-1");
      assert.equal(result.subtotalWei, 50_000_000_000_000_000n);
      assert.equal(result.discountWei, 5_000_000_000_000_000n);
      assert.equal(result.totalPlatformFeeWei, 45_000_000_000_000_000n);
      assert.ok(result.campaign !== null);
    });

    it("prices each feature and multi-feature selections exactly", () => {
      const config = devPricingConfig();
      const mint = quoteWithPercentCampaign(config, ["mint"], { basisPoints: 1000 });
      // subtotal 0.060, discount 0.006, total 0.054
      assert.equal(mint.subtotalWei, 60_000_000_000_000_000n);
      assert.equal(mint.discountWei, 6_000_000_000_000_000n);
      assert.equal(mint.totalPlatformFeeWei, 54_000_000_000_000_000n);

      const community = quoteWithPercentCampaign(config, ["maxTx", "maxWallet"], {
        basisPoints: 2000,
      });
      // subtotal 0.070, discount 0.014, total 0.056
      assert.equal(community.subtotalWei, 70_000_000_000_000_000n);
      assert.equal(community.discountWei, 14_000_000_000_000_000n);
      assert.equal(community.totalPlatformFeeWei, 56_000_000_000_000_000n);
    });

    it("matches preset headline prices without a campaign path change", () => {
      const config = devPricingConfig();
      const standard = quoteWithPercentCampaign(config, [], { basisPoints: 1 });
      // 0.01% of 0.05 BNB = 0.000005 BNB = 5000000000000 wei.
      assert.equal(standard.discountWei, 5_000_000_000_000n);
    });

    it("carries campaign start/end through to the DTO layer", () => {
      const result = quoteWithPercentCampaign(devPricingConfig(), [], {
        basisPoints: 1000,
        start: "2026-09-01T00:00:00.000Z",
        end: "2026-10-01T00:00:00.000Z",
      });
      assert.equal(result.campaign?.start, "2026-09-01T00:00:00.000Z");
      assert.equal(result.campaign?.end, "2026-10-01T00:00:00.000Z");
    });
  });

  describe("parsePricingPublishInput", () => {
    const valid = {
      base: "0.050",
      burn: "0.005",
      mint: "0.010",
      pause: "0.005",
      maxTx: "0.010",
      maxWallet: "0.010",
      blacklist: "0.010",
      whitelist: "0.010",
    };

    it("parses human BNB strings to exact wei", () => {
      const parsed = parsePricingPublishInput(valid);
      assert.equal(parsed.fees.base, parseBnbToWei("0.050"));
      assert.equal(parsed.fees.mint, parseBnbToWei("0.010"));
    });

    it("supports full 18-decimal precision without float loss", () => {
      const parsed = parsePricingPublishInput({
        ...valid,
        base: "0.123456789012345678",
      });
      assert.equal(parsed.fees.base, 123456789012345678n);
    });

    it("rejects malformed, negative, over-precise, and money-shaped fields", () => {
      assert.throws(() => parsePricingPublishInput(null), Error);
      assert.throws(() => parsePricingPublishInput({ ...valid, base: "" }), Error);
      assert.throws(() => parsePricingPublishInput({ ...valid, base: "-0.01" }), Error);
      assert.throws(() => parsePricingPublishInput({ ...valid, base: "1e-3" }), Error);
      assert.throws(
        () => parsePricingPublishInput({ ...valid, base: "0.0000000000000000001" }),
        Error
      );
      // Client-supplied wei / version / status are not accepted as fields.
      assert.throws(
        () => parsePricingPublishInput({ ...valid, baseFeeWei: "1" }),
        Error
      );
      assert.throws(
        () => parsePricingPublishInput({ ...valid, version: "v99" }),
        Error
      );
      assert.throws(
        () => parsePricingPublishInput({ ...valid, discountWei: "5" }),
        Error
      );
    });

    it("rejects absurd pricing via per-field and combined caps", () => {
      assert.throws(
        () => parsePricingPublishInput({ ...valid, base: "1.000000000000000001" }),
        Error
      );
      assert.throws(
        () =>
          parsePricingPublishInput({
            base: "1",
            burn: "1",
            mint: "1",
            pause: "1",
            maxTx: "1",
            maxWallet: "1",
            blacklist: "0",
            whitelist: "0",
          }),
        Error
      );
    });
  });

  describe("parseCampaignCreateInput", () => {
    const base = {
      name: "Launch week",
      code: "LAUNCH10",
      discountBasisPoints: 1000,
      startsAt: new Date(NOW.getTime() - HOUR).toISOString(),
      endsAt: new Date(NOW.getTime() + HOUR).toISOString(),
    };

    it("accepts a valid campaign, normalizing the code", () => {
      const parsed = parseCampaignCreateInput(
        { ...base, code: "  launch10 " },
        NOW
      );
      assert.equal(parsed.code, "LAUNCH10");
      assert.equal(parsed.name, "Launch week");
    });

    it("accepts codeless automatic campaigns", () => {
      const parsed = parseCampaignCreateInput({ ...base, code: null }, NOW);
      assert.equal(parsed.code, null);
    });

    it("accepts 8999/9000 bp campaigns end-to-end through the create parser", () => {
      for (const bp of [8999, 9000]) {
        const parsed = parseCampaignCreateInput(
          { ...base, discountBasisPoints: bp },
          NOW
        );
        assert.equal(parsed.basisPoints, bp);
      }
    });

    it("rejects inverted windows, past ends, and eternity campaigns", () => {
      assert.throws(
        () =>
          parseCampaignCreateInput(
            { ...base, startsAt: base.endsAt, endsAt: base.startsAt },
            NOW
          ),
        Error
      );
      assert.throws(
        () =>
          parseCampaignCreateInput(
            {
              ...base,
              startsAt: new Date(NOW.getTime() - 2 * HOUR).toISOString(),
              endsAt: new Date(NOW.getTime() - HOUR).toISOString(),
            },
            NOW
          ),
        Error
      );
      assert.throws(
        () =>
          parseCampaignCreateInput(
            {
              ...base,
              endsAt: new Date(NOW.getTime() + 400 * 24 * HOUR).toISOString(),
            },
            NOW
          ),
        Error
      );
    });

    it("rejects bad names, bad discounts, and unknown fields", () => {
      assert.throws(() => parseCampaignCreateInput({ ...base, name: "AB" }, NOW), Error);
      assert.throws(
        () => parseCampaignCreateInput({ ...base, discountBasisPoints: 0 }, NOW),
        Error
      );
      assert.throws(
        () => parseCampaignCreateInput({ ...base, discountBasisPoints: 9001 }, NOW),
        Error
      );
      assert.throws(
        () => parseCampaignCreateInput({ ...base, discountBasisPoints: 10000 }, NOW),
        Error
      );
      assert.throws(
        () => parseCampaignCreateInput({ ...base, discountWei: "5" }, NOW),
        Error
      );
    });
  });

  describe("parseCampaignPatchInput", () => {
    it("allows full edits on future campaigns", () => {
      const future = window({
        startsAt: new Date(NOW.getTime() + HOUR),
        endsAt: new Date(NOW.getTime() + 2 * HOUR),
      });
      const patch = parseCampaignPatchInput(
        { name: "Renamed", discountBasisPoints: 2000 },
        future,
        NOW
      );
      assert.equal(patch.name, "Renamed");
      assert.equal(patch.basisPoints, 2000);
    });

    it("freezes economic terms once started (kill-switch only)", () => {
      const active = window();
      assert.throws(
        () => parseCampaignPatchInput({ name: "Renamed" }, active, NOW),
        Error
      );
      assert.throws(
        () => parseCampaignPatchInput({ discountBasisPoints: 500 }, active, NOW),
        Error
      );
      const toggle = parseCampaignPatchInput({ enabled: false }, active, NOW);
      assert.equal(toggle.enabled, false);
    });

    it("rejects empty patches", () => {
      assert.throws(() => parseCampaignPatchInput({}, window(), NOW), Error);
    });
  });
});
