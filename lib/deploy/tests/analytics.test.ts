import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAnalyticsParams,
  trackCreateEvent,
} from "../analytics";

describe("deploy analytics — privacy-safe event builders", () => {
  it("builds params without sensitive payloads", () => {
    assert.deepEqual(buildAnalyticsParams({ name: "create_started" }), {});
    assert.deepEqual(
      buildAnalyticsParams({ name: "feature_selected", feature: "trading", enabled: true }),
      { feature: "trading", enabled: "1" }
    );
    assert.deepEqual(
      buildAnalyticsParams({ name: "deployment_reviewed", features: ["mint", "trading"] }),
      { features: "mint,trading" }
    );
    assert.deepEqual(
      buildAnalyticsParams({ name: "deployment_confirmed", chainId: 97 }),
      { chain_id: 97 }
    );
    assert.deepEqual(
      buildAnalyticsParams({ name: "deployment_failed", code: "tx-reverted" }),
      { code: "tx-reverted" }
    );
  });

  it("sender no-ops without gtag and never throws", () => {
    trackCreateEvent({ name: "create_started" }, undefined);
    let calls = 0;
    trackCreateEvent({ name: "deployment_submitted", chainId: 97 }, () => {
      calls++;
    });
    assert.equal(calls, 1);
    trackCreateEvent({ name: "create_started" }, () => {
      throw new Error("boom");
    });
  });

  it("payloads never carry keys, signatures, or addresses", () => {
    const seen: Array<{ event: string; params: unknown }> = [];
    const events = [
      { name: "create_started" },
      { name: "authorization_received", chainId: 97 },
      { name: "deployment_confirmed", chainId: 97 },
      { name: "deployment_failed", code: "user-rejected" },
    ] as const;
    for (const event of events) {
      trackCreateEvent(event, (_cmd, name, params) => {
        seen.push({ event: name, params });
      });
    }
    const text = JSON.stringify(seen).toLowerCase();
    for (const forbidden of ["privatekey", "signature", "0xf39f", "mnemonic", "provider"]) {
      assert.ok(!text.includes(forbidden), forbidden);
    }
  });
});
