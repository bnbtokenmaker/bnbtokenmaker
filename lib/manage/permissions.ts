/**
 * Phase 7D-E3 manager permissions (pure).
 *
 * On-chain state is authoritative: the connected wallet may act only where
 * the token's owner() equals it (owner-only actions) or where the action is
 * legitimately holder-available (burn own tokens). DB records never confer
 * authority. External tokens get read-only inspection in V1 (no writes:
 * selector existence never proves semantics).
 */

export type ManagerActionId =
  | "mint"
  | "burn"
  | "burnFrom"
  | "pause"
  | "unpause"
  | "blacklistAdd"
  | "blacklistRemove"
  | "blacklistInspect"
  | "whitelistAdd"
  | "whitelistRemove"
  | "whitelistInspect"
  | "whitelistEnforce"
  | "feeExemptAdd"
  | "feeExemptRemove"
  | "feeExemptInspect"
  | "marketingChange"
  | "pairAdd"
  | "pairRemove"
  | "pairInspect"
  | "swapBackToggle"
  | "enableTrading"
  | "transferOwnership"
  | "renounceOwnership";

export type TokenCapabilities = {
  burnable: boolean;
  mintable: boolean;
  pausable: boolean;
  blacklistEnabled: boolean;
  whitelistEnabled: boolean;
  tradingEnabled: boolean;
  autoLiquidityEnabled: boolean;
  antiBotEnabled: boolean;
  tradingLaunched: boolean;
};

export type AuthorityInput = {
  kind: "own-v1" | "external" | "unsupported";
  connected: `0x${string}` | null;
  owner: `0x${string}` | null;
  capabilities: TokenCapabilities;
};

export function isTokenOwner(
  connected: `0x${string}` | null,
  owner: `0x${string}` | null
): boolean {
  return (
    connected !== null &&
    owner !== null &&
    connected.toLowerCase() === owner.toLowerCase()
  );
}

/**
 * Owner-only actions available for this token state. Holder actions
 * (burn) are handled separately — they need no ownership.
 */
export function ownerActions(input: AuthorityInput): ManagerActionId[] {
  if (input.kind !== "own-v1") return [];
  if (!isTokenOwner(input.connected, input.owner)) return [];
  const c = input.capabilities;
  const out: ManagerActionId[] = [];
  if (c.mintable) out.push("mint");
  if (c.pausable) out.push("pause", "unpause");
  if (c.blacklistEnabled) out.push("blacklistAdd", "blacklistRemove");
  if (c.whitelistEnabled) {
    out.push("whitelistAdd", "whitelistRemove", "whitelistEnforce");
  }
  if (c.tradingEnabled) {
    out.push("feeExemptAdd", "feeExemptRemove", "marketingChange");
  }
  out.push("pairAdd", "pairRemove");
  if (c.autoLiquidityEnabled) out.push("swapBackToggle");
  if (c.antiBotEnabled && !c.tradingLaunched) out.push("enableTrading");
  out.push("transferOwnership", "renounceOwnership");
  return out;
}

/** Holder-available burn of the user's own tokens (no ownership needed). */
export function canBurnOwn(input: AuthorityInput): boolean {
  return (
    input.kind === "own-v1" &&
    input.capabilities.burnable &&
    input.connected !== null
  );
}

/** burnFrom needs the burn capability; allowance itself is checked on-chain. */
export function canBurnFrom(input: AuthorityInput): boolean {
  return canBurnOwn(input);
}

/** Human reason when an owner-only action is unavailable. */
export function unavailableReason(
  input: AuthorityInput,
  action: ManagerActionId
): string | null {
  if (input.kind !== "own-v1") {
    return "Available only for tokens created with BNBTokenMaker.";
  }
  if (input.connected === null) return "Connect your wallet first.";
  if (!isTokenOwner(input.connected, input.owner)) {
    return "Only the token owner can perform this action. On-chain owner is authoritative.";
  }
  if (ownerActions(input).includes(action)) return null;
  return "This capability was not enabled at deployment.";
}
