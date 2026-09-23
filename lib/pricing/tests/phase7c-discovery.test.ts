import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  basisPointsToPercentLabel,
  getPublicCampaign,
} from "../server/public-campaign";
import { formatDiscountPercent } from "../discount-percent";
import {
  getPricingStores,
  resetPricingStoresForTests,
} from "../server/store";
import { parsePricingPublishInput } from "../server/campaign-policy";

import { POST as quotePost } from "../../../app/api/pricing/quote/route";

// Store handlers read this lazily at call time, so assigning here (before
// any test runs) takes effect despite static imports above.
process.env.PRICING_STORE = "memory";

const NOW = new Date("2026-09-23T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

const SEED_FEES = {
  base: "0.050",
  burn: "0.005",
  mint: "0.010",
  pause: "0.005",
  maxTx: "0.010",
  maxWallet: "0.010",
  blacklist: "0.010",
  whitelist: "0.010",
} as const;

function seedFees() {
  return parsePricingPublishInput({ ...SEED_FEES }).fees;
}

function activeWindow() {
  return {
    startsAt: new Date(NOW.getTime() - HOUR),
    endsAt: new Date(NOW.getTime() + HOUR),
  };
}

async function seedVersion() {
  const { pricing } = getPricingStores();
  await pricing.publishVersion({ fees: seedFees(), adminId: 1 });
  return pricing;
}

function quoteRequest(body: unknown): Request {
  return new Request("http://localhost/api/pricing/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("phase 7C discovery — public campaign topbar data", () => {
  describe("basisPointsToPercentLabel", () => {
    it("renders exact trimmed percent labels without floats", () => {
      assert.equal(basisPointsToPercentLabel(1000), "10");
      assert.equal(basisPointsToPercentLabel(1250), "12.5");
      assert.equal(basisPointsToPercentLabel(1225), "12.25");
      assert.equal(basisPointsToPercentLabel(1), "0.01");
      assert.equal(basisPointsToPercentLabel(9000), "90");
    });
  });

  describe("formatDiscountPercent (public trimmed labels)", () => {
    it("removes unnecessary trailing zeros", () => {
      assert.equal(formatDiscountPercent(1000), "10");
      assert.equal(formatDiscountPercent(1050), "10.5");
      assert.equal(formatDiscountPercent(1225), "12.25");
      assert.equal(formatDiscountPercent(1), "0.01");
      assert.equal(formatDiscountPercent(5), "0.05");
      assert.equal(formatDiscountPercent(9000), "90");
      assert.equal(formatDiscountPercent(0), "0");
    });

    it("rejects non-integer or negative input", () => {
      for (const bad of [-1, 1.5, Number.NaN]) {
        assert.throws(() => formatDiscountPercent(bad), Error);
      }
    });
  });

  describe("getPublicCampaign", () => {
    it("no active campaign => no topbar (null)", async () => {
      resetPricingStoresForTests();
      await seedVersion();
      assert.equal(
        await getPublicCampaign(getPricingStores(), NOW),
        null
      );
    });

    it("no pricing at all => no topbar (null, never throws)", async () => {
      resetPricingStoresForTests();
      assert.equal(
        await getPublicCampaign(getPricingStores(), NOW),
        null
      );
    });

    it("active codeless campaign => topbar data resolves correctly", async () => {
      resetPricingStoresForTests();
      const pricing = await seedVersion();
      await pricing.createCampaign({
        name: "Launch Week",
        code: null,
        basisPoints: 1000,
        ...activeWindow(),
        adminId: 1,
      });
      const found = await getPublicCampaign(getPricingStores(), NOW);
      assert.ok(found !== null);
      assert.equal(found?.name, "Launch Week");
      assert.equal(found?.discountBasisPoints, 1000);
      assert.equal(found?.discountPercent, "10");
      assert.equal(
        found?.endsAt,
        new Date(NOW.getTime() + HOUR).toISOString()
      );
      // Promotion-only: no DB ids, no admin ids, no secrets.
      const serialized = JSON.stringify(found);
      assert.ok(!serialized.includes("admin"));
      assert.ok(!/"id"/.test(serialized));
    });

    it("future campaign => no topbar", async () => {
      resetPricingStoresForTests();
      const pricing = await seedVersion();
      await pricing.createCampaign({
        name: "Soon",
        code: null,
        basisPoints: 1000,
        startsAt: new Date(NOW.getTime() + HOUR),
        endsAt: new Date(NOW.getTime() + 2 * HOUR),
        adminId: 1,
      });
      assert.equal(
        await getPublicCampaign(getPricingStores(), NOW),
        null
      );
    });

    it("expired campaign => no topbar", async () => {
      resetPricingStoresForTests();
      const pricing = await seedVersion();
      await pricing.createCampaign({
        name: "Over",
        code: null,
        basisPoints: 1000,
        startsAt: new Date(NOW.getTime() - 2 * HOUR),
        endsAt: new Date(NOW.getTime() - HOUR),
        adminId: 1,
      });
      assert.equal(
        await getPublicCampaign(getPricingStores(), NOW),
        null
      );
    });

    it("disabled campaign => no topbar", async () => {
      resetPricingStoresForTests();
      const pricing = await seedVersion();
      const row = await pricing.createCampaign({
        name: "Paused",
        code: null,
        basisPoints: 1000,
        ...activeWindow(),
        adminId: 1,
      });
      await pricing.patchCampaign(row.id, { enabled: false }, 1);
      assert.equal(
        await getPublicCampaign(getPricingStores(), NOW),
        null
      );
    });

    it("deterministic selection with multiple active codeless campaigns", async () => {
      resetPricingStoresForTests();
      const pricing = await seedVersion();
      await pricing.createCampaign({
        name: "Small",
        code: null,
        basisPoints: 500,
        ...activeWindow(),
        adminId: 1,
      });
      await pricing.createCampaign({
        name: "Big",
        code: null,
        basisPoints: 2000,
        ...activeWindow(),
        adminId: 1,
      });
      const first = await getPublicCampaign(getPricingStores(), NOW);
      const second = await getPublicCampaign(getPricingStores(), NOW);
      assert.equal(first?.name, "Big");
      assert.equal(second?.name, "Big");
    });

    it("coded-only campaign => no topbar (codes are never advertised)", async () => {
      resetPricingStoresForTests();
      const pricing = await seedVersion();
      await pricing.createCampaign({
        name: "Private",
        code: "PARTNER50",
        basisPoints: 5000,
        ...activeWindow(),
        adminId: 1,
      });
      const found = await getPublicCampaign(getPricingStores(), NOW);
      assert.equal(found, null);
    });

    it("exact end boundary is exclusive (campaign gone at endsAt)", async () => {
      resetPricingStoresForTests();
      const pricing = await seedVersion();
      const end = new Date(NOW.getTime() + HOUR);
      await pricing.createCampaign({
        name: "Sharp",
        code: null,
        basisPoints: 1000,
        startsAt: new Date(NOW.getTime() - HOUR),
        endsAt: end,
        adminId: 1,
      });
      const before = await getPublicCampaign(
        getPricingStores(),
        new Date(end.getTime() - 1)
      );
      assert.equal(before?.name, "Sharp");
      assert.equal(await getPublicCampaign(getPricingStores(), end), null);
    });
  });

  describe("quote route — coded campaign validation", () => {
    // NOTE: the route resolves campaigns against REAL server time, so these
    // windows anchor to Date.now() (deterministic math, live window).
    function liveWindow() {
      const now = Date.now();
      return {
        startsAt: new Date(now - HOUR),
        endsAt: new Date(now + 24 * HOUR),
      };
    }

    it("valid code returns exact reference/subtotal/discount/final", async () => {
      resetPricingStoresForTests();
      const pricing = await seedVersion();
      await pricing.createCampaign({
        name: "Launch Week",
        code: "LAUNCH10",
        basisPoints: 1000,
        ...liveWindow(),
        adminId: 1,
      });
      const response = await quotePost(
        quoteRequest({ features: ["mint"], campaignCode: "launch10" })
      );
      assert.equal(response.status, 201);
      const payload = (await response.json()) as {
        quote: {
          subtotalWei: string;
          discountWei: string;
          totalWei: string;
          campaign: {
            name: string;
            code: string;
            discountBasisPoints: number;
          } | null;
        };
      };
      // 0.060 subtotal, 0.006 discount, 0.054 final — exact wei.
      assert.equal(payload.quote.subtotalWei, "60000000000000000");
      assert.equal(payload.quote.discountWei, "6000000000000000");
      assert.equal(payload.quote.totalWei, "54000000000000000");
      assert.equal(payload.quote.campaign?.name, "Launch Week");
      assert.equal(payload.quote.campaign?.code, "LAUNCH10");
      assert.equal(payload.quote.campaign?.discountBasisPoints, 1000);
    });

    it("query-string-style code cannot alter money directly", async () => {
      resetPricingStoresForTests();
      await seedVersion();
      // Money-shaped fields ride along with a code => whole body rejected.
      for (const bad of [
        { features: [], campaignCode: "LAUNCH10", totalWei: "1" },
        { features: [], campaignCode: "LAUNCH10", discountWei: "5" },
        { features: [], campaignCode: "LAUNCH10", baseFeeWei: "5" },
        { features: [], campaignCode: "LAUNCH10", pricingVersion: "v99" },
      ]) {
        const response = await quotePost(quoteRequest(bad));
        assert.equal(response.status, 400);
        const payload = (await response.json()) as {
          error: { code: string };
        };
        assert.equal(payload.error.code, "unknown-field");
      }
    });

    it("invalid code fails safely with a sanitized error", async () => {
      resetPricingStoresForTests();
      await seedVersion();
      const response = await quotePost(
        quoteRequest({ features: ["mint"], campaignCode: "NOPE99" })
      );
      assert.equal(response.status, 400);
      const payload = (await response.json()) as {
        error: { code: string; message: string };
      };
      assert.equal(payload.error.code, "invalid-campaign-code");
      assert.ok(typeof payload.error.message === "string");
    });

    it("active codeless campaign applies automatically: 0.050 -> 10% -> 0.045", async () => {
      resetPricingStoresForTests();
      const pricing = await seedVersion();
      await pricing.createCampaign({
        name: "Launch Week",
        code: null,
        basisPoints: 1000,
        ...liveWindow(),
        adminId: 1,
      });
      // No code supplied: the automatic campaign still applies server-side.
      const response = await quotePost(quoteRequest({ features: [] }));
      assert.equal(response.status, 201);
      const payload = (await response.json()) as {
        quote: {
          subtotalWei: string;
          discountWei: string;
          totalWei: string;
          campaign: { name: string; code: string | null } | null;
        };
      };
      assert.equal(payload.quote.subtotalWei, "50000000000000000");
      assert.equal(payload.quote.discountWei, "5000000000000000");
      assert.equal(payload.quote.totalWei, "45000000000000000");
      assert.equal(payload.quote.campaign?.name, "Launch Week");
      assert.equal(payload.quote.campaign?.code, null);
    });
  });

  describe("public promo-code removal", () => {
    const SCOPED_FILES = [
      "components/CreateBuilder.tsx",
      "app/create/page.tsx",
      "lib/deploy/quote-client.ts",
    ];
    const FORBIDDEN_TOKENS = [
      "promoCode",
      "promoNote",
      "fetchPromoQuote",
      "PromoQuoteOutcome",
      "appliedCode",
      "initialCampaignCode",
      "requested.campaign",
      "?campaign",
    ];

    it("all scoped sources exist (scan is not silently empty)", () => {
      for (const file of SCOPED_FILES) {
        const source = readFileSync(join(process.cwd(), file), "utf8");
        assert.ok(source.length > 0, file);
      }
    });

    for (const token of FORBIDDEN_TOKENS) {
      it(`public paths contain no ${token}`, () => {
        const hits: string[] = [];
        for (const file of SCOPED_FILES) {
          const source = readFileSync(join(process.cwd(), file), "utf8");
          if (source.includes(token)) hits.push(file);
        }
        assert.deepEqual(hits, []);
      });
    }
  });
});
