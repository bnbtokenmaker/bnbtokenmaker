import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SuccessPanel,
} from "../../../components/DeployFlow";
import {
  fetchWithTimeout,
  runVerificationFlow,
  VERIFICATION_BADGE_COPY,
  VerificationBadge,
  VerificationBadgeView,
  VERIFY_MAX_POLLS,
  VERIFY_POLL_INTERVAL_MS,
  VERIFY_POST_TIMEOUT_MS,
  VERIFY_STATUS_TIMEOUT_MS,
} from "../../../components/VerificationBadge";
import {
  BSC_MAINNET_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
} from "../chains";

/**
 * Verification-badge UI tests. The stateful badge performs its POST/poll
 * cycle in effects (never during render), so static renders prove the
 * initial non-blocking UI; the presentational view proves every state.
 */

const TOKEN = "0x1234567890abcdef1234567890abcdef12345678";
const TX_HASH =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;

const noop = () => {};

function renderSuccess(): string {
  return renderToStaticMarkup(
    createElement(SuccessPanel, {
      name: "Sample Token",
      symbol: "SAMPLE",
      token: TOKEN as `0x${string}`,
      txHash: TX_HASH,
      copied: null,
      onCopy: noop,
      onCreateAnother: noop,
      panelRef: null,
      feePaidWei: null,
      features: null,
      intendedChainId: BSC_MAINNET_CHAIN_ID,
    })
  );
}

function renderView(
  state: "checking" | "pending" | "verified" | "failed",
  explorerUrl: string | null = null,
  showRetry = false
): string {
  return renderToStaticMarkup(
    createElement(VerificationBadgeView, { state, explorerUrl, showRetry, busy: false, onRetry: noop })
  );
}

describe("verification badge — honest states", () => {
  it("renders the checking state on mount without blocking success", () => {
    const html = renderToStaticMarkup(
      createElement(VerificationBadge, {
        chainId: BSC_MAINNET_CHAIN_ID,
        txHash: TX_HASH,
        token: TOKEN as `0x${string}`,
      })
    );
    assert.ok(html.includes("Checking BscScan…"));
    assert.ok(!html.includes("Verified on BscScan"));
  });

  it("renders pending without ever claiming verified", () => {
    const html = renderView("pending");
    assert.ok(html.includes("Verification pending…"));
    assert.ok(!html.includes("Verified on BscScan"));
    assert.ok(!html.includes("Retry"));
  });

  it("renders verified only with the chain-aware BscScan link", () => {
    const url = `https://bscscan.com/address/${TOKEN}`;
    const html = renderView("verified", url);
    assert.ok(html.includes("Verified on BscScan ✓"));
    assert.ok(html.includes(`href="${url}"`));
    assert.ok(!html.includes("Retry"));
  });

  it("renders failed with an explicit retry", () => {
    const html = renderView("failed", null, true);
    assert.ok(html.includes("Verification needs another try"));
    assert.ok(html.includes("Retry verification"));
    assert.ok(!html.includes("Verified on BscScan"));
  });

  it("keeps provenance and BscScan verification separate", () => {
    for (const state of ["checking", "pending", "verified", "failed"] as const) {
      const html = renderView(state, `https://bscscan.com/address/${TOKEN}`, true);
      assert.ok(!html.includes("BNBTOKENMAKER"), state);
      assert.ok(!html.includes("provenance"), state);
    }
  });

  it("uses the required copy", () => {
    assert.equal(VERIFICATION_BADGE_COPY.checking.body, "Checking BscScan…");
    assert.equal(VERIFICATION_BADGE_COPY.pending.body, "Verification pending…");
    assert.equal(VERIFICATION_BADGE_COPY.verified.body, "Verified on BscScan ✓");
    assert.equal(VERIFICATION_BADGE_COPY.failed.body, "Verification needs another try");
  });
});

