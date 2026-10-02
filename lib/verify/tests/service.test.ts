import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeAbiParameters, encodeEventTopics, type Abi } from "viem";

import { factoryAbi } from "../../token/factory";
import { InMemoryVerificationStore } from "../store";
import {
  pollVerificationStatus,
  requestVerification,
  VerifyServiceError,
} from "../service";
import type { FetchImpl } from "../bscscan";
import type { ChainReader } from "../../deployments/verify";

/**
 * Deterministic verification-service tests. Chain, storage, BscScan and
 * time are all injected fakes — no network, no key, no database.
 */

const FACTORY = "0xd7de07de5113efa6cf0c213914ed7f0df60b682c" as `0x${string}`;
const TOKEN = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;
const DEPLOYER = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`;
const TX = "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as `0x${string}`;
const GUID = "verifyGuid123456";
const SENTINEL_KEY = "test-sentinel-key-xyz-123";

function tokenCreatedLog() {
  const topics = encodeEventTopics({
    abi: factoryAbi as unknown as Abi,
    eventName: "TokenCreated",
    args: { token: TOKEN, creator: DEPLOYER, owner: DEPLOYER },
  });
  const data = encodeAbiParameters(
    [
      { type: "string" },
      { type: "string" },
      { type: "uint8" },
      { type: "uint256" },
      { type: "uint256" },
    ],
    ["T", "T", 18, 100n, 0n]
  );
  return {
    address: FACTORY,
    topics: [...topics] as [`0x${string}`, ...`0x${string}`[]],
    data: data as `0x${string}`,
  };
}

function fakeChain(overrides: Partial<ChainReader> = {}): ChainReader & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    getTransaction: async () => {
      calls.push("getTransaction");
      return { hash: TX, from: DEPLOYER, to: FACTORY, value: 0n };
    },
    getTransactionReceipt: async () => {
      calls.push("getTransactionReceipt");
      return { status: "success", blockNumber: 1n, logs: [tokenCreatedLog()] };
    },
    ...overrides,
  };
}

function fullViews(): Record<string, unknown> {
  return {
    name: "T",
    symbol: "T",
    decimals: 18,
    totalSupply: 100n,
    FACTORY,
    GENERATOR: "BNBTokenMaker.com",
    maxSupply: 0n,
    totalMinted: 100n,
    swapBackEnabled: false,
    owner: DEPLOYER,
    paused: false,
    burnable: false,
    mintable: false,
    pausable: false,
    maxTxAmount: 0n,
    maxWalletAmount: 0n,
    blacklistEnabled: false,
    whitelistEnabled: false,
    tradingEnabled: false,
    buyTaxBps: 0n,
    sellTaxBps: 0n,
    marketingWallet: "0x0000000000000000000000000000000000000000",
    marketingShareBps: 0n,
    liquidityShareBps: 0n,
    autoLiquidityEnabled: false,
    swapThreshold: 0n,
    antiBotEnabled: false,
    snipeBlocks: 0n,
  };
}

function jsonBody(payload: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => payload };
}

function stubFetch(
  handler: (url: string, init?: RequestInit) => unknown,
  calls: string[] = []
): FetchImpl {
  return (async (input: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${input.split("?")[0]}`);
    const out = handler(input, init);
    if (out instanceof Error) throw out;
    return out as { ok: boolean; status: number; json(): Promise<unknown> };
  }) as FetchImpl;
}

function acceptGuid(calls: string[] = []) {
  return stubFetch((url) => {
    if (url.includes("getsourcecode")) {
      return jsonBody({ status: "1", message: "OK", result: [{ SourceCode: "" }] });
    }
    return jsonBody({ status: "1", message: "OK", result: GUID });
  }, calls);
}

function withKey<T>(run: () => Promise<T>): Promise<T> {
  const original = process.env.BSCSCAN_API_KEY;
  process.env.BSCSCAN_API_KEY = SENTINEL_KEY;
  return run().finally(() => {
    if (original === undefined) delete process.env.BSCSCAN_API_KEY;
    else process.env.BSCSCAN_API_KEY = original;
  });
}

function deps(overrides: Record<string, unknown> = {}) {
  const store = new InMemoryVerificationStore();
  return {
    store,
    chain: fakeChain(),
    expectedFactory: FACTORY,
    quoteForFeatures: async () => ({ pricingVersion: "v1", totalWei: "0" }),
    readTokenViews: async () => fullViews(),
    ...overrides,
  };
}

