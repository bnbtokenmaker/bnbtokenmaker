import { decodeEventLog } from "viem";

import TokenFactoryArtifact from "./abi/TokenFactory.json";
import TokenArtifact from "./abi/BNBTokenMakerToken.json";
import { decodeFeatureBitmap, type TokenFeatureFlags } from "./config";
import { PHASE6B_CHAIN_ID } from "../deploy/phase6b";

/**
 * Phase 6C integration boundary (typed, no transaction flow yet).
 * Factory ABI + address registry + deployment-event parser live here so the
 * future deployment flow has a single import surface.
 */

export const tokenAbi = TokenArtifact.abi as readonly unknown[];
export const factoryAbi = TokenFactoryArtifact.abi as readonly unknown[];

/**
 * Factory address by chain. NULL until a real deployment occurs — Phase 6C
 * must refuse to build a transaction without a known address. Env override
 * (NEXT_PUBLIC_TESTNET_FACTORY_ADDRESS) lets a manually deployed testnet
 * factory be consumed without code changes.
 */
function envFactoryAddress(): `0x${string}` | null {
  const raw = (process.env.NEXT_PUBLIC_TESTNET_FACTORY_ADDRESS ?? "").trim();
  return /^0x[a-fA-F0-9]{40}$/.test(raw) ? (raw as `0x${string}`) : null;
}

export function factoryAddress(
  chainId: number | null | undefined
): `0x${string}` | null {
  if (chainId !== PHASE6B_CHAIN_ID) return null;
  return envFactoryAddress();
}

export type TokenCreatedEvent = {
  token: `0x${string}`;
  creator: `0x${string}`;
  owner: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: bigint;
  features: bigint;
  featureFlags: TokenFeatureFlags;
};

function asAddress(value: unknown): `0x${string}` | null {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value)
    ? (value as `0x${string}`)
    : null;
}

/** Decode a TokenCreated log (from a receipt) into typed deployment data. */
export function parseTokenCreatedLog(log: {
  topics: readonly [`0x${string}`, ...`0x${string}`[]];
  data: `0x${string}`;
}): TokenCreatedEvent | null {
  let decoded: {
    eventName: string;
    args: Record<string, string | number | bigint | undefined>;
  };
  try {
    decoded = decodeEventLog({
      abi: factoryAbi as never,
      topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      data: log.data,
      strict: true,
    }) as unknown as {
      eventName: string;
      args: Record<string, string | number | bigint | undefined>;
    };
  } catch {
    return null;
  }
  if (decoded.eventName !== "TokenCreated") return null;
  const token = asAddress(decoded.args.token);
  const creator = asAddress(decoded.args.creator);
  const owner = asAddress(decoded.args.owner);
  const features =
    typeof decoded.args.features === "bigint" ? decoded.args.features : null;
  if (
    !token ||
    !creator ||
    !owner ||
    typeof decoded.args.name !== "string" ||
    typeof decoded.args.symbol !== "string" ||
    typeof decoded.args.decimals !== "number" ||
    typeof decoded.args.initialSupply !== "bigint" ||
    features === null
  ) {
    return null;
  }
  return {
    token,
    creator,
    owner,
    name: decoded.args.name,
    symbol: decoded.args.symbol,
    decimals: decoded.args.decimals,
    initialSupply: decoded.args.initialSupply,
    features,
    featureFlags: decodeFeatureBitmap(features),
  };
}

export function explorerTokenUrl(
  chainId: number,
  token: string,
  explorer = "https://testnet.bscscan.com"
): string | null {
  if (chainId !== PHASE6B_CHAIN_ID) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(token)) return null;
  return `${explorer}/token/${token}`;
}
