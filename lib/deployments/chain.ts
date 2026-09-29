/**
 * Phase 7A server-side chain reader — dual-chain (BSC Mainnet + BSC Testnet).
 *
 * Deployment verification must never depend on a browser-selected provider:
 * this module builds a viem public client from SERVER-SIDE RPC config.
 * Server-side by placement (imported only by the record route, never by
 * client code); no RPC URL is ever sent to the browser.
 *
 * Chain isolation:
 * - Chain 97 → BSC Testnet + BSC_TESTNET_RPC_URL
 * - Chain 56 → BSC Mainnet + BSC_MAINNET_RPC_URL
 * - No cross-chain fallback; unsupported chains fail closed.
 */


import { createPublicClient, http } from "viem";
import { bsc, bscTestnet } from "viem/chains";

import { BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID, isSupportedV1ChainId } from "../deploy/chains";
import { PHASE6B_RPC_DEFAULT } from "../deploy/phase6b";
import { tokenAbi, v1FactoryAddress } from "../token/factory";
import type { ChainReader, TokenScalarViews } from "./verify";

const RPC_TIMEOUT_MS = 15_000;

export class ServerRpcUnavailableError extends Error {
  constructor(message = "RPC URL is not set for the requested chain") {
    super(message);
    this.name = "ServerRpcUnavailableError";
  }
}

/**
 * Resolve the server RPC URL for a specific chain.
 *
 * - Chain 97: BSC_TESTNET_RPC_URL (with public fallback outside production)
 * - Chain 56: BSC_MAINNET_RPC_URL (no fallback — production only)
 * - Other chains: null (fail closed)
 */
export function serverRpcUrlForChain(chainId: number): string | null {
  if (chainId === BSC_TESTNET_CHAIN_ID) {
    const configured = (process.env.BSC_TESTNET_RPC_URL ?? "").trim();
    if (configured) return configured;
    if (process.env.NODE_ENV === "production") {
      throw new ServerRpcUnavailableError("BSC_TESTNET_RPC_URL is not set");
    }
    return PHASE6B_RPC_DEFAULT;
  }
  if (chainId === BSC_MAINNET_CHAIN_ID) {
    const configured = (process.env.BSC_MAINNET_RPC_URL ?? "").trim();
    if (!configured) {
      throw new ServerRpcUnavailableError("BSC_MAINNET_RPC_URL is not set");
    }
    return configured;
  }
  return null;
}

/**
 * Resolve the server RPC URL (testnet default for backward compatibility).
 * @deprecated Use serverRpcUrlForChain(chainId) for dual-chain support.
 */
export function serverRpcUrl(): string {
  return serverRpcUrlForChain(BSC_TESTNET_CHAIN_ID) ?? PHASE6B_RPC_DEFAULT;
}

type ChainCache = {
  [BSC_MAINNET_CHAIN_ID]?: ChainReader | null;
  [BSC_TESTNET_CHAIN_ID]?: ChainReader | null;
};

const cache: ChainCache = {};

