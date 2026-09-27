import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { managerErrorMessage } from "../errors";
import { mintCapacity, wouldExceedCap } from "../capacity";
import {
  buildManagerAnalyticsParams,
  trackManagerEvent,
} from "../analytics";

describe("manage error mapping", () => {
  it("maps known contract errors to human copy", () => {
    assert.equal(managerErrorMessage(new Error("OwnableUnauthorizedAccount")).title, "Not the token owner");
    assert.equal(managerErrorMessage(new Error("FeatureDisabled(mint)")).title, "Capability not enabled");
    assert.equal(
      managerErrorMessage(new Error("MaxSupplyExceeded(11, 10)")).title,
      "Maximum lifetime supply exceeded"
    );
    assert.equal(managerErrorMessage(new Error("EnforcedPause()")).title, "Token is paused");
    assert.equal(managerErrorMessage(new Error("PairBlacklisted()")).title, "Registered pair cannot be blacklisted");
    assert.equal(managerErrorMessage(new Error("TradingAlreadyEnabled()")).title, "Trading already enabled");
    assert.equal(managerErrorMessage(new Error("User rejected the request")).title, "Signature rejected");
  });

  it("falls back to sanitized generic copy without echoing internals", () => {
    const copy = managerErrorMessage(new Error("secret-rpc-endpoint exploded: 0xdeadbeef"));
    assert.equal(copy.title, "Transaction failed");
    assert.ok(!copy.body.includes("secret-rpc-endpoint"));
    assert.ok(!copy.body.includes("0xdeadbeef"));
  });
});

describe("manage mint capacity", () => {
  it("computes remaining lifetime capacity", () => {
    assert.deepEqual(mintCapacity({ maxSupply: 100n, totalMinted: 40n }), {
      kind: "capped",
      remaining: 60n,
      exhausted: false,
    });
    assert.deepEqual(mintCapacity({ maxSupply: 100n, totalMinted: 100n }).kind, "capped");
    assert.equal(
      (mintCapacity({ maxSupply: 100n, totalMinted: 100n }) as { exhausted: boolean }).exhausted,
      true
    );
  });

  it("identifies unlimited issuance explicitly", () => {
    assert.deepEqual(mintCapacity({ maxSupply: 0n, totalMinted: 999999n }), { kind: "unlimited" });
    assert.equal(wouldExceedCap({ maxSupply: 0n, totalMinted: 1n }, 10n ** 30n), false);
  });

  it("prevents obvious over-cap submission client-side", () => {
    assert.equal(wouldExceedCap({ maxSupply: 100n, totalMinted: 40n }, 61n), true);
    assert.equal(wouldExceedCap({ maxSupply: 100n, totalMinted: 40n }, 60n), false);
    assert.equal(wouldExceedCap({ maxSupply: 100n, totalMinted: 40n }, 0n), true);
  });
});

describe("manage analytics privacy", () => {
  it("builds categorical params only", () => {
    assert.deepEqual(buildManagerAnalyticsParams({ name: "manager_opened", chainId: 97 }), {
      chain_id: 97,
    });
    assert.deepEqual(
      buildManagerAnalyticsParams({ name: "manager_action_started", action: "mint", kind: "own-v1" }),
      { action: "mint", kind: "own-v1" }
    );
    assert.deepEqual(
      buildManagerAnalyticsParams({ name: "manager_action_failed", action: "mint", code: "tx-reverted" }),
      { action: "mint", code: "tx-reverted" }
    );
  });

  it("never sends sensitive payloads and never throws", () => {
    const seen: unknown[] = [];
    trackManagerEvent({ name: "token_inspected", chainId: 97, kind: "own-v1" }, (_c, _n, p) => {
      seen.push(p);
    });
    const text = JSON.stringify(seen).toLowerCase();
    for (const forbidden of ["signature", "0xf39f", "mnemonic", "provider", "privatekey"]) {
      assert.ok(!text.includes(forbidden), forbidden);
    }
    trackManagerEvent({ name: "manager_opened", chainId: 97 }, undefined);
    trackManagerEvent({ name: "manager_opened", chainId: 97 }, () => {
      throw new Error("boom");
    });
  });
});
