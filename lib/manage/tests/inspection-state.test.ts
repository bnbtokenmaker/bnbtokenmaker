import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyReadFailure,
  evaluateInspectionEvidence,
  fetchInspectionWithRecovery,
  inspectionUiStatus,
  INSPECTION_INCOMPLETE_ERROR,
  INSPECTION_MAX_ATTEMPTS,
  INSPECTION_STATUS_COPY,
  type InspectionEvidence,
} from "../../../components/manage/useTokenData";
import { classifyInspected } from "../probe";
import { classificationLabel, V1_GENERATOR } from "../classification";
import type { InspectionReads } from "../probe";
import type { V1TokenState } from "../../../components/manage/useTokenData";

/**
 * Regression cover for the C24 manage defect: a failed bytecode RPC was
 * normalized into the same state as a successful empty response, so a
 * temporary RPC failure rendered "NO CONTRACT" / "Unsupported token".
 *
 * Failed bytecode MUST NEVER produce "no contract". Rejected reads are
 * conclusive only with contract-level evidence; anything else is retried a
 * bounded number of times, then surfaced as inconclusive with Retry.
 */

const FACTORY = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const KNOWN = new Set([FACTORY.toLowerCase()]);

function basicReads(overrides: Record<string, unknown> = {}) {
  return {
    codeExists: true,
    name: "T",
    symbol: "T",
    decimals: 18,
    totalSupply: 100n,
    ...overrides,
  };
}

function markerReads(overrides: Record<string, unknown> = {}) {
  return {
    factory: FACTORY,
    generator: V1_GENERATOR,
    maxSupply: 200n,
    totalMinted: 100n,
    swapBackEnabled: true,
    ...overrides,
  };
}

function reads(overrides: {
  basic?: Record<string, unknown>;
  markers?: Record<string, unknown>;
  owner?: unknown;
  paused?: unknown;
} = {}): InspectionReads {
  return {
    basic: basicReads(overrides.basic) as InspectionReads["basic"],
    markers: markerReads(overrides.markers) as InspectionReads["markers"],
    owner: (overrides.owner ?? null) as InspectionReads["owner"],
    paused: (overrides.paused ?? null) as InspectionReads["paused"],
  };
}

function emptyReads(): InspectionReads {
  return {
    basic: { codeExists: false, name: null, symbol: null, decimals: null, totalSupply: null },
    markers: { factory: null, generator: null, maxSupply: null, totalMinted: null, swapBackEnabled: null },
    owner: null,
    paused: null,
  };
}

function v1State(): V1TokenState {
  return {
    totalMinted: null,
    maxSupply: null,
    owner: null,
    paused: null,
    tradingEnabled: null,
    buyTaxBps: null,
    sellTaxBps: null,
    marketingWallet: null,
    swapBackEnabled: null,
    antiBotEnabled: null,
    snipeBlocks: null,
    launchBlock: null,
    burnable: null,
    mintable: null,
    pausable: null,
    maxTxAmount: null,
    maxWalletAmount: null,
    blacklistEnabled: null,
    whitelistEnabled: null,
    swapThreshold: null,
    liquidityShareBps: null,
    marketingShareBps: null,
    generator: null,
    factory: null,
    userBalance: null,
  };
}

function contractError(): Error {
  return Object.assign(new Error("execution failed"), {
    name: "ContractFunctionExecutionError",
    cause: Object.assign(new Error("reverted"), {
      name: "ContractFunctionRevertedError",
    }),
  });
}

function infraError(): Error {
  return Object.assign(new Error("HTTP request failed."), {
    name: "HttpRequestError",
    status: 429,
  });
}

describe("read failure classification", () => {
  it("treats contract reverts as conclusive contract-level evidence", () => {
    assert.equal(classifyReadFailure(contractError()), "contract");
  });

  it("treats transport failures as infrastructure", () => {
    assert.equal(classifyReadFailure(infraError()), "infrastructure");
    assert.equal(
      classifyReadFailure(Object.assign(new Error("timed out"), { name: "TimeoutError" })),
      "infrastructure"
    );
  });

  it("fails safe toward infrastructure for unknown errors", () => {
    assert.equal(classifyReadFailure(new Error("boom")), "infrastructure");
    assert.equal(classifyReadFailure(null), "infrastructure");
    assert.equal(classifyReadFailure("weird"), "infrastructure");
  });

  it("treats execution-reverted RPC code 3 as contract-level", () => {
    assert.equal(
      classifyReadFailure(
        Object.assign(new Error("execution reverted"), { name: "RpcRequestError", code: 3 })
      ),
      "contract"
    );
  });
});

