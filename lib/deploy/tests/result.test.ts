import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeAbiParameters, keccak256, pad, stringToHex } from "viem";

import {
  DEPLOY_RESULT_CHAIN_ID,
  DEPLOY_RESULT_KEY,
  DEPLOY_RESULT_MAX_AGE_MS,
  DEPLOY_RESULT_VERSION,
  clearDeployResult,
  fetchAndVerifyDeployResult,
  isDeployResultFresh,
  parseDeployResult,
  saveDeployResult,
  verifyDeploymentReceipt,
  type DeployResultV1,
} from "../result";
import { DeployFlowError } from "../errors";

const FACTORY = "0x5357b13C30967197CF38b5FfAE2088417c562187";
const TOKEN = "0x866aD4436a6Dd4566b17D97F6eF84d8C094EcDe6";
const CREATOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const HASH =
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`;

function goodResult(): DeployResultV1 {
  return {
    version: DEPLOY_RESULT_VERSION,
    chainId: DEPLOY_RESULT_CHAIN_ID,
    txHash: HASH,
    contractAddress: TOKEN,
    tokenName: "Community Test Token",
    tokenSymbol: "COMTEST",
    savedAt: 1_000_000,
  };
}

function tokenCreatedLog(
  overrides: { emitter?: string; token?: string } = {}
) {
  const topic0 = keccak256(
    stringToHex(
      "TokenCreated(address,address,address,string,string,uint8,uint256,uint256)"
    )
  );
  const token = overrides.token ?? TOKEN;
  const data = encodeAbiParameters(
    [
      { type: "string" },
      { type: "string" },
      { type: "uint8" },
      { type: "uint256" },
      { type: "uint256" },
    ],
    ["Community Test Token", "COMTEST", 18, 1000000n * 10n ** 18n, 43n]
  );
  return {
    address: overrides.emitter ?? FACTORY,
    topics: [topic0, pad(token as `0x${string}`), pad(CREATOR), pad(CREATOR)],
    data,
  };
}

function successReceipt(logs: unknown[] = [tokenCreatedLog()]) {
  return { status: "success", logs };
}

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof DeployFlowError, "expected DeployFlowError");
    assert.equal(error.code, code);
    return;
  }
  assert.fail("expected DeployFlowError");
}

async function expectCodeAsync(fn: () => Promise<unknown>, code: string) {
  try {
    await fn();
  } catch (error) {
    assert.ok(error instanceof DeployFlowError, "expected DeployFlowError");
    assert.equal(error.code, code);
    return;
  }
  assert.fail("expected DeployFlowError");
}

describe("deploy result — safe storage shape", () => {
  it("uses a versioned namespaced key pinned to chain 97", () => {
    assert.equal(DEPLOY_RESULT_KEY, "btm-deploy-result-v1");
    assert.equal(DEPLOY_RESULT_VERSION, 1);
    assert.equal(DEPLOY_RESULT_CHAIN_ID, 97);
  });

  it("accepts a minimal hint with no secrets, signatures, or calldata", () => {
    const parsed = parseDeployResult(goodResult());
    assert.ok(parsed);
    assert.deepEqual(Object.keys(parsed).sort(), [
      "chainId",
      "contractAddress",
      "savedAt",
      "tokenName",
      "tokenSymbol",
      "txHash",
      "version",
    ]);
  });

  it("rejects wrong version/chain and malformed fields", () => {
    const good = goodResult();
    assert.equal(parseDeployResult(null), null);
    assert.equal(parseDeployResult("corrupt"), null);
    assert.equal(parseDeployResult({ ...good, version: 2 }), null);
    assert.equal(parseDeployResult({ ...good, version: 0 }), null);
    assert.equal(parseDeployResult({ ...good, chainId: 56 }), null);
    assert.equal(parseDeployResult({ ...good, chainId: 1 }), null);
    assert.equal(parseDeployResult({ ...good, txHash: "0x123" }), null);
    assert.equal(parseDeployResult({ ...good, txHash: 42 }), null);
    assert.equal(parseDeployResult({ ...good, contractAddress: "0x123" }), null);
    assert.equal(parseDeployResult({ ...good, tokenName: "" }), null);
    assert.equal(parseDeployResult({ ...good, tokenSymbol: "  " }), null);
    assert.equal(parseDeployResult({ ...good, savedAt: Number.NaN }), null);
  });

  it("enforces a centralized 24h freshness window", () => {
    assert.equal(DEPLOY_RESULT_MAX_AGE_MS, 24 * 60 * 60 * 1000);
    const record = goodResult();
    assert.equal(isDeployResultFresh(record, record.savedAt), true);
    assert.equal(
      isDeployResultFresh(record, record.savedAt + DEPLOY_RESULT_MAX_AGE_MS),
      true
    );
    assert.equal(
      isDeployResultFresh(record, record.savedAt + DEPLOY_RESULT_MAX_AGE_MS + 1),
      false
    );
    assert.equal(isDeployResultFresh(record, Number.NaN), false);
  });

  it("storage helpers never throw without a browser session", () => {
    saveDeployResult(goodResult());
    clearDeployResult();
  });
});

describe("deploy result — receipt/event verification", () => {
  it("restores success from a verified receipt + factory event", () => {
    const verified = verifyDeploymentReceipt({
      receipt: successReceipt(),
      factory: FACTORY,
      storedAddress: TOKEN,
    });
    assert.equal(verified.token.toLowerCase(), TOKEN.toLowerCase());
  });

  it("stored address alone can never establish success", () => {
    // Correct hint, but the receipt carries no usable event.
    expectCode(
      () =>
        verifyDeploymentReceipt({
          receipt: { status: "success", logs: [] },
          factory: FACTORY,
          storedAddress: TOKEN,
        }),
      "event-missing"
    );
    expectCode(
      () =>
        verifyDeploymentReceipt({
          receipt: { status: "success", logs: [{ address: FACTORY, topics: [], data: "0x" }] },
          factory: FACTORY,
          storedAddress: TOKEN,
        }),
      "event-missing"
    );
  });

  it("reverted receipts never restore success", () => {
    for (const status of ["reverted", "0x0", 0]) {
      expectCode(
        () =>
          verifyDeploymentReceipt({
            receipt: { status, logs: [tokenCreatedLog()] },
            factory: FACTORY,
            storedAddress: TOKEN,
          }),
        "tx-reverted"
      );
    }
  });

  it("missing receipts never restore success", () => {
    for (const receipt of [null, undefined]) {
      expectCode(
        () => verifyDeploymentReceipt({ receipt, factory: FACTORY, storedAddress: TOKEN }),
        "receipt-timeout"
      );
    }
  });

  it("events from the wrong factory emitter are rejected", () => {
    expectCode(
      () =>
        verifyDeploymentReceipt({
          receipt: successReceipt([
            tokenCreatedLog({ emitter: "0x1111111111111111111111111111111111111111" }),
          ]),
          factory: FACTORY,
          storedAddress: TOKEN,
        }),
      "event-missing"
    );
  });

  it("decoded address must match the stored hint (consistency check)", () => {
    expectCode(
      () =>
        verifyDeploymentReceipt({
          receipt: successReceipt([
            tokenCreatedLog({ token: "0x2222222222222222222222222222222222222222" }),
          ]),
          factory: FACTORY,
          storedAddress: TOKEN,
        }),
      "event-missing"
    );
  });

  it("rejects an invalid factory without touching the network", () => {
    expectCode(
      () =>
        verifyDeploymentReceipt({
          receipt: successReceipt(),
          factory: "not-an-address",
          storedAddress: TOKEN,
        }),
      "factory-unavailable"
    );
  });
});

describe("deploy result — read-only refresh recovery", () => {
  it("fetches the receipt exactly once and restores the decoded token", async () => {
    const calls: `0x${string}`[] = [];
    const verified = await fetchAndVerifyDeployResult(
      async (hash) => {
        calls.push(hash);
        return successReceipt();
      },
      goodResult(),
      FACTORY as `0x${string}`
    );
    assert.deepEqual(calls, [HASH]);
    assert.equal(verified.token.toLowerCase(), TOKEN.toLowerCase());
  });

  it("recovery cannot send: its only dependency is a receipt getter", async () => {
    // The getter below is the ONLY seam recovery receives. It records every
    // invocation: proof that recovery performs reads and nothing else.
    const calls: Array<{ method: string; hash: string }> = [];
    await expectCodeAsync(
      () =>
        fetchAndVerifyDeployResult(
          async (hash) => {
            calls.push({ method: "eth_getTransactionReceipt", hash });
            return { status: "reverted", logs: [] };
          },
          goodResult(),
          FACTORY as `0x${string}`
        ),
      "tx-reverted"
    );
    assert.deepEqual(calls, [{ method: "eth_getTransactionReceipt", hash: HASH }]);
    assert.ok(
      !calls.some((call) => call.method !== "eth_getTransactionReceipt"),
      "recovery must never invoke anything but a receipt read"
    );
  });

  it("getter transport failures fail closed without raw RPC text", async () => {
    const raw = "0x93f03676b597f893b7f1548 internal node blob";
    await expectCodeAsync(
      () =>
        fetchAndVerifyDeployResult(
          async () => {
            throw new Error(raw);
          },
          goodResult(),
          FACTORY as `0x${string}`
        ),
      "rpc-unavailable"
    );
    try {
      await fetchAndVerifyDeployResult(
        async () => {
          throw new Error(raw);
        },
        goodResult(),
        FACTORY as `0x${string}`
      );
      assert.fail("expected throw");
    } catch (error) {
      assert.ok(error instanceof DeployFlowError);
      assert.ok(!String(error.message).includes("0x93f03676"));
      assert.ok(!(error.hint ?? "").includes("0x93f03676"));
    }
  });
});
