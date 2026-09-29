import { decodeEventLog } from "viem";

import TokenFactoryArtifact from "./abi/TokenFactory.json";
import TokenArtifact from "./abi/BNBTokenMakerToken.json";
import { decodeFeatureBitmap, type TokenFeatureFlags } from "./config";
import { PHASE6B_CHAIN_ID } from "../deploy/phase6b";
import { BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID } from "../deploy/chains";

/**
 * Phase 6C integration boundary (typed, no transaction flow yet).
 * Factory ABI + address registry + deployment-event parser live here so the
 * future deployment flow has a single import surface.
 */

export const tokenAbi = TokenArtifact.abi as readonly unknown[];
export const factoryAbi = TokenFactoryArtifact.abi as readonly unknown[];

/**
 * Legacy Phase 6B factory address (testnet only).
 * NULL until a real deployment occurs.
 */
function envFactoryAddress(): `0x${string}` | null {
  const raw = (process.env.NEXT_PUBLIC_TESTNET_FACTORY_ADDRESS ?? "").trim();
  return /^0x[a-fA-F0-9]{40}$/.test(raw) ? (raw as `0x${string}`) : null;
}

/**
 * V1 factory address resolution — dual-chain.
 *
 * Chain 97 (BSC Testnet): NEXT_PUBLIC_V1_FACTORY_ADDRESS
 * Chain 56 (BSC Mainnet): NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS
 *
 * Each chain resolves ONLY from its own configuration. No cross-chain
 * fallback. Unsupported chains return null (fail closed).
 *
 * The frozen V1 factory (22-field TokenConfig + EIP-712 quote + value) is a
 * DIFFERENT contract from the legacy Phase 6B testnet factory: the old
 * factory MUST NEVER be silently used for V1 calls.
 */
export function v1FactoryAddress(chainId: number | null | undefined): `0x${string}` | null {
  if (chainId === BSC_TESTNET_CHAIN_ID) {
    const raw = (process.env.NEXT_PUBLIC_V1_FACTORY_ADDRESS ?? "").trim();
    return /^0x[a-fA-F0-9]{40}$/.test(raw) ? (raw as `0x${string}`) : null;
  }
  if (chainId === BSC_MAINNET_CHAIN_ID) {
    const raw = (process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS ?? "").trim();
    return /^0x[a-fA-F0-9]{40}$/.test(raw) ? (raw as `0x${string}`) : null;
  }
  return null;
}

/**
 * Legacy Phase 6B factory address (testnet only, chain 97).
 * Returns null for any other chain — the legacy factory is NEVER used for V1.
 */
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
