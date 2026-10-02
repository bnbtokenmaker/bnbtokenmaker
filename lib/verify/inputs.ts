/**
 * Deterministic BscScan verification input builder (SERVER-ONLY).
 *
 * Reconstructs the exact solc Standard JSON input + ABI-encoded constructor
 * arguments for any BNBTokenMakerToken deployment, from frozen toolchain
 * constants and proven on-chain evidence. Nothing here accepts client
 * input: sources, settings, libraries, contract name and field order are
 * all server-controlled constants; constructor VALUES must be derived from
 * the deployment receipt event + on-chain views by the caller.
 *
 * Frozen toolchain (must match hardhat.config.ts + contracts/freeze):
 *   solc 0.8.28, optimizer enabled runs 200, evmVersion paris,
 *   metadata.bytecodeHash ipfs, viaIR false.
 */

import { encodeAbiParameters } from "viem";

import { tokenAbi } from "../token/factory";
import {
  BSC_MAINNET_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
  isSupportedV1ChainId,
  type SupportedV1ChainId,
} from "../deploy/chains";
import { VERIFY_SOURCES } from "./sources";

/** Fully qualified contract name, exactly as compiled. */
export const VERIFY_CONTRACT_FQN =
  "contracts/BNBTokenMakerToken.sol:BNBTokenMakerToken";

/** Exact solc build that produced the frozen bytecode. */
export const VERIFY_SOLC_LONG_VERSION = "0.8.28+commit.7893614a";
/** Etherscan `compilerversion` parameter for the frozen build. */
export const VERIFY_COMPILERVERSION_PARAM = "v0.8.28+commit.7893614a";
/** Etherscan `licenseType` code for MIT (per Etherscan source-verification docs). */
export const VERIFY_LICENSE_TYPE_MIT = 3;

/** Chain-specific linked SwapLib addresses (immutable per chain). */
export const VERIFY_SWAPLIB_ADDRESSES: Record<SupportedV1ChainId, `0x${string}`> = {
  [BSC_MAINNET_CHAIN_ID]: "0xe3a51665ae1b7897f1ed05c3dc79f82f3df07f2a",
  [BSC_TESTNET_CHAIN_ID]: "0xf82c8783898f3c0f03ece27d412c94ad502f459f",
};

/** Frozen compiler settings (must reproduce the frozen build exactly). */
export const VERIFY_COMPILER_SETTINGS = {
  optimizer: { enabled: true, runs: 200 },
  evmVersion: "paris",
  metadata: { bytecodeHash: "ipfs" },
  viaIR: false,
} as const;

/**
 * Exact TokenConfig field order. Mirrors BOTH the Solidity struct
 * (BNBTokenMakerToken.TokenConfig) and packageToCalldata — any drift
 * breaks constructor-argument encoding, so tests assert this list against
 * the tracked contract ABI.
 */
export const TOKEN_CONFIG_FIELD_ORDER = [
  "name",
  "symbol",
  "decimals",
  "initialSupply",
  "owner",
  "burnable",
  "mintable",
  "pausable",
  "maxTxAmount",
  "maxWalletAmount",
  "blacklistEnabled",
  "whitelistEnabled",
  "buyTaxBps",
  "sellTaxBps",
  "marketingWallet",
  "marketingShareBps",
  "liquidityShareBps",
  "autoLiquidityEnabled",
  "swapThreshold",
  "antiBotEnabled",
  "snipeBlocks",
  "maxSupply",
] as const;

export type TokenConfigField = (typeof TOKEN_CONFIG_FIELD_ORDER)[number];

/** Reconstructed constructor values (all proven, never client-supplied). */
export type TokenConstructorValues = {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: bigint;
  owner: `0x${string}`;
  burnable: boolean;
  mintable: boolean;
  pausable: boolean;
  maxTxAmount: bigint;
  maxWalletAmount: bigint;
  blacklistEnabled: boolean;
  whitelistEnabled: boolean;
  buyTaxBps: bigint;
  sellTaxBps: bigint;
  marketingWallet: `0x${string}`;
  marketingShareBps: bigint;
  liquidityShareBps: bigint;
  autoLiquidityEnabled: boolean;
  swapThreshold: bigint;
  antiBotEnabled: boolean;
  snipeBlocks: bigint;
  maxSupply: bigint;
};

type AbiComponent = { name: string; type: string };

function tokenConfigComponents(): AbiComponent[] {
  for (const entry of tokenAbi as readonly unknown[]) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      (entry as { type?: unknown }).type === "constructor"
    ) {
      const inputs = (entry as { inputs?: unknown }).inputs;
      if (Array.isArray(inputs) && inputs.length > 0) {
        const tuple = inputs[0] as { components?: unknown };
        if (Array.isArray(tuple.components)) {
          return (tuple.components as AbiComponent[]).map((c) => ({
            name: c.name,
            type: c.type,
          }));
        }
      }
    }
  }
  throw new Error("verify-inputs: token constructor ABI not found");
}

/** Tuple components in contract order — the encoding authority. */
export function tokenConstructorComponents(): AbiComponent[] {
  return tokenConfigComponents();
}

function asAddress(value: unknown, field: string): `0x${string}` {
  if (typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value)) {
    return value as `0x${string}`;
  }
  throw new Error(`verify-inputs: field "${field}" is not an address`);
}

/**
 * Encode the TokenConfig constructor tuple EXACTLY as BscScan expects:
 * raw hex WITHOUT the 0x prefix (`constructorArguements`).
 */