function createReader(chainId: number): ChainReader {
  const rpcUrl = serverRpcUrlForChain(chainId);
  if (!rpcUrl) {
    throw new ServerRpcUnavailableError(`Unsupported chain: ${chainId}`);
  }
  const chain = chainId === BSC_MAINNET_CHAIN_ID ? bsc : bscTestnet;
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl, { timeout: RPC_TIMEOUT_MS }),
  });
  return {
    async getTransaction(hash) {
      const tx = await client.getTransaction({ hash });
      if (!tx) return null;
      return {
        hash: tx.hash,
        from: tx.from,
        to: (tx.to ?? null) as string | null,
        value: tx.value,
      };
    },
    async getTransactionReceipt(hash) {
      const receipt = await client.getTransactionReceipt({ hash });
      if (!receipt) return null;
      return {
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        logs: receipt.logs.map((log) => ({
          address: log.address,
          topics: [...log.topics] as [`0x${string}`, ...`0x${string}`[]],
          data: log.data as `0x${string}`,
        })),
      };
    },
    async getTokenViews(token) {
      try {
        const read = (functionName: string) =>
          client.readContract({
            address: token,
            abi: tokenAbi as never,
            functionName,
          } as never) as Promise<unknown>;
        const [
          buyTaxBps,
          sellTaxBps,
          marketingWallet,
          marketingShareBps,
          liquidityShareBps,
          autoLiquidityEnabled,
          swapThreshold,
          antiBotEnabled,
          snipeBlocks,
          maxSupply,
        ] = await Promise.all([
          read("buyTaxBps"),
          read("sellTaxBps"),
          read("marketingWallet"),
          read("marketingShareBps"),
          read("liquidityShareBps"),
          read("autoLiquidityEnabled"),
          read("swapThreshold"),
          read("antiBotEnabled"),
          read("snipeBlocks"),
          read("maxSupply"),
        ]);
        if (
          typeof buyTaxBps !== "bigint" ||
          typeof sellTaxBps !== "bigint" ||
          typeof marketingWallet !== "string" ||
          !/^0x[a-fA-F0-9]{40}$/.test(marketingWallet) ||
          typeof marketingShareBps !== "bigint" ||
          typeof liquidityShareBps !== "bigint" ||
          typeof autoLiquidityEnabled !== "boolean" ||
          typeof swapThreshold !== "bigint" ||
          typeof antiBotEnabled !== "boolean" ||
          typeof snipeBlocks !== "bigint" ||
          typeof maxSupply !== "bigint"
        ) {
          return null;
        }
        const views: TokenScalarViews = {
          buyTaxBps: buyTaxBps.toString(10),
          sellTaxBps: sellTaxBps.toString(10),
          marketingWallet: marketingWallet.toLowerCase() as `0x${string}`,
          marketingShareBps: marketingShareBps.toString(10),
          liquidityShareBps: liquidityShareBps.toString(10),
          autoLiquidityEnabled,
          swapThresholdBase: swapThreshold.toString(10),
          antiBotEnabled,
          snipeBlocks: snipeBlocks.toString(10),
          maxSupplyBase: maxSupply.toString(10),
        };
        return views;
      } catch {
        return null;
      }
    },
  };
}

/**
 * Shared server chain reader for a specific chain. Pure reads
 * (getTransaction / getTransactionReceipt / token views) — no wallet,
 * no signing.
 *
 * Chain 97 → BSC Testnet reader
 * Chain 56 → BSC Mainnet reader
 * Other → throws ServerRpcUnavailableError
 */
export function getServerChainReader(chainId: number): ChainReader {
  if (!isSupportedV1ChainId(chainId)) {
    throw new ServerRpcUnavailableError(`Unsupported chain: ${chainId}`);
  }
  const cached = cache[chainId];
  if (cached) return cached;
  const reader = createReader(chainId);
  cache[chainId] = reader;
  return reader;
}

/**
 * @deprecated Use getServerChainReader(chainId) for dual-chain support.
 * Returns the testnet (chain 97) reader for backward compatibility.
 */
export function getServerChainReaderForTestnet(): ChainReader {
  return getServerChainReader(BSC_TESTNET_CHAIN_ID);
}

/** Test escape hatch: drop all cached readers between isolated runs. */
export function resetServerChainReaderForTests(): void {
  cache[BSC_MAINNET_CHAIN_ID] = null;
  cache[BSC_TESTNET_CHAIN_ID] = null;
}

/**
 * Expected factory address for server verification — dual-chain.
 *
 * Chain 97: NEXT_PUBLIC_V1_FACTORY_ADDRESS (testnet V1 factory)
 * Chain 56: NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS (mainnet V1 factory)
 *
 * Each chain resolves ONLY from its own configuration. No cross-chain
 * fallback. Returns null when not configured (fail closed).
 */
export function getExpectedFactory(chainId: number): `0x${string}` | null {
  return v1FactoryAddress(chainId);
}
