import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BscScanError,
  checkVerificationStatus,
  isContractSourceVerified,
  submitVerification,
  type FetchImpl,
} from "../bscscan";

/**
 * Deterministic BscScan V2 client tests. Every upstream interaction goes
 * through an injected fetch stub — no live BscScan calls, no network.
 */

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const GUID = "abcDEF123456789";
const SENTINEL_KEY = "test-sentinel-key-xyz-123";

async function withKey<T>(run: () => Promise<T>): Promise<T> {
  const original = process.env.BSCSCAN_API_KEY;
  process.env.BSCSCAN_API_KEY = SENTINEL_KEY;
  try {
    return await run();
  } finally {
    if (original === undefined) delete process.env.BSCSCAN_API_KEY;
    else process.env.BSCSCAN_API_KEY = original;
  }
}

function jsonBody(payload: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => payload };
}

function stubFetch(
  handler: (url: string, init?: RequestInit) => unknown
): FetchImpl {
  return (async (input: string, init?: RequestInit) => {
    const out = handler(input, init);
    if (out instanceof Error) throw out;
    return out as { ok: boolean; status: number; json(): Promise<unknown> };
  }) as FetchImpl;
}

function acceptGuid() {
  return jsonBody({ status: "1", message: "OK", result: GUID });
}

