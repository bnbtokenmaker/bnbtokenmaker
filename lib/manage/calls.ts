/**
 * Phase 7D-E3 canonical manager calldata (pure).
 *
 * Every write is built from the canonical V1 ABI with strictly validated
 * inputs. Amounts are bigint (base units); addresses are checksum-agnostic
 * hex validated by shape. Throws on anything malformed — the tx layer
 * surfaces these as client-side validation failures, never broadcasts.
 */

import { encodeFunctionData, type Abi } from "viem";

import { tokenAbi } from "../token/factory";

export type ManagerCall = {
  to: `0x${string}`;
  data: `0x${string}`;
};

function v1Address(value: unknown, field: string): `0x${string}` {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`invalid address for ${field}`);
  }
  return value as `0x${string}`;
}

function v1Amount(value: unknown, field: string): bigint {
  if (typeof value !== "bigint" || value <= 0n) {
    throw new Error(`invalid amount for ${field}`);
  }
  return value;
}

function encode(functionName: string, args: readonly unknown[]): `0x${string}` {
  return encodeFunctionData({
    abi: tokenAbi as unknown as Abi,
    functionName,
    args: args as never,
  }) as `0x${string}`;
}

export function mintCall(token: unknown, to: unknown, value: unknown): ManagerCall {
  const t = v1Address(token, "token");
  return { to: t, data: encode("mint", [v1Address(to, "to"), v1Amount(value, "value")]) };
}

export function burnCall(token: unknown, value: unknown): ManagerCall {
  const t = v1Address(token, "token");
  return { to: t, data: encode("burn", [v1Amount(value, "value")]) };
}

export function burnFromCall(
  token: unknown,
  from: unknown,
  value: unknown
): ManagerCall {
  const t = v1Address(token, "token");
  return {
    to: t,
    data: encode("burnFrom", [v1Address(from, "from"), v1Amount(value, "value")]),
  };
}

export function pauseCall(token: unknown): ManagerCall {
  const t = v1Address(token, "token");
  return { to: t, data: encode("pause", []) };
}

export function unpauseCall(token: unknown): ManagerCall {
  const t = v1Address(token, "token");
  return { to: t, data: encode("unpause", []) };
}

export function setBlacklistedCall(
  token: unknown,
  account: unknown,
  blocked: unknown
): ManagerCall {
  const t = v1Address(token, "token");
  if (typeof blocked !== "boolean") throw new Error("invalid blocked flag");
  return { to: t, data: encode("setBlacklisted", [v1Address(account, "account"), blocked]) };
}

export function setWhitelistedCall(
  token: unknown,
  account: unknown,
  allowed: unknown
): ManagerCall {
  const t = v1Address(token, "token");
  if (typeof allowed !== "boolean") throw new Error("invalid allowed flag");
  return { to: t, data: encode("setWhitelisted", [v1Address(account, "account"), allowed]) };
}

export function setWhitelistEnforcedCall(token: unknown, enforced: unknown): ManagerCall {
  const t = v1Address(token, "token");
  if (typeof enforced !== "boolean") throw new Error("invalid enforced flag");
  return { to: t, data: encode("setWhitelistEnforced", [enforced]) };
}

export function setFeeExemptCall(
  token: unknown,
  account: unknown,
  exempt: unknown
): ManagerCall {
  const t = v1Address(token, "token");
  if (typeof exempt !== "boolean") throw new Error("invalid exempt flag");
  return { to: t, data: encode("setFeeExempt", [v1Address(account, "account"), exempt]) };
}

export function setMarketingWalletCall(token: unknown, wallet: unknown): ManagerCall {
  const t = v1Address(token, "token");
  return { to: t, data: encode("setMarketingWallet", [v1Address(wallet, "wallet")]) };
}

export function setAMMPairCall(
  token: unknown,
  pair: unknown,
  flagged: unknown
): ManagerCall {
  const t = v1Address(token, "token");
  if (typeof flagged !== "boolean") throw new Error("invalid flagged flag");
  return { to: t, data: encode("setAMMPair", [v1Address(pair, "pair"), flagged]) };
}

export function setSwapBackEnabledCall(token: unknown, enabled: unknown): ManagerCall {
  const t = v1Address(token, "token");
  if (typeof enabled !== "boolean") throw new Error("invalid enabled flag");
  return { to: t, data: encode("setSwapBackEnabled", [enabled]) };
}

export function enableTradingCall(token: unknown): ManagerCall {
  const t = v1Address(token, "token");
  return { to: t, data: encode("enableTrading", []) };
}

export function transferOwnershipCall(token: unknown, next: unknown): ManagerCall {
  const t = v1Address(token, "token");
  return { to: t, data: encode("transferOwnership", [v1Address(next, "new owner")]) };
}

export function renounceOwnershipCall(token: unknown): ManagerCall {
  const t = v1Address(token, "token");
  return { to: t, data: encode("renounceOwnership", []) };
}