export function encodeTokenConstructorArgs(values: TokenConstructorValues): string {
  const tuple = [
    values.name,
    values.symbol,
    values.decimals,
    values.initialSupply,
    asAddress(values.owner, "owner"),
    values.burnable,
    values.mintable,
    values.pausable,
    values.maxTxAmount,
    values.maxWalletAmount,
    values.blacklistEnabled,
    values.whitelistEnabled,
    values.buyTaxBps,
    values.sellTaxBps,
    asAddress(values.marketingWallet, "marketingWallet"),
    values.marketingShareBps,
    values.liquidityShareBps,
    values.autoLiquidityEnabled,
    values.swapThreshold,
    values.antiBotEnabled,
    values.snipeBlocks,
    values.maxSupply,
  ];
  const encoded = encodeAbiParameters(
    [{ type: "tuple", components: tokenConfigComponents() }] as never,
    [tuple] as never
  );
  return encoded.startsWith("0x") ? encoded.slice(2) : encoded;
}

export type ProvenDeploymentEvidence = {
  /** From the TokenCreated receipt event (authoritative deployment facts). */
  event: {
    name: string;
    symbol: string;
    decimals: number;
    initialSupply: bigint;
  };
  /** Token owner — must equal the deployment transaction sender. */
  owner: `0x${string}`;
  /** Remaining 17 config values, read on-chain from the token contract. */
  scalars: {
    burnable: boolean;
    mintable: boolean;
    pausable: boolean;
    maxTxAmount: bigint;
    maxWalletAmount: bigint;
    blacklistEnabled: boolean;
    whitelistEnabled: boolean;
    buyTaxBps: bigint;
    sellTaxBps: bigint;
    marketingWallet: `0x${string}`;
    marketingShareBps: bigint;
    liquidityShareBps: bigint;
    autoLiquidityEnabled: boolean;
    swapThreshold: bigint;
    antiBotEnabled: boolean;
    snipeBlocks: bigint;
    maxSupply: bigint;
  };
};

/**
 * Assemble constructor values from proven deployment evidence. Every value
 * comes from the receipt event, the transaction sender, or an on-chain
 * view — never from client input. Throws on any malformed value.
 */
export function reconstructTokenConfig(evidence: ProvenDeploymentEvidence): TokenConstructorValues {
  if (!evidence.event || typeof evidence.event.name !== "string" || evidence.event.name.length === 0) {
    throw new Error("verify-inputs: event name is missing");
  }
  if (typeof evidence.event.symbol !== "string" || evidence.event.symbol.length === 0) {
    throw new Error("verify-inputs: event symbol is missing");
  }
  if (!Number.isInteger(evidence.event.decimals) || evidence.event.decimals < 0 || evidence.event.decimals > 18) {
    throw new Error("verify-inputs: event decimals is invalid");
  }
  if (typeof evidence.event.initialSupply !== "bigint" || evidence.event.initialSupply <= 0n) {
    throw new Error("verify-inputs: event initialSupply is invalid");
  }
  return {
    name: evidence.event.name,
    symbol: evidence.event.symbol,
    decimals: evidence.event.decimals,
    initialSupply: evidence.event.initialSupply,
    owner: asAddress(evidence.owner, "owner"),
    burnable: evidence.scalars.burnable === true,
    mintable: evidence.scalars.mintable === true,
    pausable: evidence.scalars.pausable === true,
    maxTxAmount: evidence.scalars.maxTxAmount,
    maxWalletAmount: evidence.scalars.maxWalletAmount,
    blacklistEnabled: evidence.scalars.blacklistEnabled === true,
    whitelistEnabled: evidence.scalars.whitelistEnabled === true,
    buyTaxBps: evidence.scalars.buyTaxBps,
    sellTaxBps: evidence.scalars.sellTaxBps,
    marketingWallet: asAddress(evidence.scalars.marketingWallet, "marketingWallet"),
    marketingShareBps: evidence.scalars.marketingShareBps,
    liquidityShareBps: evidence.scalars.liquidityShareBps,
    autoLiquidityEnabled: evidence.scalars.autoLiquidityEnabled === true,
    swapThreshold: evidence.scalars.swapThreshold,
    antiBotEnabled: evidence.scalars.antiBotEnabled === true,
    snipeBlocks: evidence.scalars.snipeBlocks,
    maxSupply: evidence.scalars.maxSupply,
  };
}

/**
 * Build the exact solc Standard JSON input for a chain. Libraries are
 * embedded per chain; everything else is frozen. Throws for unsupported
 * chains (fail closed — never fall back across chains).
 */
export function buildStandardJson(chainId: number): string {
  if (!isSupportedV1ChainId(chainId)) {
    throw new Error(`verify-inputs: unsupported chain ${String(chainId)}`);
  }
  const swapLib = VERIFY_SWAPLIB_ADDRESSES[chainId];
  if (!swapLib) {
    throw new Error(`verify-inputs: no SwapLib address for chain ${String(chainId)}`);
  }
  return JSON.stringify({
    language: "Solidity",
    sources: Object.fromEntries(
      Object.entries(VERIFY_SOURCES).map(([path, content]) => [path, { content }])
    ),
    settings: {
      optimizer: { ...VERIFY_COMPILER_SETTINGS.optimizer },
      evmVersion: VERIFY_COMPILER_SETTINGS.evmVersion,
      metadata: { ...VERIFY_COMPILER_SETTINGS.metadata },
      viaIR: VERIFY_COMPILER_SETTINGS.viaIR,
      libraries: {
        "contracts/SwapLib.sol": { SwapLib: swapLib },
      },
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "evm.methodIdentifiers", "metadata"], "": ["ast"] },
      },
    },
  });
}
