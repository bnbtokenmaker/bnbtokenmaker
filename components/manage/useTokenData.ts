"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";

import { tokenAbi } from "../../lib/token/factory";
import { v1FactoryAddress } from "../../lib/token/factory";
import {
  classifyInspected,
  type InspectionReads,
} from "../../lib/manage/probe";
import {
  isTokenOwner,
  type TokenCapabilities,
} from "../../lib/manage/permissions";
import type { TokenClassification } from "../../lib/manage/classification";

const SUPPORTED_CHAIN_ID = 97;

const readClient = createPublicClient({
  chain: bscTestnet,
  transport: http(),
});

export type V1TokenState = {
  totalMinted: bigint | null;
  maxSupply: bigint | null;
  owner: `0x${string}` | null;
  paused: boolean | null;
  tradingEnabled: boolean | null;
  buyTaxBps: bigint | null;
  sellTaxBps: bigint | null;
  marketingWallet: `0x${string}` | null;
  swapBackEnabled: boolean | null;
  antiBotEnabled: boolean | null;
  snipeBlocks: bigint | null;
  launchBlock: bigint | null;
  burnable: boolean | null;
  mintable: boolean | null;
  pausable: boolean | null;
  maxTxAmount: bigint | null;
  maxWalletAmount: bigint | null;
  blacklistEnabled: boolean | null;
  whitelistEnabled: boolean | null;
  swapThreshold: bigint | null;
  liquidityShareBps: bigint | null;
  marketingShareBps: bigint | null;
  generator: string | null;
  factory: `0x${string}` | null;
  userBalance: bigint | null;
};

export type TokenDashboardData = {
  chainId: number;
  address: `0x${string}`;
  classification: TokenClassification;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: bigint | null;
  v1: V1TokenState | null;
  capabilities: TokenCapabilities;
  isOwner: boolean;
  chainSupported: boolean;
};

function asAddress(value: unknown): `0x${string}` | null {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value)
    ? (value.toLowerCase() as `0x${string}`)
    : null;
}

async function readView(
  address: `0x${string}`,
  functionName: string,
  args: readonly unknown[] = []
): Promise<unknown> {
  return readClient.readContract({
    address,
    abi: tokenAbi as never,
    functionName,
    args: args as never,
  } as never);
}

async function fetchInspection(
  address: `0x${string}`,
  account: `0x${string}` | null
): Promise<{ reads: InspectionReads; v1: V1TokenState }> {
  const names = [
    "name", "symbol", "decimals", "totalSupply",
    "FACTORY", "GENERATOR", "maxSupply", "totalMinted", "swapBackEnabled",
    "owner", "paused",
    "tradingEnabled", "buyTaxBps", "sellTaxBps", "marketingWallet",
    "antiBotEnabled", "snipeBlocks", "launchBlock",
    "burnable", "mintable", "pausable",
    "maxTxAmount", "maxWalletAmount",
    "blacklistEnabled", "whitelistEnabled",
    "swapThreshold", "liquidityShareBps", "marketingShareBps",
  ] as const;
  const settled = await Promise.allSettled(
    names.map((fn) => readView(address, fn))
  );
  const at = (fn: (typeof names)[number]): unknown => {
    const i = names.indexOf(fn);
    const r = settled[i];
    return r.status === "fulfilled" ? r.value : undefined;
  };
  let code: string | null | undefined = null;
  let userBalance: bigint | null = null;
  try {
    code = await readClient.getBytecode({ address });
  } catch {
    code = null;
  }
  if (account) {
    try {
      const bal = await readView(address, "balanceOf", [account]);
      if (typeof bal === "bigint") userBalance = bal;
    } catch {
      userBalance = null;
    }
  }
  const big = (v: unknown): bigint | null => (typeof v === "bigint" ? v : null);
  const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
  const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
  const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

  const reads: InspectionReads = {
    basic: {
      codeExists: typeof code === "string" && code !== "0x" && code.length > 2,
      name: str(at("name")),
      symbol: str(at("symbol")),
      decimals: num(at("decimals")),
      totalSupply: big(at("totalSupply")),
    },
    markers: {
      factory: asAddress(at("FACTORY")),
      generator: str(at("GENERATOR")),
      maxSupply: big(at("maxSupply")),
      totalMinted: big(at("totalMinted")),
      swapBackEnabled: bool(at("swapBackEnabled")),
    },
    owner: asAddress(at("owner")),
    paused: bool(at("paused")),
  };
  const v1: V1TokenState = {
    totalMinted: big(at("totalMinted")),
    maxSupply: big(at("maxSupply")),
    owner: asAddress(at("owner")),
    paused: bool(at("paused")),
    tradingEnabled: bool(at("tradingEnabled")),
    buyTaxBps: big(at("buyTaxBps")),
    sellTaxBps: big(at("sellTaxBps")),
    marketingWallet: asAddress(at("marketingWallet")),
    swapBackEnabled: bool(at("swapBackEnabled")),
    antiBotEnabled: bool(at("antiBotEnabled")),
    snipeBlocks: big(at("snipeBlocks")),
    launchBlock: big(at("launchBlock")),
    burnable: bool(at("burnable")),
    mintable: bool(at("mintable")),
    pausable: bool(at("pausable")),
    maxTxAmount: big(at("maxTxAmount")),
    maxWalletAmount: big(at("maxWalletAmount")),
    blacklistEnabled: bool(at("blacklistEnabled")),
    whitelistEnabled: bool(at("whitelistEnabled")),
    swapThreshold: big(at("swapThreshold")),
    liquidityShareBps: big(at("liquidityShareBps")),
    marketingShareBps: big(at("marketingShareBps")),
    generator: str(at("GENERATOR")),
    factory: asAddress(at("FACTORY")),
    userBalance,
  };
  return { reads, v1 };
}

