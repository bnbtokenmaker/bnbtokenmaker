import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  INITIAL_DEPLOY_STATE,
  DeployTransitionError,
  hasSubmittedTx,
  isDeployLocked,
  transition,
  type DeployState,
} from "../machine";

const HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

function expectIllegal(state: DeployState, event: Parameters<typeof transition>[1]) {
  try {
    transition(state, event);
  } catch (error) {
    assert.ok(error instanceof DeployTransitionError);
    return;
  }
  assert.fail(`expected illegal transition ${event.type} from ${state.phase}`);
}

describe("deploy state machine — happy path", () => {
  it("walks idle → review → validating → awaiting_wallet → broadcasting → confirming → success", () => {
    let state = INITIAL_DEPLOY_STATE;
    state = transition(state, { type: "START_REVIEW" });
    assert.equal(state.phase, "review");
    state = transition(state, { type: "BEGIN_VALIDATE" });
    assert.equal(state.phase, "validating");
    assert.ok(isDeployLocked(state));
    state = transition(state, { type: "VALID_OK" });
    assert.equal(state.phase, "awaiting_wallet");
    state = transition(state, { type: "TX_SENT", txHash: HASH });
    assert.equal(state.phase, "broadcasting");
    assert.equal(state.txHash, HASH);
    assert.ok(hasSubmittedTx(state));
    state = transition(state, { type: "RECEIPT_WAIT" });
    assert.equal(state.phase, "confirming");
    state = transition(state, { type: "RECEIPT_OK" });
    assert.equal(state.phase, "success");
    assert.equal(state.txHash, HASH);
    assert.ok(!isDeployLocked(state));
  });
});

describe("deploy state machine — duplicate submission protection", () => {
  it("locks the deploy action while validating/awaiting/broadcasting/confirming", () => {
    const locked: DeployState["phase"][] = [
      "validating",
      "awaiting_wallet",
      "broadcasting",
      "confirming",
    ];
    for (const phase of locked) {
      assert.ok(
        isDeployLocked({ phase, txHash: null, errorCode: null }),
        `${phase} must be locked`
      );
    }
    for (const phase of ["idle", "review", "success", "error"] as const) {
      assert.ok(!isDeployLocked({ phase, txHash: null, errorCode: null }));
    }
  });

  it("rejects BEGIN_VALIDATE unless in review (double-click safe)", () => {
    expectIllegal({ phase: "idle", txHash: null, errorCode: null }, { type: "BEGIN_VALIDATE" });
    expectIllegal({ phase: "validating", txHash: null, errorCode: null }, { type: "BEGIN_VALIDATE" });
    expectIllegal({ phase: "awaiting_wallet", txHash: null, errorCode: null }, { type: "BEGIN_VALIDATE" });
    expectIllegal({ phase: "confirming", txHash: HASH, errorCode: null }, { type: "BEGIN_VALIDATE" });
    expectIllegal({ phase: "success", txHash: HASH, errorCode: null }, { type: "BEGIN_VALIDATE" });
  });

  it("rejects TX_SENT unless awaiting wallet, and rejects malformed hashes", () => {
    expectIllegal({ phase: "validating", txHash: null, errorCode: null }, { type: "TX_SENT", txHash: HASH });
    expectIllegal({ phase: "confirming", txHash: HASH, errorCode: null }, { type: "TX_SENT", txHash: HASH });
    try {
      transition(
        { phase: "awaiting_wallet", txHash: null, errorCode: null },
        { type: "TX_SENT", txHash: "0x123" as `0x${string}` }
      );
    } catch (error) {
      assert.ok(error instanceof DeployTransitionError);
      return;
    }
    assert.fail("expected malformed hash to be rejected");
  });
});

