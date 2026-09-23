import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PricingStoreError,
  getPricingStores,
  loadAuthoritativeSnapshot,
  resetPricingStoresForTests,
} from "../server/store";
import { parsePricingPublishInput } from "../server/campaign-policy";
import { devPricingConfig } from "../server/dev-values";

// Route/store tests read this lazily at call time, so assigning here (before
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

describe("phase 7C store — MODULE under test: lib/pricing/server/store.ts (in-memory)", () => {
  describe("pricing versions", () => {
    it("bootstrap publish creates v1 and activates it; second publish rotates", async () => {
      resetPricingStoresForTests();
      const { pricing } = getPricingStores();
      assert.equal(await pricing.getActiveVersion(), null);

      const first = await pricing.publishVersion({ fees: seedFees(), adminId: 1 });
      assert.equal(first.version, "v1");
      assert.equal((await pricing.getActiveVersion())?.version, "v1");

      const second = await pricing.publishVersion({
        fees: parsePricingPublishInput({ ...SEED_FEES, base: "0.060" }).fees,
        adminId: 1,
      });
      assert.equal(second.version, "v2");
      assert.equal((await pricing.getActiveVersion())?.version, "v2");

      // Previous version is inactive but preserved (immutable history).
      const versions = await pricing.listVersions();
      assert.equal(versions.length, 2);
      assert.equal(
        versions.find((row) => row.version === "v1")?.status,
        "inactive"
      );
      assert.equal(
        versions.find((row) => row.version === "v2")?.baseFeeWei,
        "60000000000000000"
      );
    });

    it("no active version fails closed with no-active-pricing", async () => {
      resetPricingStoresForTests();
      await assert.rejects(
        loadAuthoritativeSnapshot(getPricingStores(), { now: NOW }),
        (error: unknown) =>
          error instanceof PricingStoreError &&
          error.code === "no-active-pricing" &&
          error.httpStatus === 503
      );
    });

    it("snapshot carries the active version config (new quotes only)", async () => {
      resetPricingStoresForTests();
      const { pricing } = getPricingStores();
      await pricing.publishVersion({ fees: seedFees(), adminId: 1 });
      const snapshot = await loadAuthoritativeSnapshot(getPricingStores(), {
        now: NOW,
      });
      assert.equal(snapshot.version, "v1");
      assert.equal(snapshot.config.version, "v1");
      assert.equal(snapshot.config.baseFeeWei, 50_000_000_000_000_000n);
      assert.equal(snapshot.campaign, null);
      assert.equal(snapshot.fallback, false);
    });
  });

  describe("campaign resolution", () => {
    it("applies a live automatic campaign; ignores scheduled/expired/disabled", async () => {
      resetPricingStoresForTests();
      const { pricing } = getPricingStores();
      await pricing.publishVersion({ fees: seedFees(), adminId: 1 });
      await pricing.createCampaign({
        name: "Live ten",
        code: null,
        basisPoints: 1000,
        ...activeWindow(),
        adminId: 1,
      });
      await pricing.createCampaign({
        name: "Future",
        code: null,
        basisPoints: 5000,
        startsAt: new Date(NOW.getTime() + HOUR),
        endsAt: new Date(NOW.getTime() + 2 * HOUR),
        adminId: 1,
      });
      await pricing.createCampaign({
        name: "Past",
        code: null,
        basisPoints: 5000,
        startsAt: new Date(NOW.getTime() - 3 * HOUR),
        endsAt: new Date(NOW.getTime() - 2 * HOUR),
        adminId: 1,
      });
      const off = await pricing.createCampaign({
        name: "Off",
        code: null,
        basisPoints: 9000,
        ...activeWindow(),
        adminId: 1,
      });
      await pricing.patchCampaign(off.id, { enabled: false }, 1);

      const snapshot = await loadAuthoritativeSnapshot(getPricingStores(), {
        now: NOW,
      });
      assert.equal(snapshot.campaign?.name, "Live ten");
      assert.equal(snapshot.campaign?.basisPoints, 1000);
    });

    it("exact window boundaries: start inclusive, end exclusive", async () => {
      resetPricingStoresForTests();
      const { pricing } = getPricingStores();
      await pricing.publishVersion({ fees: seedFees(), adminId: 1 });
      const start = new Date(NOW.getTime());
      const end = new Date(NOW.getTime() + HOUR);
      await pricing.createCampaign({
        name: "Sharp",
        code: null,
        basisPoints: 1000,
        startsAt: start,
        endsAt: end,
        adminId: 1,
      });
      const atStart = await loadAuthoritativeSnapshot(getPricingStores(), {
        now: start,
      });
      assert.equal(atStart.campaign?.name, "Sharp");
      const atEnd = await loadAuthoritativeSnapshot(getPricingStores(), {
        now: end,
      });
      assert.equal(atEnd.campaign, null);
    });

    it("picks the highest discount deterministically among overlapping automatics", async () => {
      resetPricingStoresForTests();
      const { pricing } = getPricingStores();
      await pricing.publishVersion({ fees: seedFees(), adminId: 1 });
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
      const snapshot = await loadAuthoritativeSnapshot(getPricingStores(), {
        now: NOW,
      });
      assert.equal(snapshot.campaign?.name, "Big");
    });

    it("coded campaigns require the code; unknown codes fail closed", async () => {
      resetPricingStoresForTests();
      const { pricing } = getPricingStores();
      await pricing.publishVersion({ fees: seedFees(), adminId: 1 });
      await pricing.createCampaign({
        name: "Coded",
        code: "LAUNCH10",
        basisPoints: 1000,
        ...activeWindow(),
        adminId: 1,
      });
      // Without the code, a coded-only campaign does not discount.
      const plain = await loadAuthoritativeSnapshot(getPricingStores(), {
        now: NOW,
      });
      assert.equal(plain.campaign, null);
      // With the code, it applies.
      const coded = await loadAuthoritativeSnapshot(getPricingStores(), {
        now: NOW,
        campaignCode: "LAUNCH10",
      });
      assert.equal(coded.campaign?.code, "LAUNCH10");
      // Unknown/expired codes are rejected, never silently ignored.
      await assert.rejects(
        loadAuthoritativeSnapshot(getPricingStores(), {
          now: NOW,
          campaignCode: "NOPE99",
        }),
        (error: unknown) =>
          error instanceof PricingStoreError &&
          error.code === "invalid-campaign-code" &&
          error.httpStatus === 400
      );
    });
  });

  describe("campaign patch guards + audit", () => {
    it("started campaigns reject economic edits; failed writes leave no audit", async () => {
      resetPricingStoresForTests();
      const { pricing } = getPricingStores();
      await pricing.publishVersion({ fees: seedFees(), adminId: 1 });
      const row = await pricing.createCampaign({
        name: "Live",
        code: null,
        basisPoints: 1000,
        startsAt: new Date(Date.now() - HOUR),
        endsAt: new Date(Date.now() + HOUR),
        adminId: 1,
      });
      const auditBefore = await pricing.listAuditEvents();
      await assert.rejects(
        pricing.patchCampaign(row.id, { basisPoints: 2000 }, 1),
        (error: unknown) =>
          error instanceof PricingStoreError && error.code === "conflict"
      );
      const auditAfter = await pricing.listAuditEvents();
      assert.equal(auditAfter.length, auditBefore.length);
    });

    it("duplicate codes conflict on create", async () => {
      resetPricingStoresForTests();
      const { pricing } = getPricingStores();
      await pricing.publishVersion({ fees: seedFees(), adminId: 1 });
      await pricing.createCampaign({
        name: "First",
        code: "DUPE01",
        basisPoints: 1000,
        ...activeWindow(),
        adminId: 1,
      });
      await assert.rejects(
        pricing.createCampaign({
          name: "Second",
          code: "DUPE01",
          basisPoints: 500,
          ...activeWindow(),
          adminId: 1,
        }),
        (error: unknown) =>
          error instanceof PricingStoreError && error.code === "conflict"
      );
    });

    it("successful mutations audit without secrets", async () => {
      resetPricingStoresForTests();
      const { pricing } = getPricingStores();
      await pricing.publishVersion({ fees: seedFees(), adminId: 7 });
      const row = await pricing.createCampaign({
        name: "Audited",
        code: null,
        basisPoints: 1000,
        ...activeWindow(),
        adminId: 7,
      });
      await pricing.patchCampaign(row.id, { enabled: false }, 7);
      const audit = await pricing.listAuditEvents();
      const actions = audit.map((entry) => entry.action);
      assert.ok(actions.includes("pricing_version_published"));
      assert.ok(actions.includes("campaign_created"));
      assert.ok(actions.includes("campaign_disabled"));
      const serialized = JSON.stringify(audit).toLowerCase();
      for (const secret of ["password", "token", "database_url", "rpc"]) {
        assert.ok(
          !serialized.includes(secret),
          `audit metadata must not contain ${secret}`
        );
      }
    });
  });

  describe("dev values parity", () => {
    it("seed values match the documented development prices", () => {
      const config = devPricingConfig();
      assert.equal(config.version, "dev-1");
      assert.equal(config.baseFeeWei, 50_000_000_000_000_000n);
    });
  });
});
