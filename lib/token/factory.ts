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

/**
 * Final V1 factory boundary (7D-E2).
 *
 * The frozen V1 factory (22-field TokenConfig + EIP-712 quote + value) is a
 * DIFFERENT contract from the legacy Phase 6B testnet factory: the old
 * factory MUST NEVER be silently used for V1 calls. This resolves the V1
 * factory address per chain, or null when not configured (7D-F deploys it).
 * Chain 56 is hard-disabled here regardless of configuration.
 */
export const V1_FACTORY_CHAIN_ID = 97;

function envV1FactoryAddress(): `0x${string}` | null {
  const raw = (process.env.NEXT_PUBLIC_V1_FACTORY_ADDRESS ?? "").trim();
  return /^0x[a-fA-F0-9]{40}$/.test(raw) ? (raw as `0x${string}`) : null;
}

export function v1FactoryAddress(chainId: number | null | undefined): `0x${string}` | null {
  if (chainId !== V1_FACTORY_CHAIN_ID) return null;
  return envV1FactoryAddress();
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

export type DeploymentPaidEvent = {
  token: `0x${string}`;
  payer: `0x${string}`;
  feeWei: bigint;
  pricingVersion: `0x${string}`;
  nonce: `0x${string}`;
};

function asBytes32(value: unknown): `0x${string}` | null {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value)
    ? (value as `0x${string}`)
    : null;
}

/** Decode a DeploymentPaid log (payment audit trail) into typed data. */
export function parseDeploymentPaidLog(log: {
  topics: readonly [`0x${string}`, ...`0x${string}`[]];
  data: `0x${string}`;
}): DeploymentPaidEvent | null {
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
  if (decoded.eventName !== "DeploymentPaid") return null;
  const token = asAddress(decoded.args.token);
  const payer = asAddress(decoded.args.payer);
  const pricingVersion = asBytes32(decoded.args.pricingVersion);
  const nonce = asBytes32(decoded.args.nonce);
  if (
    !token ||
    !payer ||
    typeof decoded.args.feeWei !== "bigint" ||
    !pricingVersion ||
    !nonce
  ) {
    return null;
  }
  return {
    token,
    payer,
    feeWei: decoded.args.feeWei,
    pricingVersion,
    nonce,
  };
}
