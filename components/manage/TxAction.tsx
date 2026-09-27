"use client";

import { useState, type ReactNode } from "react";

import { useManagerTx } from "./useManagerTx";
import type { ManagerCall } from "../../lib/manage/calls";
import type { ManagerActionId } from "../../lib/manage/permissions";

export type TxActionProps = {
  action: ManagerActionId;
  title: string;
  description?: ReactNode;
  /** Non-null disables the action with an explanation (permissions/capability). */
  disabledReason: string | null;
  expectedChainId: number;
  submitLabel: string;
  danger?: boolean;
  /** Human summary shown at the confirm step (never raw calldata). */
  confirmText: string;
  children?: ReactNode;
  /** Build the exact call; return null to block with `buildError`. */
  buildCall: () => ManagerCall | null;
  buildError?: string | null;
  onDone: () => void;
};

/**
 * Common safe action wrapper: fields → confirm → sign → receipt →
 * success/failure. Every write flows through the session-pinned provider;
 * success renders only from a confirmed receipt.
 */
export function TxAction({
  action,
  title,
  description,
  disabledReason,
  expectedChainId,
  submitLabel,
  danger = false,
  confirmText,
  children,
  buildCall,
  buildError = null,
  onDone,
}: TxActionProps) {
  const [confirming, setConfirming] = useState(false);
  const { status, submit, reset } = useManagerTx({
    expectedChainId,
    action,
    onConfirmed: () => {
      onDone();
    },
  });

  if (disabledReason !== null) {
    return (
      <div className="mgr-action" data-action={action}>
        <h4>{title}</h4>
        {description ? <p className="deploy-muted">{description}</p> : null}
        <p className="deploy-muted" role="note">
          Unavailable — {disabledReason}
        </p>
      </div>
    );
  }

  return (
    <div className="mgr-action" data-action={action}>
      <h4>{title}</h4>
      {description ? <p className="deploy-muted">{description}</p> : null}
      {status.stage === "idle" && !confirming && (
        <>
          {children}
          {buildError ? (
            <p className="deploy-muted" role="alert">
              {buildError}
            </p>
          ) : null}
          <button
            type="button"
            className={danger ? "btn btn-dark" : "btn btn-primary"}
            disabled={buildError !== null}
            onClick={() => {
              reset();
              setConfirming(true);
            }}
          >
            {submitLabel}
          </button>
        </>
      )}
      {status.stage === "idle" && confirming && (
        <>
          <p className="deploy-muted" role="status">
            {confirmText}
          </p>
          <span className="deploy-actions-row">
            <button
              type="button"
              className={danger ? "btn btn-dark" : "btn btn-primary"}
              onClick={() => {
                const call = buildCall();
                if (!call) return;
                setConfirming(false);
                void submit(call);
              }}
            >
              Confirm and sign
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </span>
        </>
      )}
      {(status.stage === "confirming" ||
        status.stage === "sending" ||
        status.stage === "receipt") && (
        <p className="deploy-muted" role="status">
          {status.stage === "confirming"
            ? "Preparing transaction…"
            : status.stage === "sending"
              ? "Confirm the transaction in your wallet."
              : "Waiting for on-chain confirmation…"}
        </p>
      )}
      {status.stage === "success" && (
        <div role="status">
          <p className="deploy-muted">Confirmed on-chain.</p>
          <code className="mono">{status.txHash}</code>{" "}
          <button
            type="button"
            className="linklike"
            onClick={() => {
              reset();
            }}
          >
            Do another
          </button>
        </div>
      )}
      {status.stage === "error" && (
        <div role="alert">
          <p>
            <b>{status.copy.title}</b>
          </p>
          <p className="deploy-muted">{status.copy.body}</p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              reset();
              setConfirming(false);
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