describe("requestVerification", () => {
  it("accepts a genuine chain-56 deployment and persists the GUID", async () => {
    await withKey(async () => {
      const upstream: string[] = [];
      const d = deps({ fetchImpl: acceptGuid(upstream) });
      const state = await requestVerification(56, TX, d as never);
      assert.equal(state.status, "pending");
      assert.equal(state.contractAddress, TOKEN.toLowerCase());
      assert.equal(state.alreadyKnown, false);
      const row = await d.store.findByContract(56, TOKEN);
      assert.equal(row?.guid, GUID);
      assert.equal(row?.status, "pending");
      assert.ok(upstream.length >= 2, "expected getsourcecode + submit calls");
    });
  });

  it("derives the token address server-side from {chainId, txHash} only", async () => {
    await withKey(async () => {
      const d = deps({ fetchImpl: acceptGuid() });
      // No tokenAddress anywhere in the request surface.
      const state = await requestVerification(56, TX, d as never);
      assert.equal(state.contractAddress, TOKEN.toLowerCase());
    });
  });

  it("rejects unsupported chains before any chain/key use", async () => {
    const d = deps({ expectedFactory: null, fetchImpl: acceptGuid() });
    await assert.rejects(
      requestVerification(1, TX, d as never),
      (e: unknown) => e instanceof VerifyServiceError && e.code === "invalid-request"
    );
  });

  it("rejects malformed tx hashes without side effects", async () => {
    const d = deps({ fetchImpl: acceptGuid() });
    await assert.rejects(
      requestVerification(56, "0x123", d as never),
      (e: unknown) => e instanceof VerifyServiceError && e.code === "invalid-request"
    );
    assert.equal((d.chain as unknown as { calls: string[] }).calls.length, 0);
  });

  it("rejects spoofed deployments before any API key use", async () => {
    await withKey(async () => {
      const upstream: string[] = [];
      const chain = fakeChain({
        getTransaction: async () => {
          (chain as unknown as { calls: string[] }).calls.push("getTransaction");
          return { hash: TX, from: DEPLOYER, to: "0xdddddddddddddddddddddddddddddddddddddddd", value: 0n };
        },
      });
      const d = deps({ chain, fetchImpl: acceptGuid(upstream) });
      await assert.rejects(
        requestVerification(56, TX, d as never),
        (e: unknown) => e instanceof VerifyServiceError && e.code === "factory-mismatch"
      );
      assert.equal(upstream.length, 0);
      assert.equal(await d.store.findByContract(56, TOKEN), null);
    });
  });

  it("rejects reverted transactions", async () => {
    await withKey(async () => {
      const chain = fakeChain({
        getTransactionReceipt: async () => ({
          status: "reverted",
          blockNumber: 1n,
          logs: [],
        }),
      });
      const d = deps({ chain, fetchImpl: acceptGuid() });
      await assert.rejects(
        requestVerification(56, TX, d as never),
        (e: unknown) => e instanceof VerifyServiceError && e.code === "tx-reverted"
      );
    });
  });

  it("rejects non-factory tokens before any API key use", async () => {
    await withKey(async () => {
      const upstream: string[] = [];
      const views = fullViews();
      views["GENERATOR"] = "SomethingElse";
      const d = deps({
        readTokenViews: async () => views,
        fetchImpl: acceptGuid(upstream),
      });
      await assert.rejects(
        requestVerification(56, TX, d as never),
        (e: unknown) => e instanceof VerifyServiceError && e.code === "non-bnbtokermaker"
      );
      assert.equal(upstream.length, 0);
    });
  });

  it("does not resubmit while a GUID is pending", async () => {
    await withKey(async () => {
      const upstream: string[] = [];
      const d = deps({ fetchImpl: acceptGuid(upstream) });
      await requestVerification(56, TX, d as never);
      const submitCalls = upstream.length;
      const again = await requestVerification(56, TX, d as never);
      assert.equal(again.status, "pending");
      assert.equal(upstream.length, submitCalls, "duplicate request must not resubmit");
    });
  });

  it("marks already-verified without submitting", async () => {
    await withKey(async () => {
      const upstream: string[] = [];
      const d = deps({
        fetchImpl: stubFetch((url) => {
          if (url.includes("getsourcecode")) {
            return jsonBody({ status: "1", message: "OK", result: [{ SourceCode: "{{...}}" }] });
          }
          return jsonBody({ status: "1", message: "OK", result: GUID });
        }, upstream),
      });
      const state = await requestVerification(56, TX, d as never);
      assert.equal(state.status, "verified");
      assert.equal(state.alreadyKnown, true);
      assert.ok(!upstream.some((c) => c.includes("verifysourcecode") || c.includes("action=verifysourcecode")));
      const row = await d.store.findByContract(56, TOKEN);
      assert.equal(row?.status, "verified");
      assert.equal(row?.guid, null);
    });
  });

  it("proceeds to submit when getsourcecode is transiently unavailable", async () => {
    await withKey(async () => {
      const d = deps({
        fetchImpl: stubFetch((url) => {
          if (url.includes("getsourcecode")) throw new Error("fetch failed");
          return jsonBody({ status: "1", message: "OK", result: GUID });
        }),
      });
      const state = await requestVerification(56, TX, d as never);
      assert.equal(state.status, "pending");
    });
  });

  it("keeps retryable submission failures pending without a GUID", async () => {
    await withKey(async () => {
      const d = deps({
        fetchImpl: stubFetch((url) => {
          if (url.includes("getsourcecode")) {
            return jsonBody({ status: "1", message: "OK", result: [{ SourceCode: "" }] });
          }
          return jsonBody({ status: "0", message: "NOTOK", result: "Max rate limit reached" });
        }),
      });
      const error = await requestVerification(56, TX, d as never).then(
        () => null,
        (e: unknown) => e
      );
      assert.ok(error instanceof VerifyServiceError);
      assert.equal(error.retryable, true);
      const row = await d.store.findByContract(56, TOKEN);
      assert.equal(row?.status, "pending");
      assert.equal(row?.guid, null);
    });
  });

  it("records terminal compiler mismatches without resubmitting", async () => {
    await withKey(async () => {
      const upstream: string[] = [];
      const d = deps({
        fetchImpl: stubFetch((url) => {
          if (url.includes("getsourcecode")) {
            return jsonBody({ status: "1", message: "OK", result: [{ SourceCode: "" }] });
          }
          return jsonBody({ status: "0", message: "NOTOK", result: "Fail - Unable to verify" });
        }, upstream),
      });
      const error = await requestVerification(56, TX, d as never).then(
        () => null,
        (e: unknown) => e
      );
      assert.ok(error instanceof VerifyServiceError);
      assert.equal(error.retryable, false);
      const row = await d.store.findByContract(56, TOKEN);
      assert.equal(row?.status, "failed");
      const calls = upstream.length;
      const again = await requestVerification(56, TX, d as never);
      assert.equal(again.status, "failed");
      assert.equal(upstream.length, calls, "terminal failure must not resubmit");
    });
  });

  it("never exposes key material in errors", async () => {
    await withKey(async () => {
      const d = deps({
        fetchImpl: stubFetch(() => {
          throw new Error("boom");
        }),
      });
      const error = await requestVerification(56, TX, d as never).then(
        () => null,
        (e: unknown) => e
      );
      assert.ok(error instanceof Error);
      assert.ok(!error.message.includes(SENTINEL_KEY));
    });
  });
});