describe("deploy state machine — error and retry safety", () => {
  it("wallet rejection lands in error with NO hash (nothing submitted)", () => {
    const state = transition(
      { phase: "awaiting_wallet", txHash: null, errorCode: null },
      { type: "WALLET_REJECTED", code: "user-rejected" }
    );
    assert.equal(state.phase, "error");
    assert.equal(state.txHash, null);
    assert.equal(state.errorCode, "user-rejected");
    assert.ok(!hasSubmittedTx(state));
  });

  it("receipt failure KEEPS the hash (submitted but unknown)", () => {
    const state = transition(
      { phase: "confirming", txHash: HASH, errorCode: null },
      { type: "RECEIPT_FAIL", code: "receipt-timeout" }
    );
    assert.equal(state.phase, "error");
    assert.equal(state.txHash, HASH);
    assert.ok(hasSubmittedTx(state));
  });

  it("retry after a hash re-checks the SAME receipt instead of resubmitting", () => {
    const state = transition(
      { phase: "error", txHash: HASH, errorCode: "receipt-timeout" },
      { type: "RETRY" }
    );
    assert.equal(state.phase, "confirming");
    assert.equal(state.txHash, HASH);
    // From confirming, no path builds a new transaction: TX_SENT is illegal.
    expectIllegal(state, { type: "TX_SENT", txHash: HASH });
    expectIllegal(state, { type: "BEGIN_VALIDATE" });
  });

  it("retry before any hash re-runs validation (no automatic resubmission)", () => {
    const state = transition(
      { phase: "error", txHash: null, errorCode: "user-rejected" },
      { type: "RETRY" }
    );
    assert.equal(state.phase, "validating");
    assert.equal(state.txHash, null);
  });

  it("validation failure carries its code with no hash", () => {
    const state = transition(
      { phase: "validating", txHash: null, errorCode: null },
      { type: "VALID_FAIL", code: "wrong-network" }
    );
    assert.deepEqual(state, { phase: "error", txHash: null, errorCode: "wrong-network" });
  });

  it("submit failure without a hash lands in error with nothing submitted", () => {
    const state = transition(
      { phase: "awaiting_wallet", txHash: null, errorCode: null },
      { type: "SUBMIT_FAIL", code: "tx-submit-failed" }
    );
    assert.deepEqual(state, {
      phase: "error",
      txHash: null,
      errorCode: "tx-submit-failed",
    });
    expectIllegal(
      { phase: "validating", txHash: null, errorCode: null },
      { type: "SUBMIT_FAIL", code: "tx-submit-failed" }
    );
  });

  it("resume re-checks a stored hash without building a new transaction", () => {
    const state = transition(
      { phase: "idle", txHash: null, errorCode: null },
      { type: "RESUME", txHash: HASH }
    );
    assert.deepEqual(state, { phase: "confirming", txHash: HASH, errorCode: null });
    expectIllegal(state, { type: "TX_SENT", txHash: HASH });
    expectIllegal(
      { phase: "review", txHash: null, errorCode: null },
      { type: "RESUME", txHash: HASH }
    );
  });

  it("a second deployment requires a deliberate NEW_DEPLOYMENT action", () => {
    const after = transition(
      { phase: "success", txHash: HASH, errorCode: null },
      { type: "NEW_DEPLOYMENT" }
    );
    assert.deepEqual(after, { phase: "idle", txHash: null, errorCode: null });
    expectIllegal({ phase: "confirming", txHash: HASH, errorCode: null }, { type: "NEW_DEPLOYMENT" });
    expectIllegal({ phase: "review", txHash: null, errorCode: null }, { type: "NEW_DEPLOYMENT" });
  });

  it("form changes reset review but never disturb a locked attempt", () => {
    assert.deepEqual(
      transition({ phase: "review", txHash: null, errorCode: null }, { type: "FORM_CHANGED" }),
      { phase: "idle", txHash: null, errorCode: null }
    );
    const locked: DeployState = { phase: "confirming", txHash: HASH, errorCode: null };
    assert.equal(transition(locked, { type: "FORM_CHANGED" }), locked);
  });
});