export function knownV1Factories(chainId: number): ReadonlySet<string> {
  if (chainId !== SUPPORTED_CHAIN_ID) return new Set();
  const factory = v1FactoryAddress(chainId);
  return factory ? new Set([factory.toLowerCase()]) : new Set();
}

export function useTokenData(
  chainId: number | null,
  address: `0x${string}` | null,
  account: `0x${string}` | null
): {
  data: TokenDashboardData | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const enabled =
    chainId === SUPPORTED_CHAIN_ID &&
    address !== null &&
    /^0x[a-fA-F0-9]{40}$/.test(address);
  const query = useQuery({
    queryKey: ["manager-token", chainId, address?.toLowerCase(), account?.toLowerCase() ?? null],
    queryFn: async (): Promise<TokenDashboardData> => {
      if (chainId === null || address === null) throw new Error("invalid-target");
      const { reads, v1 } = await fetchInspection(address, account);
      const classification = classifyInspected(reads, knownV1Factories(chainId));
      const owner = v1.owner;
      const capabilities: TokenCapabilities = {
        burnable: v1.burnable === true,
        mintable: v1.mintable === true,
        pausable: v1.pausable === true,
        blacklistEnabled: v1.blacklistEnabled === true,
        whitelistEnabled: v1.whitelistEnabled === true,
        tradingEnabled: (v1.buyTaxBps ?? 0n) > 0n || (v1.sellTaxBps ?? 0n) > 0n,
        autoLiquidityEnabled: (v1.liquidityShareBps ?? 0n) > 0n,
        antiBotEnabled: v1.antiBotEnabled === true,
        tradingLaunched: v1.tradingEnabled === true,
      };
      return {
        chainId,
        address,
        classification,
        name: reads.basic.name,
        symbol: reads.basic.symbol,
        decimals: reads.basic.decimals,
        totalSupply: reads.basic.totalSupply,
        v1: classification.kind === "own-v1" ? v1 : null,
        capabilities,
        isOwner: isTokenOwner(account, owner),
        chainSupported: true,
      };
    },
    enabled,
    retry: 1,
    staleTime: 15_000,
  });
  const data = useMemo(() => query.data ?? null, [query.data]);
  return {
    data,
    isLoading: enabled && query.isPending,
    isError: enabled && query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
