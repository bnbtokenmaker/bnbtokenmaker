import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Contract freeze integrity (7D-E1): the frozen Solidity sources must be
 * byte-identical to the approved 7D-C freeze, and the recorded factory
 * measurement must respect the hard gate. Guards against accidental .sol
 * edits during application integration (which must STOP and report instead).
 */
const ROOT = process.cwd();

describe("contract freeze integrity", () => {
  const manifest = JSON.parse(
    readFileSync(join(ROOT, "contracts", "freeze", "manifest.json"), "utf8")
  ) as {
    gate: { factoryDeployedMaxBytes: number };
    contracts: Array<{
      contract: string;
      source: string;
      sourceSha256: string;
      deployedBytes: number;
    }>;
  };

  it("manifest records the 23000-byte factory gate", () => {
    assert.equal(manifest.gate.factoryDeployedMaxBytes, 23000);
  });

  it("frozen sources match manifest hashes (no silent contract edits)", () => {
    for (const entry of manifest.contracts) {
      const source = readFileSync(join(ROOT, "contracts", entry.source), "utf8");
      const digest = createHash("sha256").update(source).digest("hex");
      assert.equal(digest, entry.sourceSha256, entry.contract);
    }
  });

  it("recorded factory size respects the hard gate", () => {
    const factory = manifest.contracts.find((c) => c.contract === "TokenFactory");
    assert.ok(factory);
    assert.ok(factory.deployedBytes < manifest.gate.factoryDeployedMaxBytes);
    assert.equal(factory.deployedBytes, 22843);
  });
});