describe("verification badge — success integration", () => {
  it("success panel mounts the badge without hiding deployment success", () => {
    const html = renderSuccess();
    assert.ok(html.includes("Token deployed"));
    assert.ok(html.includes("Checking BscScan…"));
  });

  it("badge links use the canonical chain-aware explorer helper", () => {
    const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const source = readFileSync(join(ROOT, "components/VerificationBadge.tsx"), "utf8");
    assert.ok(source.includes("v1ExplorerAddressUrl(chainId, token)"));
    const start = source.indexOf("export function VerificationBadge({");
    const end = source.indexOf("\nexport ", start + 10);
    const badgeRegion = source.slice(start, end === -1 ? undefined : end);
    assert.ok(!badgeRegion.includes("bscscan.com"), "badge must not hardcode an explorer host");
    assert.ok(!badgeRegion.includes("testnet"), "badge must not name a testnet host");
  });

  it("badge posts only chainId and txHash (structural)", () => {
    const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const source = readFileSync(join(ROOT, "components/VerificationBadge.tsx"), "utf8");
    assert.ok(source.includes('"/api/deployments/verify"'));
    assert.ok(source.includes("JSON.stringify({ chainId, txHash })"));
  });

  it("badge polls on a bounded cadence", () => {
    const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const source = readFileSync(join(ROOT, "components/VerificationBadge.tsx"), "utf8");
    assert.ok(source.includes("VERIFY_MAX_POLLS"));
    assert.ok(source.includes("VERIFY_POLL_INTERVAL_MS"));
    assert.ok(!/while\s*\(\s*true/.test(source));
  });

  it("testnet success still routes its own chain", () => {
    const html = renderToStaticMarkup(
      createElement(SuccessPanel, {
        name: "Sample Token",
        symbol: "SAMPLE",
        token: TOKEN as `0x${string}`,
        txHash: TX_HASH,
        copied: null,
        onCopy: noop,
        onCreateAnother: noop,
        panelRef: null,
        feePaidWei: null,
        features: null,
        intendedChainId: BSC_TESTNET_CHAIN_ID,
      })
    );
    assert.ok(html.includes("Checking BscScan…"));
  });
});

describe("verification flow runner", () => {
  function track() {
    const states: string[] = [];
    let polls = 0;
    let submits = 0;
    let cancelled = false;
    return {
      states,
      counts: () => ({ polls, submits }),
      cancel: () => {
        cancelled = true;
      },
      submit: (value: string | null) => async () => {
        submits += 1;
        return value;
      },
      poller: (values: Array<string | null>) => async () => {
        polls += 1;
        return values[Math.min(polls - 1, values.length - 1)] ?? null;
      },
      run: (submit: () => Promise<string | null>, pollStatus: () => Promise<string | null>, maxPolls = 3) =>
        runVerificationFlow({
          submit,
          pollStatus,
          maxPolls,
          pollIntervalMs: 5,
          sleep: async () => {},
          onState: (s: string) => {
            states.push(s);
          },
          isCancelled: () => cancelled,
        }),
    };
  }

  it("stops immediately on verified submit without polling", async () => {
    const t = track();
    await t.run(t.submit("verified"), t.poller([]));
    assert.deepEqual(t.states, ["verified"]);
    assert.equal(t.counts().polls, 0);
  });

  it("stops immediately on failed submit", async () => {
    const t = track();
    await t.run(t.submit("failed"), t.poller([]));
    assert.deepEqual(t.states, ["failed"]);
    assert.equal(t.counts().polls, 0);
  });

  it("recovers pending into verified through bounded polls", async () => {
    const t = track();
    await t.run(t.submit("pending"), t.poller(["pending", "verified"]));
    assert.deepEqual(t.states, ["pending", "pending", "verified"]);
    assert.equal(t.counts().polls, 2);
  });

  it("ends exhausted polling in failed so Retry is reachable", async () => {
    const t = track();
    await t.run(t.submit(null), t.poller([null, null, null, null]), 2);
    assert.deepEqual(t.states, ["pending", "pending", "pending", "failed"]);
    assert.equal(t.counts().polls, 2);
  });

  it("treats repeated not_started as exhaustion with Retry", async () => {
    const t = track();
    await t.run(t.submit("not_started"), t.poller(["not_started"]), 2);
    assert.deepEqual(t.states, ["pending", "pending", "pending", "failed"]);
  });

  it("stops calling polls after cancellation", async () => {
    const t = track();
    let calls = 0;
    await t.run(t.submit("pending"), async () => {
      calls += 1;
      t.cancel();
      return "pending";
    });
    assert.equal(calls, 1);
    assert.deepEqual(t.states, ["pending"]);
  });

  it("a fresh run submits exactly once (Retry parity)", async () => {
    const t = track();
    await t.run(t.submit("failed"), t.poller([]));
    await t.run(t.submit("failed"), t.poller([]));
    assert.equal(t.counts().submits, 2);
  });

  it("uses the bounded poll constants", () => {
    assert.equal(VERIFY_MAX_POLLS, 20);
    assert.equal(VERIFY_POLL_INTERVAL_MS, 20_000);
    assert.equal(VERIFY_POST_TIMEOUT_MS, 45_000);
    assert.equal(VERIFY_STATUS_TIMEOUT_MS, 25_000);
  });
});

describe("fetchWithTimeout", () => {
  const originalFetch = globalThis.fetch;

  function stubFetch(
    handler: (input: string, init?: RequestInit) => Promise<unknown>,
    onSignal?: (signal: AbortSignal | null) => void
  ): void {
    (globalThis as { fetch: unknown }).fetch = (async (input: string, init?: RequestInit) => {
      onSignal?.(init?.signal ?? null);
      return handler(input, init);
    }) as never;
  }

  it("resolves normally within budget", async () => {
    stubFetch(async () => ({ ok: true }));
    try {
      const res = (await fetchWithTimeout("https://x", undefined, 1000)) as { ok: boolean };
      assert.equal(res.ok, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects on timeout and aborts the underlying request", async () => {
    let aborted: boolean | null = null;
    stubFetch(
      (_input, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            aborted = true;
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        }),
      (signal) => {
        signal?.addEventListener("abort", () => {
          if (aborted === null) aborted = true;
        });
      }
    );
    try {
      await assert.rejects(fetchWithTimeout("https://x", undefined, 15), /verification-fetch-timeout/);
      assert.equal(aborted, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("propagates parent aborts as non-timeout errors", async () => {
    const controller = new AbortController();
    stubFetch(async () => {
      controller.abort();
      await new Promise((_, reject) => {
        setTimeout(() => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), 5);
      });
      return { ok: true };
    });
    try {
      await assert.rejects(
        fetchWithTimeout("https://x", undefined, 1000, controller.signal),
        (e: unknown) => e instanceof Error && !/verification-fetch-timeout/.test(e.message)
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("verification badge — security posture", () => {
  it("never invokes wallet or signing APIs", () => {
    const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const source = readFileSync(join(ROOT, "components/VerificationBadge.tsx"), "utf8");
    assert.ok(!/wagmi|useConnection|ethereum|signTransaction|signMessage|sendTransaction/i.test(source));
  });

  it("disables Retry while a submit is running", () => {
    const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const source = readFileSync(join(ROOT, "components/VerificationBadge.tsx"), "utf8");
    assert.ok(source.includes("disabled={busy}"));
  });
});