describe("pollVerificationStatus", () => {
  async function pendingRow() {
    const d = deps({ fetchImpl: acceptGuid() });
    await withKey(async () => {
      await requestVerification(56, TX, d as never);
    });
    return d;
  }

  it("returns stored pending without upstream use inside the min interval", async () => {
    const upstream: string[] = [];
    const d = await pendingRow();
    (d as unknown as { fetchImpl: unknown }).fetchImpl = stubFetch(
      () => jsonBody({ status: "1", message: "OK", result: "Pass - Verified" }),
      upstream
    );
    const state = await pollVerificationStatus(56, TOKEN, d as never);
    assert.equal(state.status, "pending");
    assert.equal(upstream.length, 0);
  });

  it("transitions to verified on upstream pass after the interval", async () => {
    const d = await pendingRow();
    const future = Date.now() + 3600_000;
    (d as unknown as { nowMs: unknown }).nowMs = () => future;
    (d as unknown as { fetchImpl: unknown }).fetchImpl = stubFetch(() =>
      jsonBody({ status: "1", message: "OK", result: "Pass - Verified" })
    );
    const original = process.env.BSCSCAN_API_KEY;
    process.env.BSCSCAN_API_KEY = "test-key";
    try {
      const state = await pollVerificationStatus(56, TOKEN, d as never);
      assert.equal(state.status, "verified");
      assert.equal(state.alreadyKnown, false);
      const row = await d.store.findByContract(56, TOKEN);
      assert.equal(row?.status, "verified");
      assert.ok(row?.verifiedAt instanceof Date);
    } finally {
      if (original === undefined) delete process.env.BSCSCAN_API_KEY;
      else process.env.BSCSCAN_API_KEY = original;
    }
  });

  it("recovers persisted state across service instances (refresh/restart)", async () => {
    const d = await pendingRow();
    const fresh = deps({});
    (fresh as unknown as { store: unknown }).store = d.store;
    const state = await pollVerificationStatus(56, TOKEN, fresh as never);
    assert.equal(state.status, "pending");
    assert.equal(state.attempts, 1);
  });

  it("returns not_started for unknown contracts", async () => {
    const d = deps({});
    const state = await pollVerificationStatus(56, TOKEN, d as never);
    assert.equal(state.status, "not_started");
  });

  it("rejects malformed addresses", async () => {
    const d = deps({});
    await assert.rejects(
      pollVerificationStatus(56, "0x123", d as never),
      (e: unknown) => e instanceof VerifyServiceError && e.code === "invalid-request"
    );
  });
});
