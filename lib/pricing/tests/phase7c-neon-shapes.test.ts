import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PgPricingStore,
  coerceRowId,
  logPricingStoreError,
} from "../server/store";
import { parsePricingPublishInput } from "../server/campaign-policy";

/**
 * Regression tests for the production Phase 7C incident: admin pricing
 * publish + campaign create returned sanitized 503s while reads worked.
 *
 * Root cause: raw db.execute() bypasses Drizzle column mapping, so BIGSERIAL
 * ids arrive as DECIMAL STRINGS on every real Postgres transport (Neon HTTP
 * parses OID 20 via parseBigInteger/keep-as-string; node-postgres does the
 * same). The store asserted `typeof id === "number"` and converted a healthy
 * insert into "unavailable". The fakes below reproduce the exact Neon HTTP
 * result shape ({ rows, rowCount }) with string ids.
 */

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

/** Minimal Neon-HTTP-shaped executor: rows carry string ids, like OID 20. */
function neonDb(executeRows: unknown[], selectRows: unknown[] = []) {
  return {
    execute: async () => ({
      rows: executeRows,
      rowCount: executeRows.length,
      command: "SELECT",
      fields: [],
      rowAsArray: false,
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => selectRows,
          offset: async () => selectRows,
        }),
        orderBy: () => ({
          limit: async () => selectRows,
          offset: async () => selectRows,
        }),
        limit: async () => selectRows,
      }),
    }),
  } as never;
}

/** Pg store with the builder-read seam stubbed (no live DB needed). */
class NeonShapedStore extends PgPricingStore {
  override async getActiveVersion() {
    return null;
  }
}

describe("phase 7C neon-shape regression — lib/pricing/server/store.ts", () => {
  describe("coerceRowId", () => {
    it("accepts numbers and canonical digit strings", () => {
      assert.equal(coerceRowId(7), 7);
      assert.equal(coerceRowId("7"), 7);
      assert.equal(coerceRowId("0"), 0);
      assert.equal(coerceRowId("9007199254740991"), 9007199254740991);
    });

    it("rejects everything non-canonical", () => {
      for (const bad of [
        "abc",
        "",
        "07",
        "7.0",
        "-1",
        " 7",
        "9007199254740993",
        1.5,
        Number.NaN,
        null,
        undefined,
        {},
        [],
      ]) {
        assert.equal(coerceRowId(bad), null, `expected null for ${String(bad)}`);
      }
    });
  });

  describe("publishVersion against Neon-shaped results", () => {
    it("succeeds when RETURNING id arrives as a string (the prod shape)", async () => {
      const store = new NeonShapedStore(
        neonDb([{ id: "7", version: "v7" }])
      );
      const created = await store.publishVersion({
        fees: parsePricingPublishInput({ ...SEED_FEES }).fees,
        adminId: 1,
      });
      assert.deepEqual(created, { id: 7, version: "v7" });
    });

    it("still fails closed when no row comes back", async () => {
      const store = new NeonShapedStore(neonDb([]));
      await assert.rejects(
        store.publishVersion({
          fees: parsePricingPublishInput({ ...SEED_FEES }).fees,
          adminId: 1,
        }),
        (error: unknown) =>
          error instanceof Error &&
          (error as { code?: string }).code === "unavailable"
      );
    });
  });

  describe("createCampaign against Neon-shaped results", () => {
    it("succeeds when RETURNING id arrives as a string (the prod shape)", async () => {
      const row = {
        id: 9,
        name: "Launch week",
        code: "LAUNCH10",
        discountType: "percent",
        discountBasisPoints: 1000,
        appliesTo: "whole_quote",
        startsAt: new Date("2026-09-01T00:00:00.000Z"),
        endsAt: new Date("2026-10-01T00:00:00.000Z"),
        enabled: true,
        createdByAdminId: 1,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
        updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      };
      const store = new NeonShapedStore(neonDb([{ id: "9" }], [row]));
      const created = await store.createCampaign({
        name: "Launch week",
        code: "LAUNCH10",
        basisPoints: 1000,
        startsAt: new Date("2026-09-01T00:00:00.000Z"),
        endsAt: new Date("2026-10-01T00:00:00.000Z"),
        adminId: 1,
      });
      assert.equal(created.id, 9);
      assert.equal(created.code, "LAUNCH10");
    });
  });

  describe("patchCampaign toggle against Neon-shaped results", () => {
    it("succeeds on rowCount + string id rows", async () => {
      const row = {
        id: 5,
        name: "Sale",
        code: null,
        discountType: "percent",
        discountBasisPoints: 1000,
        appliesTo: "whole_quote",
        startsAt: new Date("2026-09-01T00:00:00.000Z"),
        endsAt: new Date("2026-10-01T00:00:00.000Z"),
        enabled: true,
        createdByAdminId: 1,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
        updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      };
      const store = new NeonShapedStore(neonDb([{ id: "5" }], [row]));
      const updated = await store.patchCampaign(5, { enabled: false }, 1);
      assert.equal(updated.id, 5);
    });
  });

  describe("logPricingStoreError scrubbing", () => {
    it("logs op/name/code but never secrets", async () => {
      const previous = process.env.DATABASE_URL;
      process.env.DATABASE_URL =
        "postgres://operator:s3cret-db-password@ep-prod-neon.tech/neondb?sslmode=require";
      const lines: string[] = [];
      const original = console.error;
      console.error = (...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      };
      try {
        const failure = Object.assign(
          new Error(
            "connect failed postgres://operator:s3cret-db-password@ep-prod-neon.tech/neondb, password=s3cret-db-password"
          ),
          { code: "XX000" }
        );
        logPricingStoreError("publishVersion", failure);
      } finally {
        console.error = original;
        if (previous === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = previous;
      }
      assert.equal(lines.length, 1);
      const line = lines[0];
      assert.ok(line.includes("publishVersion"));
      assert.ok(line.includes("XX000"));
      assert.ok(!line.includes("s3cret-db-password"), "password leaked");
      assert.ok(!line.includes("ep-prod-neon.tech"), "host leaked");
      assert.ok(!line.includes("DATABASE_URL"), "env name value leaked");
    });

    it("never throws on hostile input", () => {
      assert.doesNotThrow(() => logPricingStoreError("op", null));
      assert.doesNotThrow(() => logPricingStoreError("op", undefined));
      assert.doesNotThrow(() =>
        logPricingStoreError("op", { code: { nested: true } })
      );
    });
  });
});
