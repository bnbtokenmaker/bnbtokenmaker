/**
 * Phase 6C typed deployment errors.
 *
 * Every user-facing deployment failure maps to a DeployErrorCode. The UI
 * renders ONLY the sanitized message from `deployErrorMessage` — raw RPC /
 * provider payloads never reach the screen. Developer logs may carry the
 * sanitized technical hint (no keys, seeds, or provider dumps, ever).
 */

export type DeployErrorCode =
  | "wallet-disconnected"
  | "wrong-network"
  | "account-changed"
  | "provider-unavailable"
  | "user-rejected"
  | "insufficient-gas-funds"
  | "gas-estimate-failed"
  | "simulation-reverted"
  | "rpc-unavailable"
  | "tx-submit-failed"
  | "tx-reverted"
  | "receipt-timeout"
  | "event-missing"
  | "quote-stale"
  | "invalid-config"
  | "duplicate-attempt"
  | "factory-unavailable"
  | "mainnet-disabled";

export class DeployFlowError extends Error {
  readonly code: DeployErrorCode;
  /** Sanitized technical hint for dev logs only (never rendered raw). */
  readonly hint: string | null;
  constructor(code: DeployErrorCode, hint?: string) {
    super(code);
    this.name = "DeployFlowError";
    this.code = code;
    this.hint = hint ?? null;
  }
}

const MESSAGES: Record<DeployErrorCode, { title: string; body: string }> = {
  "wallet-disconnected": {
    title: "Wallet disconnected",
    body: "Your wallet disconnected. Reconnect it and try again — no transaction was submitted.",
  },
  "wrong-network": {
    title: "Wrong network",
    body: "Please switch your wallet to BNB Smart Chain Testnet and try again. No transaction was submitted.",
  },
  "account-changed": {
    title: "Account changed",
    body: "The connected wallet account changed before the transaction was sent. Nothing was submitted — please review and try again.",
  },
  "provider-unavailable": {
    title: "Wallet unavailable",
    body: "Your selected wallet could not be reached. Reopen your wallet, reconnect, and try again — no transaction was submitted.",
  },
  "user-rejected": {
    title: "Transaction cancelled",
    body: "No token was deployed and no transaction was submitted.",
  },
  "insufficient-gas-funds": {
    title: "Not enough BNB for gas",
    body: "Your wallet does not hold enough testnet BNB to pay the network fee. Top up testnet BNB and try again — no transaction was submitted.",
  },
  "gas-estimate-failed": {
    title: "Network fee could not be estimated",
    body: "The network fee for this deployment could not be estimated, so the transaction was not sent. Please try again in a moment.",
  },
  "simulation-reverted": {
    title: "Deployment would fail",
    body: "A pre-check shows this deployment would be rejected on-chain, so your wallet was never asked to sign. Please review the details and try again.",
  },
  "rpc-unavailable": {
    title: "Network temporarily unavailable",
    body: "BNB Smart Chain Testnet could not be reached. No additional transaction will be sent automatically — please review the details and try again.",
  },
  "tx-submit-failed": {
    title: "Transaction could not be sent",
    body: "Your wallet did not submit the transaction. No token was deployed — please try again.",
  },
  "tx-reverted": {
    title: "Transaction failed on-chain",
    body: "The deployment transaction was rejected by the network and no token was created. The network fee for the failed transaction may still have been charged.",
  },
  "receipt-timeout": {
    title: "Confirmation is taking longer than expected",
    body: "The transaction was submitted but its confirmation is still unknown. It may still confirm — no additional transaction will be sent automatically. Use the transaction link below to inspect it, then check again.",
  },
  "event-missing": {
    title: "Deployment result unclear",
    body: "The transaction confirmed but the new token address could not be read from it. Inspect the transaction on the explorer before trying again — a token may already exist.",
  },
  "quote-stale": {
    title: "Pricing needs a refresh",
    body: "The server price confirmation expired before the transaction was sent. No transaction was submitted — please try again to fetch a fresh price.",
  },
  "invalid-config": {
    title: "Token configuration invalid",
    body: "This token configuration cannot be deployed. Please review the highlighted fields and try again — no transaction was submitted.",
  },
  "duplicate-attempt": {
    title: "Deployment already in progress",
    body: "A deployment attempt is already running. Please wait for it to finish before starting another.",
  },
  "factory-unavailable": {
    title: "Deployment unavailable",
    body: "The deployment contract is not configured right now. Please try again later — no transaction was submitted.",
  },
  "mainnet-disabled": {
    title: "Mainnet deployment is not yet enabled",
    body: "Deploying to BNB Smart Chain Mainnet is not available yet. You can preview your configuration here, or switch to Testnet to deploy.",
  },
};

export function deployErrorMessage(code: DeployErrorCode): {
  title: string;
  body: string;
} {
  return MESSAGES[code];
}

export function isDeployErrorCode(value: unknown): value is DeployErrorCode {
  return (
    typeof value === "string" &&
    (Object.keys(MESSAGES) as string[]).includes(value)
  );
}

