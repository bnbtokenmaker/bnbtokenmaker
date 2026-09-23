import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PgPricingStore,
  buildPublishStatements,
  coerceRowId,
  logPricingStoreError,
  type NeonTxClient,
} from "../server/store";
import { parsePricingPublishInput } from "../server/campaign-policy";

/**
 * Regression tests for the two production Phase 7C publish incidents.
 *
 * Incident 1 (fixed): raw db.execute() bypasses Drizzle column mapping, so
 * BIGSERIAL ids arrive as DECIMAL STRINGS on every real Postgres transport.
 *
 * Incident 2 (fixed here): the publish CTE chained sibling data-modifying
 * CTEs (UPDATE … WHERE id = (SELECT id FROM ins)) whose execution order is
 * unpredictable per the PostgreSQL docs — and on the production engine
 * (PG 18) the UPDATEs observably run before the INSERT they reference.
 * Nothing matched, the audit entity_id came back NULL, and the whole
 * statement aborted with 23502 on every attempt (sequence gaps with no new
 * rows proved the INSERT ran and the statement then failed). Proven against
 * the real engine with session-local temp objects (since rolled back).
 *
 * The fix publishes via an ordered Neon transaction batch where every
 * statement is keyed by a pre-reserved version string, so no statement reads
 * another statement's writes. The fakes below reproduce the exact Neon HTTP
 * result shapes (string ids, { rows } results).
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
  constructor(db: never, tx?: NeonTxClient) {
    super(db, tx);
  }
  override async getActiveVersion() {
    return null;
  }
}

/** Recording Neon transaction-batch fake. */
function fakeTx(
  recorded: string[],
  results: Array<{ rows: unknown[] }>,
  failWith?: unknown
) {
  const tag = (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = "";
    strings.forEach((part, index) => {
      text += part;
      if (index < values.length) text += `$${index + 1}`;
    });
    recorded.push(text);
    return { text, values };
  };
  return Object.assign(tag, {
    transaction: async (queries: readonly unknown[]) => {
      assert.equal(queries.length, 5, "publish batch must hold 5 statements");
      if (failWith !== undefined) throw failWith;
      return results;
    },
  }) as unknown as NeonTxClient;
}

function publishBatchResults(finalRows: unknown[]) {
  return [
    { rows: [] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
    { rows: finalRows },
  ];
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
    it("succeeds when the verify row arrives with a string id (the prod shape)", async () => {
      const recorded: string[] = [];
      const store = new NeonShapedStore(
        neonDb([{ n: "7" }]),
        fakeTx(recorded, publishBatchResults([{ id: "8", version: "v7" }]))
      );
      const created = await store.publishVersion({
        fees: parsePricingPublishInput({ ...SEED_FEES }).fees,
        adminId: 1,
      });
      assert.deepEqual(created, { id: 8, version: "v7" });
    });

    it("still fails closed when the verify select comes back empty", async () => {
      const recorded: string[] = [];
      const store = new NeonShapedStore(
        neonDb([{ n: "7" }]),
        fakeTx(recorded, publishBatchResults([]))
      );
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

    it("maps a concurrent-publish collision to conflict (retry-safe)", async () => {
      const recorded: string[] = [];
      const store = new NeonShapedStore(
        neonDb([{ n: "7" }]),
        fakeTx(recorded, publishBatchResults([]), { code: "23505" })
      );
      await assert.rejects(
        store.publishVersion({
          fees: parsePricingPublishInput({ ...SEED_FEES }).fees,
          adminId: 1,
        }),
        (error: unknown) =>
          error instanceof Error &&
          (error as { code?: string }).code === "conflict"
      );
    });

    it("fails closed when the sequence value is unusable", async () => {
      const recorded: string[] = [];
      const store = new NeonShapedStore(
        neonDb([{ n: "not-a-number" }]),
        fakeTx(recorded, publishBatchResults([{ id: "8", version: "v7" }]))
      );
      await assert.rejects(
        store.publishVersion({
          fees: parsePricingPublishInput({ ...SEED_FEES }).fees,
          adminId: 1,
        }),
        (error: unknown) =>
          error instanceof Error &&
          (error as { code?: string }).code === "unavailable"
      );
      assert.equal(recorded.length, 0, "no batch may run without a version");
    });
  });

  describe("publish statement structure (the PG18 ordering hazard)", () => {
    function buildTexts(): string[] {
      const recorded: string[] = [];
      const tag = (strings: TemplateStringsArray, ...values: unknown[]) => {
        let text = "";
        strings.forEach((part, index) => {
          text += part;
          if (index < values.length) text += `$${index + 1}`;
        });
        recorded.push(text);
        return { text, values };
      };
      buildPublishStatements(tag as unknown as NeonTxClient, {
        baseFeeWei: "1",
        burnFeeWei: "1",
        mintFeeWei: "1",
        pauseFeeWei: "1",
        maxTxFeeWei: "1",
        maxWalletFeeWei: "1",
        blacklistFeeWei: "1",
        whitelistFeeWei: "1",
        adminId: 1,
        version: "v7",
        metadata: "{}",
      });
      return recorded;
    }

    it("emits exactly 5 ordered statements", () => {
      assert.equal(buildTexts().length, 5);
    });

    it("no UPDATE reads another statement's writes (the broken shape)", () => {
      const updates = buildTexts().filter((text) =>
        /^\s*UPDATE/i.test(text)
      );
      assert.equal(updates.length, 2);
      for (const update of updates) {
        assert.ok(
          !/\(\s*SELECT/i.test(update),
          `UPDATE must not subquery any CTE: ${update.slice(0, 80)}`
        );
      }
    });

    it("keys every statement by the pre-reserved version and verifies the flip", () => {
      const texts = buildTexts();
      assert.ok(texts[0].includes("version,"));
      assert.ok(texts[4].includes("status = 'active'"));
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
