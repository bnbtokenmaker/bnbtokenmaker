import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InMemoryVerificationStore } from "../store";

/**
 * Verification-store behavior tests (in-memory double — no database).
 * The Postgres implementation mirrors these semantics; route/service
 * logic depends only on the VerificationStore interface.
 */

const TOKEN = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("InMemoryVerificationStore", () => {
  it("creates and reuses one row per contract identity", async () => {
    const store = new InMemoryVerificationStore();
    const first = await store.getOrCreate(56, TOKEN, "0xtx");
    assert.equal(first.inserted, true);
    assert.equal(first.row.status, "not_started");
    const second = await store.getOrCreate(56, TOKEN, "0xtx");
    assert.equal(second.inserted, false);
    assert.equal(second.row.id, first.row.id);
  });

  it("isolates chains and case", async () => {
    const store = new InMemoryVerificationStore();
    await store.getOrCreate(56, TOKEN, null);
    assert.equal(await store.findByContract(97, TOKEN), null);
    const upper = await store.findByContract(56, TOKEN.toUpperCase());
    assert.ok(upper !== null);
    assert.equal(upper?.contractAddress, TOKEN);
  });

  it("persists GUID/status transitions", async () => {
    const store = new InMemoryVerificationStore();
    await store.getOrCreate(56, TOKEN, "0xtx");
    const pending = await store.updateState(56, TOKEN, {
      status: "pending",
      guid: "guid-1",
      attempts: 1,
    });
    assert.equal(pending?.guid, "guid-1");
    assert.equal(pending?.status, "pending");
    const verified = await store.updateState(56, TOKEN, {
      status: "verified",
      lastErrorCode: null,
      verifiedAt: new Date("2026-01-01T00:00:00Z"),
    });
    assert.equal(verified?.status, "verified");
    assert.equal(verified?.guid, "guid-1");
    assert.equal(verified?.verifiedAt?.toISOString(), "2026-01-01T00:00:00.000Z");
  });

  it("returns null when updating a missing row", async () => {
    const store = new InMemoryVerificationStore();
    assert.equal(await store.updateState(56, TOKEN, { status: "pending" }), null);
  });
});