describe("inspection evidence evaluation", () => {
  it("never confirms no-contract from a failed bytecode request", () => {
    const outcome = evaluateInspectionEvidence({
      reads: emptyReads(),
      v1: v1State(),
      evidence: { bytecodeOk: false, code: null, viewFailures: [] } satisfies InspectionEvidence,
    });
    assert.equal(outcome.complete, false);
    if (!outcome.complete) {
      assert.equal(outcome.reason, "bytecode-unavailable");
      assert.ok(outcome.failedViews.includes("getBytecode"));
    }
  });

  it("never confirms unsupported from a failed bytecode request either", () => {
    const outcome = evaluateInspectionEvidence({
      reads: reads(),
      v1: v1State(),
      evidence: { bytecodeOk: false, code: null, viewFailures: [] } satisfies InspectionEvidence,
    });
    // Incomplete outcomes carry no classification at all.
    assert.equal(outcome.complete, false);
  });

  it("confirms no-contract only on a successful empty bytecode response", () => {
    const outcome = evaluateInspectionEvidence({
      reads: emptyReads(),
      v1: v1State(),
      evidence: { bytecodeOk: true, code: "0x", viewFailures: [] } satisfies InspectionEvidence,
    });
    assert.equal(outcome.complete, true);
    if (outcome.complete) {
      const c = classifyInspected(outcome.reads, KNOWN);
      assert.equal(c.kind, "unsupported");
      if (c.kind === "unsupported") assert.equal(c.reason, "no-code");
      assert.equal(classificationLabel(c), "No contract at this address");
    }
  });

  it("confirms unsupported when code exists but basic reads conclusively fail", () => {
    const outcome = evaluateInspectionEvidence({
      reads: reads({
        basic: { name: null, symbol: null, decimals: null, totalSupply: null },
        markers: { factory: null, generator: null, maxSupply: null, totalMinted: null, swapBackEnabled: null },
      }),
      v1: v1State(),
      evidence: {
        bytecodeOk: true,
        code: "0x6080",
        viewFailures: [
          { name: "name", kind: "contract" },
          { name: "symbol", kind: "contract" },
          { name: "decimals", kind: "contract" },
          { name: "totalSupply", kind: "contract" },
        ],
      } satisfies InspectionEvidence,
    });
    assert.equal(outcome.complete, true);
    if (outcome.complete) {
      const c = classifyInspected(outcome.reads, KNOWN);
      assert.equal(c.kind, "unsupported");
      if (c.kind === "unsupported") assert.equal(c.reason, "no-basic-reads");
      assert.equal(classificationLabel(c), "Unsupported token");
    }
  });

  it("classifies complete valid V1 evidence as own-v1", () => {
    const outcome = evaluateInspectionEvidence({
      reads: reads({ owner: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", paused: false }),
      v1: v1State(),
      evidence: { bytecodeOk: true, code: "0x6080604052", viewFailures: [] } satisfies InspectionEvidence,
    });
    assert.equal(outcome.complete, true);
    if (outcome.complete) {
      const c = classifyInspected(outcome.reads, KNOWN);
      assert.equal(c.kind, "own-v1");
      assert.equal(classificationLabel(c), "Created with BNBTokenMaker");
    }
  });

  it("holds incomplete when required reads fail at the transport level", () => {
    const outcome = evaluateInspectionEvidence({
      reads: reads(),
      v1: v1State(),
      evidence: {
        bytecodeOk: true,
        code: "0x6080604052",
        viewFailures: [{ name: "FACTORY", kind: "infrastructure" }],
      } satisfies InspectionEvidence,
    });
    assert.equal(outcome.complete, false);
    if (!outcome.complete) {
      assert.equal(outcome.reason, "required-reads-incomplete");
      assert.deepEqual(outcome.failedViews, ["FACTORY"]);
    }
  });
});

describe("bounded inspection recovery", () => {
  function completeAttempt() {
    return {
      reads: reads({ owner: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", paused: false }),
      v1: v1State(),
      evidence: { bytecodeOk: true, code: "0x6080604052", viewFailures: [] } satisfies InspectionEvidence,
    };
  }

  function incompleteAttempt() {
    return {
      reads: emptyReads(),
      v1: v1State(),
      evidence: { bytecodeOk: false, code: null, viewFailures: [] } satisfies InspectionEvidence,
    };
  }

  it("recovers to the correct classification after transient failures", async () => {
    const calls: Array<"bad" | "good"> = [];
    const attempted: number[] = [];
    const result = await fetchInspectionWithRecovery({
      delaysMs: [0, 0],
      onAttempt: (attempt) => {
        attempted.push(attempt);
      },
      inspectOnce: async () => {
        calls.push(calls.length < 2 ? "bad" : "good");
        return calls[calls.length - 1] === "good" ? completeAttempt() : incompleteAttempt();
      },
    });
    assert.deepEqual(attempted, [1, 2, 3]);
    assert.equal(result.attempts, 3);
    assert.equal(classifyInspected(result.reads, KNOWN).kind, "own-v1");
  });

  it("recovers a temporary bytecode failure into own-v1, never no-contract", async () => {
    let calls = 0;
    const result = await fetchInspectionWithRecovery({
      delaysMs: [0, 0],
      inspectOnce: async () => {
        calls += 1;
        return calls === 1 ? incompleteAttempt() : completeAttempt();
      },
    });
    assert.equal(result.attempts, 2);
    assert.equal(classifyInspected(result.reads, KNOWN).kind, "own-v1");
  });

  it("stops after a bounded number of attempts and throws incomplete", async () => {
    const attempted: number[] = [];
    await assert.rejects(
      fetchInspectionWithRecovery({
        delaysMs: [0, 0],
        onAttempt: (attempt) => {
          attempted.push(attempt);
        },
        inspectOnce: async () => incompleteAttempt(),
      }),
      (error: unknown) =>
        error instanceof Error && error.message.startsWith(INSPECTION_INCOMPLETE_ERROR)
    );
    assert.equal(attempted.length, INSPECTION_MAX_ATTEMPTS);
    assert.deepEqual(attempted, [1, 2, 3]);
  });

  it("bounds automatic recovery to a small number of attempts", () => {
    assert.ok(INSPECTION_MAX_ATTEMPTS >= 2 && INSPECTION_MAX_ATTEMPTS <= 5);
  });
});

describe("inspection UI status", () => {
  it("distinguishes loading, recovering, ready, inconclusive and error", () => {
    const base = { enabled: true, hasData: false, recoveryAttempt: 0 };
    assert.equal(
      inspectionUiStatus({ ...base, isPending: true, isError: false, error: null }),
      "loading"
    );
    assert.equal(
      inspectionUiStatus({ ...base, isPending: true, isError: false, error: null, recoveryAttempt: 2 }),
      "recovering"
    );
    assert.equal(
      inspectionUiStatus({ ...base, isPending: false, isError: false, error: null, hasData: true }),
      "ready"
    );
    assert.equal(
      inspectionUiStatus({
        ...base,
        isPending: false,
        isError: true,
        error: new Error(`${INSPECTION_INCOMPLETE_ERROR}: getBytecode`),
      }),
      "inconclusive"
    );
    assert.equal(
      inspectionUiStatus({ ...base, isPending: false, isError: true, error: new Error("rpc-unavailable") }),
      "error"
    );
    assert.equal(
      inspectionUiStatus({ ...base, enabled: false, isPending: false, isError: false, error: null }),
      "idle"
    );
  });

  it("uses the required recovery copy", () => {
    assert.equal(
      INSPECTION_STATUS_COPY.recovering.title,
      "Chain data is temporarily incomplete. Checking again…"
    );
    assert.equal(
      INSPECTION_STATUS_COPY.inconclusive.body,
      "We couldn't complete the on-chain inspection. Your contract may still exist. Please retry."
    );
  });
});

describe("dashboard inspection wiring", () => {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const TOKEN_DASHBOARD = readFileSync(join(ROOT, "components/manage/TokenDashboard.tsx"), "utf8");

  it("renders recovery and inconclusive states instead of a premature verdict", () => {
    assert.ok(TOKEN_DASHBOARD.includes("INSPECTION_STATUS_COPY.recovering"));
    assert.ok(TOKEN_DASHBOARD.includes("INSPECTION_STATUS_COPY.inconclusive"));
  });

  it("only renders management content from complete inspection data", () => {
    assert.ok(TOKEN_DASHBOARD.includes("{data && <DashboardBody"));
  });
});
