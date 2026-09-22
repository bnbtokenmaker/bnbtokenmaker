/**
 * Phase 6C deployment state machine.
 *
 * A deployment attempt moves through explicit phases — never ad-hoc
 * booleans — so duplicate transactions, double clicks, stale transaction
 * state and accidental resubmission are structurally impossible:
 *
 *   idle ──START_REVIEW──▶ review ──BEGIN_VALIDATE──▶ validating
 *     │                      │                            │ VALID_FAIL
 *     │                      │ FORM_CHANGED               ▼
 *     │                      ▼                          error (no hash:
 *     │                    idle                    TRANSACTION NOT SUBMITTED)
 *     │                                                 │ RETRY_VALIDATE
 *     │                                                 ▼
 *     │                                            validating (re-runs gates)
 *     │
 *   validating ──VALID_OK──▶ awaiting_wallet ──TX_SENT──▶ broadcasting
 *     (locked)                  (locked)                    │ RECEIPT_WAIT (locked)
 *     │                         │ WALLET_REJECTED           ▼
 *     │                         ▼                        confirming (locked)
 *     │                       error (no hash)               │ RECEIPT_OK
 *     │                                                   ▼
 *     │                                                success
 *     │                                                   │
 *   confirming ──RECEIPT_FAIL/TIMEOUT──▶ error (hash kept:
 *     (locked)          TRANSACTION SUBMITTED BUT CONFIRMATION UNKNOWN)
 *                           │ RETRY_RECHECK
 *                           ▼
 *                       confirming (re-checks the SAME receipt —
 *                       never submits a second transaction)
 *
 * NEW_DEPLOYMENT (deliberate user action from success/error) is the ONLY
 * path that clears a transaction hash and allows a fresh attempt.
 */

import type { DeployErrorCode } from "./errors";

export type DeployPhase =
  | "idle"
  | "review"
  | "validating"
  | "awaiting_wallet"
  | "broadcasting"
  | "confirming"
  | "success"
  | "error";

export type DeployEvent =
  | { type: "START_REVIEW" }
  | { type: "FORM_CHANGED" }
  | { type: "BEGIN_VALIDATE" }
  | { type: "VALID_OK" }
  | { type: "VALID_FAIL"; code: DeployErrorCode }
  | { type: "TX_SENT"; txHash: `0x${string}` }
  | { type: "RECEIPT_WAIT" }
  | { type: "SUBMIT_FAIL"; code: DeployErrorCode }
  | { type: "RESUME"; txHash: `0x${string}` }
  | { type: "WALLET_REJECTED"; code: DeployErrorCode }
  | { type: "RECEIPT_OK" }
  | { type: "RECEIPT_FAIL"; code: DeployErrorCode }
  | { type: "RETRY" }
  | { type: "NEW_DEPLOYMENT" };

export type DeployState = {
  phase: DeployPhase;
  /** Transaction hash once submitted; null means nothing was broadcast. */
  txHash: `0x${string}` | null;
  /** Machine-level error code for the current/last failure. */
  errorCode: DeployErrorCode | null;
};

export const INITIAL_DEPLOY_STATE: DeployState = {
  phase: "idle",
  txHash: null,
  errorCode: null,
};

export class DeployTransitionError extends Error {
  readonly from: DeployPhase;
  readonly event: DeployEvent["type"];
  constructor(from: DeployPhase, event: DeployEvent["type"]) {
    super(`Illegal deployment transition: ${event} from ${from}`);
    this.name = "DeployTransitionError";
    this.from = from;
    this.event = event;
  }
};

/** Phases during which the deploy action MUST be locked (no second attempt). */
const LOCKED_PHASES: ReadonlySet<DeployPhase> = new Set([
  "validating",
  "awaiting_wallet",
  "broadcasting",
  "confirming",
]);

export function isDeployLocked(state: DeployState): boolean {
  return LOCKED_PHASES.has(state.phase);
}

/** True once a transaction hash exists — retry must re-check, never resubmit. */
export function hasSubmittedTx(state: DeployState): boolean {
  return state.txHash !== null;
}

function isTxHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function transition(state: DeployState, event: DeployEvent): DeployState {
  switch (event.type) {
    case "START_REVIEW":
      if (state.phase === "idle" || state.phase === "error") {
        if (state.phase === "error" && state.txHash !== null) {
          throw new DeployTransitionError(state.phase, event.type);
        }
        return { phase: "review", txHash: null, errorCode: null };
      }
      throw new DeployTransitionError(state.phase, event.type);

    case "FORM_CHANGED":
      // Any form change invalidates the review; in-flight attempts are
      // NEVER silently rewritten — the UI must ignore this while locked.
      if (state.phase === "review" || state.phase === "idle") {
        return { phase: "idle", txHash: null, errorCode: null };
      }
      if (isDeployLocked(state) || state.phase === "success" || state.phase === "error") {
        return state;
      }
      throw new DeployTransitionError(state.phase, event.type);

    case "BEGIN_VALIDATE":
      if (state.phase === "review") {
        return { phase: "validating", txHash: null, errorCode: null };
      }
      throw new DeployTransitionError(state.phase, event.type);

    case "VALID_OK":
      if (state.phase === "validating") {
        return { ...state, phase: "awaiting_wallet" };
      }
      throw new DeployTransitionError(state.phase, event.type);

    case "VALID_FAIL":
      if (state.phase === "validating") {
        return { phase: "error", txHash: null, errorCode: event.code };
      }
      throw new DeployTransitionError(state.phase, event.type);

    case "TX_SENT":
      if (state.phase === "awaiting_wallet") {
        if (!isTxHash(event.txHash)) {
          throw new DeployTransitionError(state.phase, event.type);
        }
        return { phase: "broadcasting", txHash: event.txHash, errorCode: null };
      }
      throw new DeployTransitionError(state.phase, event.type);

    case "RECEIPT_WAIT":
      if (state.phase === "broadcasting") {
        return { ...state, phase: "confirming" };
      }
      throw new DeployTransitionError(state.phase, event.type);

    case "SUBMIT_FAIL":
      if (state.phase === "awaiting_wallet") {
        // The wallet never returned a hash: provably nothing submitted.
        return { phase: "error", txHash: null, errorCode: event.code };
      }
      throw new DeployTransitionError(state.phase, event.type);

    case "RESUME":
      // Session-scoped recovery of a previously submitted transaction:
      // re-checks the SAME receipt, never builds a new transaction.
      if (state.phase === "idle") {
        if (!isTxHash(event.txHash)) {
          throw new DeployTransitionError(state.phase, event.type);
        }
        return { phase: "confirming", txHash: event.txHash, errorCode: null };
      }
      throw new DeployTransitionError(state.phase, event.type);

    case "WALLET_REJECTED":
      if (state.phase === "awaiting_wallet") {
        // Rejection happens before broadcast: provably nothing submitted.
        return { phase: "error", txHash: null, errorCode: event.code };
      }
      throw new DeployTransitionError(state.phase, event.type);

    case "RECEIPT_OK":
      if (state.phase === "confirming") {
        return { ...state, phase: "success", errorCode: null };
      }
      throw new DeployTransitionError(state.phase, event.type);

    case "RECEIPT_FAIL":
      if (state.phase === "confirming") {
        // Hash is KEPT: the transaction may still confirm on-chain.
        return { phase: "error", txHash: state.txHash, errorCode: event.code };
      }
      throw new DeployTransitionError(state.phase, event.type);

    case "RETRY":
      if (state.phase !== "error") {
        throw new DeployTransitionError(state.phase, event.type);
      }
      if (state.txHash !== null) {
        // Submitted: re-check the EXISTING receipt only. The UI layer must
        // call waitForTransactionReceipt for state.txHash and dispatch
        // RECEIPT_OK / RECEIPT_FAIL — it must NOT build a new transaction.
        return { phase: "confirming", txHash: state.txHash, errorCode: null };
      }
      // Nothing submitted: re-run validation/simulation from review.
      return { phase: "validating", txHash: null, errorCode: null };

    case "NEW_DEPLOYMENT":
      // Deliberate user action is the only path to a second transaction.
      if (state.phase === "success" || state.phase === "error") {
        return { phase: "idle", txHash: null, errorCode: null };
      }
      throw new DeployTransitionError(state.phase, event.type);

    default: {
      const neverEvent: never = event;
      throw new DeployTransitionError(state.phase, (neverEvent as DeployEvent)["type"]);
    }
  }
}
