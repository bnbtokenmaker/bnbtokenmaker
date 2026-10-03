import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeAbiParameters, encodeEventTopics, type Abi } from "viem";

import { factoryAbi } from "../../token/factory";

import { VERIFY_VIEW_NAMES } from "../chain";
import {
  proveProvenanceAndReconstruct,
  requestVerification,
  VerifyServiceError,
  withBoundedViewRecovery,
  isRetryableEvidenceError,
} from "../service";
import { encodeTokenConstructorArgs } from "../inputs";
import { InMemoryVerificationStore } from "../store";
import { REAL_FULL_TEST_TX_INPUT } from "./inputs.test";
import type { FetchImpl } from "../bscscan";

/**
 * C25.3 production regression: the service consumed seven token views
 * (burnable, mintable, pausable, maxTxAmount, maxWalletAmount,
 * blacklistEnabled, whitelistEnabled) that the reader never requested,
 * so EVERY verification failed deterministically with
 * evidence-incomplete before any DB row or BscScan contact.
 *
 * These tests bind the REAL reader request list to the REAL service
 * requirements (no parallel hand-maintained lists) and replay the REAL
 * FULL TEST production evidence end to end.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FACTORY = "0xd7de07de5113efa6cf0c213914ed7f0df60b682c" as `0x${string}`;
const TOKEN = "0x817683366dfaf428a4972bcf314731f9728dbb66" as `0x${string}`;
const DEPLOYER = "0x8d3218a2cd42388ca627a9432e8b14f65d1c9990" as `0x${string}`;
const TX = "0x77be8621ea0343690ace86073adfd992293a21b1b760af6eb2ce7e95e3a200f3" as `0x${string}`;

const FULL_TEST_VIEWS: Record<string, unknown> = {
  name: "FULL TEST",
  symbol: "FULL",
  decimals: 9,
  totalSupply: 1000000000000000000n,
  FACTORY,
  GENERATOR: "BNBTokenMaker.com",
  maxSupply: 2000000000000000000n,
  totalMinted: 1000000000000000000n,
  swapBackEnabled: true,
  owner: DEPLOYER,
  paused: false,
  tradingEnabled: false,
  buyTaxBps: 400n,
  sellTaxBps: 600n,
  marketingWallet: DEPLOYER,
  marketingShareBps: 7000n,
  liquidityShareBps: 3000n,
  autoLiquidityEnabled: true,
  swapThreshold: 1000000000000000n,
  antiBotEnabled: true,
  snipeBlocks: 5n,
  burnable: true,
  mintable: true,
  pausable: true,
  maxTxAmount: 20000000000000000n,
  maxWalletAmount: 50000000000000000n,
  blacklistEnabled: true,
  whitelistEnabled: false,
};

function readerShapedViews(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  // Built from the REAL reader request list — never a hand-written
  // superset. A field the reader does not request is absent here, exactly
  // as in production.
  const views: Record<string, unknown> = {};
  for (const name of VERIFY_VIEW_NAMES) {
    if (name in overrides) {
      views[name] = overrides[name];
    } else if (name in FULL_TEST_VIEWS) {
      views[name] = FULL_TEST_VIEWS[name];
    }
  }
  return views;
}

function fullTestRecord() {
  return {
    chainId: 56,
    txHash: TX,
    contractAddress: TOKEN,
    factoryAddress: FACTORY,
    deployerAddress: DEPLOYER,
    tokenName: "FULL TEST",
    tokenSymbol: "FULL",
    decimals: 9,
    initialSupplyBase: "1000000000000000000",
  } as never;
}

describe("required views ⊆ VERIFY_VIEW_NAMES (structural contract)", () => {
  const SERVICE_SOURCE = readFileSync(join(ROOT, "lib/verify/service.ts"), "utf8");

  function requiredViewNames(): string[] {
    const names = new Set<string>();
    for (const match of SERVICE_SOURCE.matchAll(/(?:bool|big|addr)\("([A-Za-z]+)"\)/g)) {
      names.add(match[1]);
    }
    for (const match of SERVICE_SOURCE.matchAll(/views\["([A-Za-z]+)"\]/g)) {
      names.add(match[1]);
    }
    // Marker presence loop: `for (const marker of ["a", "b"] as const)`.
    for (const block of SERVICE_SOURCE.matchAll(/for \(const marker of \[([^\]]+)\]/g)) {
      for (const name of block[1].matchAll(/"([A-Za-z]+)"/g)) {
        names.add(name[1]);
      }
    }
    return [...names].sort();
  }

  it("every view the service requires is requested by the reader", () => {
    const required = requiredViewNames();
    assert.ok(required.length >= 20, `expected many required views, got ${required.length}`);
    const missing = required.filter((name) => !(VERIFY_VIEW_NAMES as readonly string[]).includes(name));
    assert.deepEqual(missing, [], `views consumed but never read: ${missing.join(", ")}`);
  });

  it("requests all seven production-missing fields", () => {
    for (const name of [
      "burnable",
      "mintable",
      "pausable",
      "maxTxAmount",
      "maxWalletAmount",
      "blacklistEnabled",
      "whitelistEnabled",
    ]) {
      assert.ok(
        (VERIFY_VIEW_NAMES as readonly string[]).includes(name),
        `${name} must be requested`
      );
    }
  });

  it("requests no view twice", () => {
    assert.equal(new Set(VERIFY_VIEW_NAMES).size, VERIFY_VIEW_NAMES.length);
  });
});

describe("reader-faithful FULL TEST reconstruction", () => {
  it("reconstructs all 22 values and encodes byte-exact calldata", async () => {
    const values = await proveProvenanceAndReconstruct(fullTestRecord(), async () => readerShapedViews());
    assert.equal(values.name, "FULL TEST");
    assert.equal(values.symbol, "FULL");
    assert.equal(values.decimals, 9);
    assert.equal(values.owner, DEPLOYER.toLowerCase());
    assert.equal(values.burnable, true);
    assert.equal(values.maxTxAmount, 20000000000000000n);
    assert.equal(values.whitelistEnabled, false);
    assert.equal(values.buyTaxBps, 400n);
    assert.equal(values.maxSupply, 2000000000000000000n);
    const hex = encodeTokenConstructorArgs(values);
    assert.ok(
      REAL_FULL_TEST_TX_INPUT.slice(2).includes(hex),
      "reconstructed encoding must appear verbatim in production calldata"
    );
  });

  it("one missing getter yields evidence-incomplete, never a verdict", async () => {
    const views = readerShapedViews();
    delete views["snipeBlocks"];
    await assert.rejects(
      proveProvenanceAndReconstruct(fullTestRecord(), async () => views),
      (error: unknown) =>
        error instanceof VerifyServiceError &&
        error.code === "evidence-incomplete" &&
        error.retryable === true
    );
  });
});

describe("bounded view recovery", () => {
  const noSleep = async () => {};

  it("recovers when attempts 1-2 are incomplete and 3 succeeds", async () => {
    let calls = 0;
    const delays: number[] = [];
    const values = { ok: true } as never;
    const result = await withBoundedViewRecovery(
      async () => {
        calls += 1;
        if (calls < 3) {
          throw new VerifyServiceError("evidence-incomplete", 503, true, "view snipeBlocks unavailable");
        }
        return values;
      },
      { delaysMs: [400, 800], sleep: async (ms) => { delays.push(ms); } }
    );
    assert.equal(result, values);
    assert.equal(calls, 3);
    assert.deepEqual(delays, [400, 800]);
  });

  it("throws evidence-incomplete after three incomplete attempts", async () => {
    let calls = 0;
    await assert.rejects(
      withBoundedViewRecovery(
        async () => {
          calls += 1;
          throw new VerifyServiceError("evidence-incomplete", 503, true, "token views unavailable");
        },
        { sleep: noSleep }
      ),
      (error: unknown) =>
        error instanceof VerifyServiceError &&
        error.code === "evidence-incomplete" &&
        error.retryable === true
    );
    assert.equal(calls, 3);
  });

  it("never retries terminal provenance failures", async () => {
    for (const terminal of [
      new VerifyServiceError("non-bnbtokermaker", 422, false, "factory provenance missing"),
      new VerifyServiceError("evidence-incomplete", 503, true, "constructor evidence malformed"),
      new Error("boom"),
    ]) {
      let calls = 0;
      await assert.rejects(
        withBoundedViewRecovery(
          async () => {
            calls += 1;
            throw terminal;
          },
          { sleep: noSleep }
        ),
        (error: unknown) => error === terminal
      );
      assert.equal(calls, 1);
    }
  });

  it("classifies retryable evidence errors by code and suffix", () => {
    assert.equal(
      isRetryableEvidenceError(
        new VerifyServiceError("evidence-incomplete", 503, true, "view burnable unavailable")
      ),
      true
    );
    assert.equal(
      isRetryableEvidenceError(
        new VerifyServiceError("evidence-incomplete", 503, true, "constructor evidence malformed")
      ),
      false
    );
    assert.equal(
      isRetryableEvidenceError(
        new VerifyServiceError("non-bnbtokermaker", 422, false, "x unavailable")
      ),
      false
    );
    assert.equal(isRetryableEvidenceError(new Error("x unavailable")), false);
  });
});

describe("terminal failures take exactly one attempt end to end", () => {
  async function genuineDeps(overrides: Record<string, unknown> = {}) {
    const topics = encodeEventTopics({
      abi: factoryAbi as unknown as Abi,
      eventName: "TokenCreated",
      args: { token: TOKEN, creator: DEPLOYER, owner: DEPLOYER },
    });
    const data = encodeAbiParameters(
      [{ type: "string" }, { type: "string" }, { type: "uint8" }, { type: "uint256" }, { type: "uint256" }],
      ["FULL TEST", "FULL", 18, 100n, 0n]
    );
    const store = new InMemoryVerificationStore();
    return {
      store,
      chain: {
        getTransaction: async () => ({ hash: TX, from: DEPLOYER, to: FACTORY, value: 0n }),
        getTransactionReceipt: async () => ({
          status: "success",
          blockNumber: 1n,
          logs: [{ address: FACTORY, topics: [...topics], data }],
        }),
      },
      expectedFactory: FACTORY,
      quoteForFeatures: async () => ({ pricingVersion: "v1", totalWei: "0" }),
      viewRecovery: { delaysMs: [0, 0], sleep: async () => {} },
      ...overrides,
    };
  }

  it("wrong FACTORY view fails terminal with exactly one view batch", async () => {
    let reads = 0;
    const upstream: string[] = [];
    const views = readerShapedViews({ FACTORY: "0xdddddddddddddddddddddddddddddddddddddddd" });
    const d = await genuineDeps({
      readTokenViews: async () => {
        reads += 1;
        return views;
      },
      fetchImpl: (async () => {
        upstream.push("called");
        throw new Error("must not reach upstream");
      }) as FetchImpl,
    });
    await assert.rejects(
      requestVerification(56, TX, d as never),
      (e: unknown) => e instanceof VerifyServiceError && e.code === "non-bnbtokermaker"
    );
    assert.equal(reads, 1);
    assert.equal(upstream.length, 0);
  });

  it("wrong GENERATOR and wrong owner fail terminal without retry", async () => {
    for (const [field, value] of [
      ["GENERATOR", "SomethingElse"],
      ["owner", "0xdddddddddddddddddddddddddddddddddddddddd"],
    ] as const) {
      let reads = 0;
      const d = await genuineDeps({
        readTokenViews: async () => {
          reads += 1;
          return readerShapedViews({ [field]: value });
        },
        viewRecovery: { delaysMs: [0, 0], sleep: async () => {} },
      });
      await assert.rejects(
        requestVerification(56, TX, d as never),
        (e: unknown) => e instanceof VerifyServiceError && e.code === "non-bnbtokermaker"
      );
      assert.equal(reads, 1, field);
    }
  });

  it("wrong-typed deterministic value fails without blind retry", async () => {
    let reads = 0;
    const d = await genuineDeps({
      readTokenViews: async () => {
        reads += 1;
        return readerShapedViews({ maxSupply: "2000000000000000000" });
      },
      viewRecovery: { delaysMs: [0, 0], sleep: async () => {} },
    });
    await assert.rejects(
      requestVerification(56, TX, d as never),
      (e: unknown) => e instanceof VerifyServiceError && e.code === "evidence-incomplete"
    );
    assert.equal(reads, 1);
  });

  it("transient incomplete views recover through requestVerification", async () => {
    let reads = 0;
    const d = await genuineDeps({
      readTokenViews: async () => {
        reads += 1;
        if (reads < 3) return { name: "FULL TEST" };
        return readerShapedViews();
      },
      fetchImpl: (async (input: string) => {
        if (input.includes("getsourcecode")) {
          return { ok: true, status: 200, json: async () => ({ status: "1", message: "OK", result: [{ SourceCode: "" }] }) };
        }
        return { ok: true, status: 200, json: async () => ({ status: "1", message: "OK", result: "abcDEF123456789" }) };
      }) as FetchImpl,
      viewRecovery: { delaysMs: [0, 0], sleep: async () => {} },
    });
    const original = process.env.BSCSCAN_API_KEY;
    process.env.BSCSCAN_API_KEY = "test-key";
    try {
      const state = await requestVerification(56, TX, d as never);
      assert.equal(state.status, "pending");
      assert.equal(reads, 3);
    } finally {
      if (original === undefined) delete process.env.BSCSCAN_API_KEY;
      else process.env.BSCSCAN_API_KEY = original;
    }
  });

  it("three incomplete attempts preserve honest evidence-incomplete with no row finalized", async () => {
    const d = await genuineDeps({
      readTokenViews: async () => ({ name: "FULL TEST" }),
      viewRecovery: { delaysMs: [0, 0], sleep: async () => {} },
    });
    const error = await requestVerification(56, TX, d as never).then(
      () => null,
      (e: unknown) => e
    );
    assert.ok(error instanceof VerifyServiceError);
    assert.equal(error.code, "evidence-incomplete");
    assert.equal(error.retryable, true);
    const row = await d.store.findByContract(56, TOKEN);
    assert.ok(row !== null && row.status === "not_started" && row.guid === null);
  });
});