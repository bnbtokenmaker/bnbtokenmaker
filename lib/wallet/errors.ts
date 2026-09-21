const REJECTION_PATTERN =
  /user rejected|user denied|rejected the request|request rejected|user cancelled|user canceled/i;
const UNSUPPORTED_CHAIN_PATTERN =
  /unsupported chain|chain not (added|configured)|unrecognized chain/i;
const NO_ACCOUNT_PATTERN =
  /unable to find any account|no accounts? (?:found|available|for)|account not found|no account (?:found|available)/i;
const PENDING_PATTERN =
  /already pending|request already in progress|resource unavailable/i;

export function describeWalletError(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (!error) return fallback;
  const candidate = error as {
    name?: string;
    shortMessage?: string;
    message?: string;
  };
  const text = (candidate.shortMessage ?? candidate.message ?? "").trim();

  if (
    candidate.name === "UserRejectedRequestError" ||
    REJECTION_PATTERN.test(text)
  ) {
    return "The request was rejected in your wallet.";
  }
  if (NO_ACCOUNT_PATTERN.test(text)) {
    return "We couldn't find an account in that wallet. Add or unlock an account, then try again.";
  }
  if (UNSUPPORTED_CHAIN_PATTERN.test(text)) {
    return "Your wallet does not support this network yet.";
  }
  if (PENDING_PATTERN.test(text)) {
    return "A request is already open in your wallet. Finish or dismiss it, then try again.";
  }
  return text || fallback;
}