/** Fallback for unclassified failures: safe generic copy, never raw text. */
export function fallbackDeployMessage(): { title: string; body: string } {
  return {
    title: "Deployment could not be completed",
    body: "No additional transaction will be sent automatically. Please review the details and try again.",
  };
}

const REJECTION_PATTERNS = [
  /user rejected/i,
  /user denied/i,
  /rejected the request/i,
  /request rejected/i,
  /user cancelled/i,
  /user canceled/i,
  /action rejected/i,
  /transaction was rejected/i,
  /denied transaction/i,
];
const REJECTION_CODES = new Set([4001, "4001", "ACTION_REJECTED"]);
const REJECTION_NAMES = new Set([
  "UserRejectedRequestError",
  "UserRejectedRequest",
  "ActionRejected",
  "TransactionRejected",
]);

const INSUFFICIENT_PATTERNS = [
  /insufficient funds/i,
  /insufficient balance/i,
  /exceeds balance/i,
  /gas required exceeds allowance/i,
  /not enough .*bnb/i,
];
const TIMEOUT_PATTERNS = [/timed out/i, /timeout/i, /exceeded.*deadline/i];
const RPC_PATTERNS = [
  /network error/i,
  /failed to fetch/i,
  /could not connect/i,
  /connection (closed|refused|reset)/i,
  /internal json-rpc error/i,
  /service unavailable/i,
  /bad gateway/i,
  /gateway timeout/i,
  /eth_chainid/i,
];

function errorText(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const candidate = error as {
    shortMessage?: unknown;
    message?: unknown;
    name?: unknown;
  };
  const parts: string[] = [];
  if (typeof candidate.shortMessage === "string") parts.push(candidate.shortMessage);
  if (typeof candidate.message === "string") parts.push(candidate.message);
  if (typeof candidate.name === "string") parts.push(candidate.name);
  return parts.join(" ").trim();
}

function errorCode(error: unknown): string | number | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: unknown; cause?: unknown };
  if (typeof candidate.code === "string" || typeof candidate.code === "number") {
    return candidate.code;
  }
  if (candidate.cause && typeof candidate.cause === "object") {
    return errorCode(candidate.cause);
  }
  return null;
}

/**
 * Classify an unknown throw from wallet/RPC/viem layers into a safe
 * DeployErrorCode. User rejections, insufficient funds and timeouts are
 * detected by code/name/message patterns; everything else degrades to the
 * caller-supplied fallback (default tx-submit-failed). Raw text is never
 * returned for rendering.
 */
export function classifyDeployFailure(
  error: unknown,
  fallback: DeployErrorCode = "tx-submit-failed"
): DeployErrorCode {
  if (error instanceof DeployFlowError) return error.code;
  const code = errorCode(error);
  if (code !== null && REJECTION_CODES.has(code)) return "user-rejected";
  if (
    error &&
    typeof error === "object" &&
    typeof (error as { name?: unknown }).name === "string" &&
    REJECTION_NAMES.has((error as { name: string }).name)
  ) {
    return "user-rejected";
  }
  const text = errorText(error);
  if (!text) return fallback;
  if (REJECTION_PATTERNS.some((pattern) => pattern.test(text))) {
    return "user-rejected";
  }
  if (INSUFFICIENT_PATTERNS.some((pattern) => pattern.test(text))) {
    return "insufficient-gas-funds";
  }
  if (TIMEOUT_PATTERNS.some((pattern) => pattern.test(text))) {
    return "receipt-timeout";
  }
  if (RPC_PATTERNS.some((pattern) => pattern.test(text))) {
    return "rpc-unavailable";
  }
  return fallback;
}

/**
 * Classify a receipt-wait failure specifically. A revert (status "reverted")
 * maps to tx-reverted; timeouts to receipt-timeout; anything else keeps the
 * hash but reports unknown confirmation (receipt-timeout copy covers both —
 * the transaction WAS submitted).
 */
export function classifyReceiptFailure(error: unknown): DeployErrorCode {
  if (error instanceof DeployFlowError) return error.code;
  const text = errorText(error);
  if (/revert/i.test(text)) return "tx-reverted";
  return "receipt-timeout";
}

/**
 * DEVELOPMENT-ONLY query diagnostics.
 *
 * Returns the sanitized DeployErrorCode behind a failed React Query fetch
 * (quote/gas) so an invisible fail-closed state can be diagnosed locally.
 * Returns null in production builds (so production UI is byte-identical)
 * and for absent errors. Raw provider/RPC text is NEVER returned — only the
 * code, which maps to fixed copy in `deployErrorMessage`.
 */
export function devQueryErrorCode(
  error: unknown,
  fallback: DeployErrorCode
): DeployErrorCode | null {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return null;
  }
  if (error instanceof DeployFlowError) return error.code;
  if (error === null || error === undefined) return null;
  return fallback;
}