describe("submit verification", () => {
  it("returns the GUID on acceptance", async () => {
    await withKey(async () => {
      const { guid } = await submitVerification({
        chainId: 56,
        contractAddress: ADDRESS,
        standardJson: '{"language":"Solidity"}',
        constructorArgsHex: "aabbcc",
        fetchImpl: stubFetch(() => acceptGuid()),
      });
      assert.equal(guid, GUID);
    });
  });

  it("sends the documented V2 parameters with raw-hex constructor args", async () => {
    await withKey(async () => {
      let captured = "";
      await submitVerification({
        chainId: 56,
        contractAddress: ADDRESS,
        standardJson: '{"language":"Solidity"}',
        constructorArgsHex: "aabbcc",
        fetchImpl: stubFetch((_url, init) => {
          captured = String((init?.body ?? ""));
          return acceptGuid();
        }),
      });
      const params = new URLSearchParams(captured);
      assert.equal(params.get("module"), "contract");
      assert.equal(params.get("action"), "verifysourcecode");
      assert.equal(params.get("chainid"), "56");
      assert.equal(params.get("codeformat"), "solidity-standard-json-input");
      assert.equal(params.get("contractname"), "contracts/BNBTokenMakerToken.sol:BNBTokenMakerToken");
      assert.equal(params.get("compilerversion"), "v0.8.28+commit.7893614a");
      assert.equal(params.get("constructorArguements"), "aabbcc");
      assert.equal(
        params.get("constructorArguments"),
        "aabbcc",
        "both documented spellings carry the identical raw-hex value"
      );
      assert.equal(params.get("optimizationUsed"), "1");
      assert.equal(params.get("runs"), "200");
      assert.equal(params.get("licenseType"), "3");
      assert.equal(params.get("contractaddress"), ADDRESS);
      assert.ok((params.get("sourceCode") ?? "").includes("Solidity"));
    });
  });

  it("rejects unsupported chains before any upstream use", async () => {
    await withKey(async () => {
      let called = false;
      await assert.rejects(
        submitVerification({
          chainId: 1,
          contractAddress: ADDRESS,
          standardJson: "{}",
          constructorArgsHex: "",
          fetchImpl: stubFetch(() => {
            called = true;
            return acceptGuid();
          }),
        }),
        (error: unknown) => error instanceof BscScanError && error.code === "unsupported-chain"
      );
      assert.equal(called, false);
    });
  });

  it("rejects malformed inputs before any upstream use", async () => {
    await withKey(async () => {
      let called = 0;
      const fetchImpl = stubFetch(() => {
        called += 1;
        return acceptGuid();
      });
      await assert.rejects(
        submitVerification({ chainId: 56, contractAddress: "0x123", standardJson: "{}", constructorArgsHex: "", fetchImpl }),
        (e: unknown) => e instanceof BscScanError && e.code === "invalid-input"
      );
      assert.equal(called, 0);
    });
  });

  it("fails closed without an API key", async () => {
    const original = process.env.BSCSCAN_API_KEY;
    delete process.env.BSCSCAN_API_KEY;
    try {
      await assert.rejects(
        submitVerification({
          chainId: 56,
          contractAddress: ADDRESS,
          standardJson: "{}",
          constructorArgsHex: "",
          fetchImpl: stubFetch(() => acceptGuid()),
        }),
        (e: unknown) => e instanceof BscScanError && e.code === "config-missing-key"
      );
    } finally {
      if (original !== undefined) process.env.BSCSCAN_API_KEY = original;
    }
  });

  it("classifies already-verified as non-retryable", async () => {
    await withKey(async () => {
      const error = await submitVerification({
        chainId: 56,
        contractAddress: ADDRESS,
        standardJson: "{}",
        constructorArgsHex: "",
        fetchImpl: stubFetch(() =>
          jsonBody({ status: "0", message: "NOTOK", result: "Contract source code already verified" })
        ),
      }).then(
        () => null,
        (e: unknown) => e
      );
      assert.ok(error instanceof BscScanError);
      assert.equal(error.code, "already-verified");
      assert.equal(error.retryable, false);
    });
  });

  it("classifies indexing delay as retryable, never terminal", async () => {
    await withKey(async () => {
      for (const result of [
        "Unable to locate ContractCode at 0x817683366DfAF428a4972bcF314731F9728Dbb66",
        "unable to locate  contractcode at 0x1234",
      ]) {
        const error = await submitVerification({
          chainId: 56,
          contractAddress: ADDRESS,
          standardJson: "{}",
          constructorArgsHex: "",
          fetchImpl: stubFetch(() => jsonBody({ status: "0", message: "NOTOK", result })),
        }).then(
          () => null,
          (e: unknown) => e
        );
        assert.ok(error instanceof BscScanError, result);
        assert.equal((error as BscScanError).code, "indexing-delay");
        assert.equal((error as BscScanError).retryable, true);
      }
    });
  });

  it("classifies rate limits as retryable", async () => {
    await withKey(async () => {
      const error = await submitVerification({
        chainId: 56,
        contractAddress: ADDRESS,
        standardJson: "{}",
        constructorArgsHex: "",
        fetchImpl: stubFetch(() => jsonBody({ status: "0", message: "NOTOK", result: "Max rate limit reached" })),
      }).then(
        () => null,
        (e: unknown) => e
      );
      assert.ok(error instanceof BscScanError);
      assert.equal(error.code, "rate-limited");
      assert.equal(error.retryable, true);
    });
  });

  it("classifies compiler/bytecode mismatches as terminal", async () => {
    await withKey(async () => {
      for (const result of [
        "Fail - Unable to verify: compiled bytecode does not match",
        "Error! Compiler version mismatch",
      ]) {
        const error = await submitVerification({
          chainId: 56,
          contractAddress: ADDRESS,
          standardJson: "{}",
          constructorArgsHex: "",
          fetchImpl: stubFetch(() => jsonBody({ status: "0", message: "NOTOK", result })),
        }).then(
          () => null,
          (e: unknown) => e
        );
        assert.ok(error instanceof BscScanError, result);
        assert.equal((error as BscScanError).code, "compiler-mismatch");
        assert.equal((error as BscScanError).retryable, false);
      }
    });
  });

  it("classifies timeouts, network errors and 5xx as retryable", async () => {
    await withKey(async () => {
      const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
      for (const [label, failure] of [
        ["abort", abort],
        ["network", new Error("fetch failed")],
        ["http-500", jsonBody({}, false, 500)],
      ] as const) {
        const error = await submitVerification({
          chainId: 56,
          contractAddress: ADDRESS,
          standardJson: "{}",
          constructorArgsHex: "",
          fetchImpl: stubFetch(() => {
            if (failure instanceof Error) throw failure;
            return failure;
          }),
        }).then(
          () => null,
          (e: unknown) => e
        );
        assert.ok(error instanceof BscScanError, label);
        assert.equal((error as BscScanError).retryable, true, label);
      }
    });
  });

  it("classifies malformed upstream responses as retryable", async () => {
    await withKey(async () => {
      const error = await submitVerification({
        chainId: 56,
        contractAddress: ADDRESS,
        standardJson: "{}",
        constructorArgsHex: "",
        fetchImpl: stubFetch(() => ({ ok: true, status: 200, json: async () => { throw new Error("bad json"); } })),
      }).then(
        () => null,
        (e: unknown) => e
      );
      assert.ok(error instanceof BscScanError);
      assert.equal(error.code, "malformed-response");
      assert.equal(error.retryable, true);
    });
  });

  it("never leaks the API key into error text", async () => {
    await withKey(async () => {
      const error = await submitVerification({
        chainId: 56,
        contractAddress: ADDRESS,
        standardJson: "{}",
        constructorArgsHex: "",
        fetchImpl: stubFetch(() => jsonBody({ status: "0", message: "NOTOK", result: "weird" })),
      }).then(
        () => null,
        (e: unknown) => e
      );
      assert.ok(error instanceof Error);
      assert.ok(!error.message.includes(SENTINEL_KEY));
    });
  });
});

