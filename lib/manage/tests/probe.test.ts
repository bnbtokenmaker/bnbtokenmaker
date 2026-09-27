import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Hex } from "viem";

import { classifyInspected, inspectToken, type ProbeClient } from "../probe";

const TOKEN = "0x1111111111111111111111111111111111111111" as `0x${string}`;
const FACTORY = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;
const KNOWN = new Set([FACTORY.toLowerCase()]);

function stubClient(values: Record<string, unknown>): ProbeClient {
  return {
    getBytecode: async () => (values.code as Hex | null) ?? null,
    read: async (_address: `0x${string}`, functionName: string) => {
      if (!(functionName in values)) throw new Error(`no ${functionName}`);
      return values[functionName];
    },
  };
}

const V1_VALUES = {
  code: "0x6080604052",
  name: "T",
  symbol: "T",
  decimals: 18,
  totalSupply: 100n,
  FACTORY,
  GENERATOR: "BNBTokenMaker.com",
  maxSupply: 200n,
  totalMinted: 100n,
  swapBackEnabled: true,
  owner: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  paused: false,
};

describe("manage probe inspection", () => {
  it("inspects a V1 token end to end", async () => {
    const reads = await inspectToken(stubClient(V1_VALUES), TOKEN);
    assert.equal(reads.basic.codeExists, true);
    assert.equal(reads.basic.decimals, 18);
    assert.equal(reads.owner !== null, true);
    assert.equal(reads.paused, false);
    const c = classifyInspected(reads, KNOWN);
    assert.equal(c.kind, "own-v1");
  });

  it("classifies basic-only tokens as limited externals", async () => {
    const reads = await inspectToken(
      stubClient({
        code: "0x6080",
        name: "E",
        symbol: "E",
        decimals: 18,
        totalSupply: 5n,
      }),
      TOKEN
    );
    const c = classifyInspected(reads, KNOWN);
    assert.equal(c.kind, "external");
    if (c.kind === "external") {
      assert.equal(c.limited, true);
      assert.deepEqual(c.detected, []);
    }
  });

  it("detects owner/pausable on externals without claiming more", async () => {
    const reads = await inspectToken(
      stubClient({
        code: "0x6080",
        name: "E",
        symbol: "E",
        decimals: 18,
        totalSupply: 5n,
        owner: "0xcccccccccccccccccccccccccccccccccccccccc",
        paused: true,
      }),
      TOKEN
    );
    const c = classifyInspected(reads, KNOWN);
    assert.equal(c.kind, "external");
    if (c.kind === "external") {
      assert.equal(c.limited, false);
      assert.ok(c.detected.includes("owner"));
      assert.ok(c.detected.includes("pausable"));
      assert.ok(!c.detected.includes("mint"));
      assert.ok(!c.detected.includes("blacklist"));
    }
  });

  it("marks empty and unreadable addresses unsupported", async () => {
    const empty = await inspectToken(stubClient({ code: "0x" }), TOKEN);
    assert.equal(classifyInspected(empty, KNOWN).kind, "unsupported");
    const unreadable = await inspectToken(stubClient({ code: "0x6080" }), TOKEN);
    assert.equal(classifyInspected(unreadable, KNOWN).kind, "unsupported");
  });

  it("one failing view never aborts the rest", async () => {
    const client: ProbeClient = {
      getBytecode: async () => "0x6080" as Hex,
      read: async (_a: `0x${string}`, fn: string) => {
        if (fn === "symbol") throw new Error("boom");
        const table: Record<string, unknown> = {
          name: "T",
          decimals: 18,
          totalSupply: 1n,
        };
        if (!(fn in table)) throw new Error(`no ${fn}`);
        return table[fn];
      },
    };
    const reads = await inspectToken(client, TOKEN);
    assert.equal(reads.basic.name, "T");
    assert.equal(reads.basic.symbol, null);
  });
});
