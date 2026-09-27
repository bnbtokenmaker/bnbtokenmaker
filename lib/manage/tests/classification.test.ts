import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classificationLabel,
  classifyToken,
  V1_GENERATOR,
  type TokenBasicReads,
  type V1MarkerReads,
} from "../classification";

const FACTORY = "0x1111111111111111111111111111111111111111";
const KNOWN = new Set([FACTORY]);

function basic(overrides = {}): TokenBasicReads {
  return {
    codeExists: true,
    name: "T",
    symbol: "T",
    decimals: 18,
    totalSupply: 100n,
    ...overrides,
  };
}

function markers(overrides = {}): V1MarkerReads {
  return {
    factory: FACTORY as `0x${string}`,
    generator: V1_GENERATOR,
    maxSupply: 200n,
    totalMinted: 100n,
    swapBackEnabled: true,
    ...overrides,
  };
}

describe("manage classification", () => {
  it("identifies V1 tokens on factory + provenance + markers", () => {
    const c = classifyToken({ basic: basic(), markers: markers(), knownFactories: KNOWN });
    assert.equal(c.kind, "own-v1");
    if (c.kind === "own-v1") assert.equal(c.factory, FACTORY);
    assert.equal(classificationLabel(c), "Created with BNBTokenMaker");
  });

  it("is case-insensitive on factory evidence", () => {
    const c = classifyToken({
      basic: basic(),
      markers: markers({ factory: FACTORY.toUpperCase() }),
      knownFactories: KNOWN,
    });
    assert.equal(c.kind, "own-v1");
  });

  it("rejects unknown factories and wrong provenance", () => {
    const unknown = classifyToken({
      basic: basic(),
      markers: markers({ factory: "0x9999999999999999999999999999999999999999" }),
      knownFactories: KNOWN,
    });
    assert.equal(unknown.kind, "external");
    const wrongGen = classifyToken({
      basic: basic(),
      markers: markers({ generator: "SomethingElse" }),
      knownFactories: KNOWN,
    });
    assert.equal(wrongGen.kind, "external");
    const noMarkers = classifyToken({
      basic: basic(),
      markers: markers({ maxSupply: null }),
      knownFactories: KNOWN,
    });
    assert.equal(noMarkers.kind, "external");
  });

  it("marks no-code and unreadable tokens unsupported", () => {
    const noCode = classifyToken({
      basic: basic({ codeExists: false }),
      markers: markers(),
      knownFactories: KNOWN,
    });
    assert.deepEqual([noCode.kind, (noCode as { reason: string }).reason], ["unsupported", "no-code"]);
    const unreadable = classifyToken({
      basic: basic({ name: null }),
      markers: markers({ factory: null, generator: null, maxSupply: null, totalMinted: null, swapBackEnabled: null }),
      knownFactories: KNOWN,
    });
    assert.equal(unreadable.kind, "unsupported");
    assert.equal(classificationLabel(noCode), "No contract at this address");
  });

  it("never trusts name/symbol alone", () => {
    const c = classifyToken({
      basic: basic({ name: "BNBTokenMaker.com", symbol: "V1" }),
      markers: markers({ factory: null, generator: null, maxSupply: null, totalMinted: null, swapBackEnabled: null }),
      knownFactories: KNOWN,
      externalDetected: [],
    });
    assert.equal(c.kind, "external");
    if (c.kind === "external") assert.equal(c.limited, true);
  });
});
