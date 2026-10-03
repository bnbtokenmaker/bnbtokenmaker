/**
 * Server-side token view reader for verification input reconstruction
 * (SERVER-ONLY).
 *
 * Reads the full TokenConfig surface from the token contract over the
 * chain-isolated server RPC (same URL policy as the deployment record
 * reader: explicit per-chain URL, fail closed, no cross-chain fallback).
 * Pure reads only — no wallet, no signing. Individual view failures yield
 * missing entries (the service treats missing evidence as incomplete);
 * total transport failure yields null.
 */

import { createPublicClient, http } from "viem";
import { bsc, bscTestnet } from "viem/chains";

import { BSC_MAINNET_CHAIN_ID, isSupportedV1ChainId } from "../deploy/chains";
import { serverRpcUrlForChain } from "../deployments/chain";
import { tokenAbi } from "../token/factory";

const RPC_TIMEOUT_MS = 15_000;

/** Every view needed to reconstruct the 22-field TokenConfig. */
export const VERIFY_VIEW_NAMES = [
  "name",
  "symbol",
  "decimals",
  "totalSupply",
  "FACTORY",
  "GENERATOR",
  "maxSupply",
  "totalMinted",
  "swapBackEnabled",
  "owner",
  "paused",
  "tradingEnabled",
  "buyTaxBps",
  "sellTaxBps",
  "marketingWallet",
  "marketingShareBps",
  "liquidityShareBps",
  "autoLiquidityEnabled",
  "swapThreshold",
  "antiBotEnabled",
  "snipeBlocks",
  "burnable",
  "mintable",
  "pausable",
  "maxTxAmount",
  "maxWalletAmount",
  "blacklistEnabled",
  "whitelistEnabled",
] as const;

export async function readTokenConstructorViews(
  chainId: number,
  token: `0x${string}`
): Promise<Record<string, unknown> | null> {
  if (!isSupportedV1ChainId(chainId)) return null;
  let rpcUrl: string | null;
  try {
    rpcUrl = serverRpcUrlForChain(chainId);
  } catch {
    return null;
  }
  if (!rpcUrl) return null;
  const client = createPublicClient({
    chain: chainId === BSC_MAINNET_CHAIN_ID ? bsc : bscTestnet,
    transport: http(rpcUrl, { timeout: RPC_TIMEOUT_MS }),
  });
  const settled = await Promise.allSettled(
    VERIFY_VIEW_NAMES.map((functionName) =>
      client.readContract({
        address: token,
        abi: tokenAbi as never,
        functionName,
      } as never)
    )
  );
  const views: Record<string, unknown> = {};
  let fulfilled = 0;
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      views[VERIFY_VIEW_NAMES[index]] = result.value;
      fulfilled += 1;
    }
  });
  return fulfilled === 0 ? null : views;
}
