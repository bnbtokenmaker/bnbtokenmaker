import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clearDevLog,
  devLog,
  devRefId,
  getDevLog,
  subscribeDevLog,
} from "../devlog";

/**
 * DEV-log safety: outside a dev browser (e.g. Node tests, production
 * builds) all logging is a side-effect-free no-op, so importing this module
 * from session/hook paths can never alter production behavior.
 */
describe("lib/wallet — dev event log", () => {
  it("is a no-op without a browser window", () => {
    assert.equal(typeof window, "undefined");
    devLog("reverify-ok", "chain=56 ref=prov-1");
    assert.deepEqual(getDevLog(), []);
  });

  it("assigns stable ids per object reference", () => {
    const a = {};
    const b = {};
    assert.equal(devRefId(a), devRefId(a));
    assert.notEqual(devRefId(a), devRefId(b));
    assert.equal(devRefId(null), "none");
    assert.equal(devRefId(undefined), "none");
    assert.equal(devRefId(42), "none");
  });

  it("subscribe/unsubscribe round-trips without a window", () => {
    let calls = 0;
    const unsubscribe = subscribeDevLog(() => {
      calls += 1;
    });
    devLog("test", "detail");
    assert.equal(calls, 0);
    unsubscribe();
    clearDevLog();
    assert.deepEqual(getDevLog(), []);
  });
});