describe("verification status", () => {
  function statusFetch(result: string) {
    return stubFetch(() => jsonBody({ status: "1", message: "OK", result }));
  }

  it("reports pending", async () => {
    await withKey(async () => {
      assert.deepEqual(
        await checkVerificationStatus({ chainId: 56, guid: GUID, fetchImpl: statusFetch("Pending in queue") }),
        { state: "pending" }
      );
    });
  });

  it("reports verified", async () => {
    await withKey(async () => {
      assert.deepEqual(
        await checkVerificationStatus({ chainId: 56, guid: GUID, fetchImpl: statusFetch("Pass - Verified") }),
        { state: "verified", alreadyKnown: false }
      );
    });
  });

  it("reports already-verified as verified", async () => {
    await withKey(async () => {
      assert.deepEqual(
        await checkVerificationStatus({
          chainId: 56,
          guid: GUID,
          fetchImpl: statusFetch("Contract source code already verified"),
        }),
        { state: "verified", alreadyKnown: true }
      );
    });
  });

  it("reports terminal failure with detail", async () => {
    await withKey(async () => {
      assert.deepEqual(
        await checkVerificationStatus({
          chainId: 56,
          guid: GUID,
          fetchImpl: statusFetch("Fail - Unable to verify"),
        }),
        { state: "failed", terminal: true, detail: "Fail - Unable to verify" }
      );
    });
  });

  it("treats unknown GUIDs as retryable (propagation delay)", async () => {
    await withKey(async () => {
      const error = await checkVerificationStatus({
        chainId: 56,
        guid: GUID,
        fetchImpl: statusFetch("Invalid GUID"),
      }).then(
        () => null,
        (e: unknown) => e
      );
      assert.ok(error instanceof BscScanError);
      assert.equal(error.code, "guid-unknown");
      assert.equal(error.retryable, true);
    });
  });

  it("throws retryable on rate limits", async () => {
    await withKey(async () => {
      const error = await checkVerificationStatus({
        chainId: 56,
        guid: GUID,
        fetchImpl: statusFetch("Max rate limit reached, please use API Key"),
      }).then(
        () => null,
        (e: unknown) => e
      );
      assert.ok(error instanceof BscScanError);
      assert.equal(error.code, "rate-limited");
    });
  });
});

describe("source-verified detection", () => {
  it("returns true when BscScan exposes source", async () => {
    await withKey(async () => {
      assert.equal(
        await isContractSourceVerified({
          chainId: 56,
          contractAddress: ADDRESS,
          fetchImpl: stubFetch(() =>
            jsonBody({ status: "1", message: "OK", result: [{ SourceCode: "{{...}}" }] })
          ),
        }),
        true
      );
    });
  });

  it("returns false when no source is published", async () => {
    await withKey(async () => {
      assert.equal(
        await isContractSourceVerified({
          chainId: 56,
          contractAddress: ADDRESS,
          fetchImpl: stubFetch(() => jsonBody({ status: "1", message: "OK", result: [{ SourceCode: "" }] })),
        }),
        false
      );
    });
  });
});

describe("server-only boundary", () => {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) out.push(...sourceFiles(full));
      else if (/\.tsx?$/.test(entry)) out.push(full);
    }
    return out;
  }

  it("no client component or page imports lib/verify or the API key", () => {
    // Route handlers under app/api are server-only by definition and are
    // the single permitted importer of lib/verify.
    const offenders: string[] = [];
    for (const file of [...sourceFiles(join(ROOT, "components")), ...sourceFiles(join(ROOT, "app"))]) {
      if (file.includes("/app/api/")) continue;
      const content = readFileSync(file, "utf8");
      if (/lib\/verify/.test(content) || /BSCSCAN_API_KEY/.test(content)) {
        offenders.push(file);
      }
    }
    assert.deepEqual(offenders, []);
  });
});

