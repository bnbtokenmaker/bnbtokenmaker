import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  loadRecents,
  saveRecent,
  type StorageLike,
} from "../../../components/manage/recents";

const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";

function memStore(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}

describe("manage recents", () => {
  it("remembers most-recent-first, deduplicated, case-normalized", () => {
    const store = memStore();
    saveRecent(97, A, store);
    saveRecent(97, B, store);
    saveRecent(97, A.toUpperCase(), store);
    assert.deepEqual(loadRecents(97, store), [A.toLowerCase(), B.toLowerCase()]);
  });

  it("isolates chains and ignores invalid addresses", () => {
    const store = memStore();
    saveRecent(97, A, store);
    assert.deepEqual(loadRecents(56, store), []);
    saveRecent(97, "nope", store);
    assert.deepEqual(loadRecents(97, store), [A.toLowerCase()]);
  });

  it("tolerates corrupt storage and missing storage", () => {
    const store = memStore();
    store.map.set("btm-manage-recent-v1-97", "{broken");
    assert.deepEqual(loadRecents(97, store), []);
    assert.deepEqual(loadRecents(97, null), []);
    // Without storage the computed list is still returned (nothing persists).
    assert.deepEqual(saveRecent(97, A, null), [A.toLowerCase()]);
  });
});
