import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseQuoteRequest,
  quoteFromSnapshot,
  toQuoteDto,
} from "../server/quote";
import type { AuthoritativeSnapshot } from "../server/store";
import { devPricingConfig } from "../server/dev-values";

const HOUR = 60 * 60 * 1000;
const NOW = new Date("2026-09-23T12:00:00.000Z");

function snapshotWith(
  overrides: Partial<AuthoritativeSnapshot> = {},
  version = "v7"
): AuthoritativeSnapshot {
  // Mirrors the real loader: config.version always equals the DB version.
  return {
    config: { ...devPricingConfig(), version },
    version,
    campaign: null,
    fallback: false,
    ...overrides,
  };
}

function campaignSnapshot(): AuthoritativeSnapshot {
  return snapshotWith({
    campaign: {
      id: 3,
      name: "Launch week",
      code: "LAUNCH10",
      basisPoints: 1000,
      startsAt: new Date(NOW.getTime() - HOUR),
      endsAt: new Date(NOW.getTime() + HOUR),
    },
  });
}

describe("phase 7C quote — MODULE under test: lib/pricing/server/quote.ts", () => {
  describe("parseQuoteRequest campaignCode boundary", () => {
    it("absent code means automatic campaigns only", () => {
      const parsed = parseQuoteRequest({ features: ["mint"] });
      assert.ok(parsed.ok);
      if (parsed.ok) assert.equal(parsed.campaignCode, null);
    });

    it("accepts and normalizes a valid code", () => {
      const parsed = parseQuoteRequest({
        features: [],
        campaignCode: "  launch10 ",
      });
      assert.ok(parsed.ok);
      if (parsed.ok) assert.equal(parsed.campaignCode, "LAUNCH10");
    });

    it("rejects malformed codes and money-shaped fields", () => {
      for (const bad of [
        { features: [], campaignCode: "AB" },
        { features: [], campaignCode: 42 },
        { features: [], discountWei: "5" },
        { features: [], totalWei: "5" },
        { features: [], baseFeeWei: "5" },
        { features: [], pricingVersion: "v99" },
        { features: [], campaign: {} },
      ]) {
        const parsed = parseQuoteRequest(bad);
        assert.equal(parsed.ok, false, `expected reject for ${JSON.stringify(bad)}`);
      }
    });
  });

  describe("quoteFromSnapshot", () => {
    it("quotes base-only from the snapshot version in exact wei", () => {
      const result = quoteFromSnapshot(snapshotWith(), []);
      assert.equal(result.pricingVersion, "v7");
      assert.equal(result.subtotalWei, 50_000_000_000_000_000n);
      assert.equal(result.discountWei, 0n);
      assert.equal(result.totalPlatformFeeWei, 50_000_000_000_000_000n);
      assert.equal(result.campaign, null);
    });

    it("carries the active version into the quote (never a client value)", () => {
      const result = quoteFromSnapshot(snapshotWith({}, "v42"), ["mint"]);
      assert.equal(result.pricingVersion, "v42");
      assert.equal(result.subtotalWei, 60_000_000_000_000_000n);
    });

    it("applies the snapshot campaign as an exact discount", () => {
      const result = quoteFromSnapshot(campaignSnapshot(), ["mint"]);
      assert.equal(result.subtotalWei, 60_000_000_000_000_000n);
      assert.equal(result.discountWei, 6_000_000_000_000_000n);
      assert.equal(result.totalPlatformFeeWei, 54_000_000_000_000_000n);
      assert.ok(result.campaign !== null);
    });

    it("a captured snapshot is historically stable (config != live table)", () => {
      const frozen = snapshotWith();
      const before = quoteFromSnapshot(frozen, ["mint"]);
      // Simulate an admin publish AFTER the quote: the frozen snapshot object
      // still prices the old way — old quotes are never re-derived.
      const after = quoteFromSnapshot(frozen, ["mint"]);
      assert.equal(after.totalPlatformFeeWei, before.totalPlatformFeeWei);
      assert.equal(after.pricingVersion, before.pricingVersion);
    });
  });

  describe("toQuoteDto campaign metadata", () => {
    it("attaches sanitized campaign metadata only when a campaign applied", () => {
      const snapshot = campaignSnapshot();
      const dto = toQuoteDto(
        quoteFromSnapshot(snapshot, ["mint"]),
        snapshot.campaign
          ? {
              id: snapshot.campaign.id,
              name: snapshot.campaign.name,
              code: snapshot.campaign.code,
              discountBasisPoints: snapshot.campaign.basisPoints,
            }
          : undefined
      );
      assert.equal(dto.discountWei, "6000000000000000");
      assert.equal(dto.totalWei, "54000000000000000");
      assert.equal(dto.campaign?.id, 3);
      assert.equal(dto.campaign?.name, "Launch week");
      assert.equal(dto.campaign?.code, "LAUNCH10");
      assert.equal(dto.campaign?.discountBasisPoints, 1000);
      // No secrets ride along: only wei strings, names, and timestamps.
      assert.ok(!("adminId" in (dto.campaign ?? {})));
    });

    it("omits the campaign block when no campaign applied", () => {
      const dto = toQuoteDto(quoteFromSnapshot(snapshotWith(), []));
      assert.equal(dto.campaign, null);
      assert.equal(dto.totalWei, "50000000000000000");
    });

    it("uses canonical decimal integer strings for all wei", () => {
      const dto = toQuoteDto(quoteFromSnapshot(campaignSnapshot(), []));
      for (const value of [
        dto.basePriceWei,
        dto.subtotalWei,
        dto.discountWei,
        dto.totalWei,
      ]) {
        assert.match(value, /^(0|[1-9][0-9]*)$/);
      }
    });
  });
});