describe("status classifier — production and documented variants", () => {
  function statusFetch(result: unknown) {
    return stubFetch(() => jsonBody({ status: "0", message: "NOTOK", result }));
  }

  async function classifiedAs(result: unknown): Promise<BscScanError | { state: string }> {
    let outcome: unknown = null;
    await withKey(async () => {
      try {
        outcome = await checkVerificationStatus({
          chainId: 56,
          guid: GUID,
          fetchImpl: statusFetch(result),
        });
      } catch (error) {
        outcome = error;
      }
    });
    return outcome as BscScanError | { state: string };
  }

  it("classifies the exact production response as retryable upstream-exception", async () => {
    // Real Etherscan V2 checkverifystatus response captured in production
    // (chain 56 FULL TEST deployment). Committed verbatim as a regression
    // fixture so this failure can never silently return to status-unknown.
    const outcome = await classifiedAs("Other Exception - Please contact us for more information.");
    assert.ok(outcome instanceof BscScanError);
    assert.equal(outcome.code, "upstream-exception");
    assert.equal(outcome.retryable, true);
  });

  it("classifies empty and null results as retryable empty-status", async () => {
    for (const result of ["", "   ", null]) {
      const outcome = await classifiedAs(result);
      assert.ok(outcome instanceof BscScanError, JSON.stringify(result));
      assert.equal((outcome as BscScanError).code, "empty-status");
      assert.equal((outcome as BscScanError).retryable, true);
    }
  });

  it("surfaces Invalid API Key distinctly and non-retryable", async () => {
    const outcome = await classifiedAs("Invalid API Key");
    assert.ok(outcome instanceof BscScanError);
    assert.equal(outcome.code, "key-invalid");
    assert.equal(outcome.retryable, false);
  });

  it("classifies key throttling as retryable with its own code", async () => {
    const outcome = await classifiedAs("Too many invalid api key attempts, please try again later");
    assert.ok(outcome instanceof BscScanError);
    assert.equal(outcome.code, "key-throttled");
    assert.equal(outcome.retryable, true);
  });

  it("classifies shared-pool exhaustion as retryable", async () => {
    const outcome = await classifiedAs(
      "Community Free API limit reached. Resets 2026-06-24 12:00:00 UTC."
    );
    assert.ok(outcome instanceof BscScanError);
    assert.equal(outcome.code, "pool-exhausted");
    assert.equal(outcome.retryable, true);
  });

  it("classifies unsupported free-chain responses as non-retryable", async () => {
    const outcome = await classifiedAs(
      "Free API access is not supported for this chain. Please upgrade your api plan."
    );
    assert.ok(outcome instanceof BscScanError);
    assert.equal(outcome.code, "chain-not-covered");
    assert.equal(outcome.retryable, false);
  });

  it("classifies timeout variants as retryable", async () => {
    for (const result of [
      "Query Timeout occured. Please select a smaller result dataset",
      "Unexpected err, timeout occurred or server too busy. Please try again later",
    ]) {
      const outcome = await classifiedAs(result);
      assert.ok(outcome instanceof BscScanError, result);
      assert.equal((outcome as BscScanError).code, "timeout");
      assert.equal((outcome as BscScanError).retryable, true);
    }
  });

  it("keeps genuinely terminal failures terminal", async () => {
    const outcome = await classifiedAs("Fail - Unable to verify: bytecode mismatch");
    assert.ok(!(outcome instanceof BscScanError));
    assert.deepEqual(outcome, {
      state: "failed",
      terminal: true,
      detail: "Fail - Unable to verify: bytecode mismatch",
    });
  });

  it("keeps arbitrary unknown responses as status-unknown fallback", async () => {
    const outcome = await classifiedAs("Some entirely novel backend message 12345");
    assert.ok(outcome instanceof BscScanError);
    assert.equal(outcome.code, "status-unknown");
    assert.equal(outcome.retryable, true);
  });

  it("never leaks key material in the new codes", async () => {
    await withKey(async () => {
      for (const result of [
        "Other Exception - Please contact us for more information.",
        "",
        "Invalid API Key",
        "Free API access is not supported for this chain.",
      ]) {
        const outcome = await classifiedAs(result);
        assert.ok(outcome instanceof BscScanError);
        assert.ok(!outcome.message.includes(SENTINEL_KEY), outcome.code);
      }
    });
  });
});
