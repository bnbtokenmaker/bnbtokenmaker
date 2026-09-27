/**
 * Phase 7D-E3 manager error mapping (pure).
 *
 * Maps known contract custom errors and wallet failures to human-readable
 * copy. Raw provider/internal error text is NEVER surfaced by default —
 * unknown failures collapse to a sanitized generic message (detailed
 * diagnostics stay developer-side only).
 */

export type ManagerErrorCopy = {
  title: string;
  body: string;
};

const GENERIC: ManagerErrorCopy = {
  title: "Transaction failed",
  body: "The transaction did not complete. No state change is assumed — re-read the dashboard before retrying.",
};

function textOf(error: unknown): string {
  if (error instanceof Error) {
    const extra =
      typeof (error as { shortMessage?: unknown }).shortMessage === "string"
        ? ` ${(error as { shortMessage?: string }).shortMessage}`
        : "";
    const cause = (error as { cause?: unknown }).cause;
    const causeText =
      cause instanceof Error
        ? ` ${cause.message} ${typeof (cause as { shortMessage?: unknown }).shortMessage === "string" ? (cause as { shortMessage?: string }).shortMessage : ""}`
        : "";
    return `${error.message}${extra}${causeText}`;
  }
  return String(error);
}

const RULES: Array<{ match: RegExp; copy: ManagerErrorCopy }> = [
  {
    match: /user rejected|user denied|rejected the request/i,
    copy: {
      title: "Signature rejected",
      body: "You rejected the transaction in your wallet. Nothing was submitted.",
    },
  },
  {
    match: /OwnableUnauthorizedAccount|not.*owner|UNAUTHORIZED/i,
    copy: {
      title: "Not the token owner",
      body: "The connected wallet is not the token owner. Owner-only actions are disabled for other wallets.",
    },
  },
  {
    match: /FeatureDisabled/i,
    copy: {
      title: "Capability not enabled",
      body: "This capability was not enabled at deployment. Disabled features revert by design.",
    },
  },
  {
    match: /MaxSupplyExceeded/i,
    copy: {
      title: "Maximum lifetime supply exceeded",
      body: "This mint would exceed the token's maximum lifetime issuance. Burning does not restore mint capacity.",
    },
  },
  {
    match: /EnforcedPause/i,
    copy: {
      title: "Token is paused",
      body: "The token is currently paused, so transfers, mints and burns revert until it is unpaused.",
    },
  },
  {
    match: /PairBlacklisted/i,
    copy: {
      title: "Registered pair cannot be blacklisted",
      body: "The contract refuses to blacklist a registered liquidity pair, since that would block all sells.",
    },
  },
  {
    match: /Blacklisted/i,
    copy: {
      title: "Address is blacklisted",
      body: "A blacklisted address cannot send or receive (burning out remains allowed by the contract).",
    },
  },
  {
    match: /WhitelistEnforced/i,
    copy: {
      title: "Whitelist restriction active",
      body: "Whitelist enforcement is on: both transfer sides must qualify (owner or whitelisted).",
    },
  },
  {
    match: /MaxTxExceeded/i,
    copy: {
      title: "Maximum transaction exceeded",
      body: "The amount exceeds the token's per-transfer limit.",
    },
  },
  {
    match: /MaxWalletExceeded/i,
    copy: {
      title: "Maximum wallet exceeded",
      body: "The recipient would exceed the token's per-wallet holding limit.",
    },
  },
  {
    match: /TradingAlreadyEnabled/i,
    copy: {
      title: "Trading already enabled",
      body: "Trading was already enabled. This action is one-way and cannot be restarted.",
    },
  },
  {
    match: /TradingDisabled/i,
    copy: {
      title: "Trading not yet enabled",
      body: "Trading has not been enabled by the owner yet.",
    },
  },
  {
    match: /CooldownActive/i,
    copy: {
      title: "Launch cooldown active",
      body: "The snipe window allows one transfer per block for this side. Retry in a later block.",
    },
  },
  {
    match: /ZeroAddress|invalid (address|marketing wallet)|marketingWallet/i,
    copy: {
      title: "Invalid address",
      body: "The zero address (or a malformed address) is not accepted here.",
    },
  },
  {
    match: /ZeroAmount|invalid amount|zero.*amount/i,
    copy: {
      title: "Invalid amount",
      body: "The amount must be greater than zero.",
    },
  },
  {
    match: /insufficient (funds|balance)|allowance|exceeds balance/i,
    copy: {
      title: "Insufficient balance or allowance",
      body: "The wallet lacks the tokens, BNB for gas, or the approval this action needs.",
    },
  },
  {
    match: /wrong.?network|chain (mismatch|not allowed)|stale.?chain/i,
    copy: {
      title: "Wrong network",
      body: "Your wallet is not on the expected network. Switch networks in your wallet and try again.",
    },
  },
  {
    match: /unsupported function|function not (found|supported)/i,
    copy: {
      title: "Unsupported function",
      body: "This contract does not support that action.",
    },
  },
];

export function managerErrorMessage(error: unknown): ManagerErrorCopy {
  const text = textOf(error);
  for (const rule of RULES) {
    if (rule.match.test(text)) return rule.copy;
  }
  return GENERIC;
}
