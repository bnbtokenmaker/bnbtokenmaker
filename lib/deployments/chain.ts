/**
 * Phase 7A server-side chain reader (BSC Testnet only).
 *
 * Deployment verification must never depend on a browser-selected provider:
 * this module builds a viem public client from SERVER-SIDE RPC config.
 * Server-side by placement (imported only by the record route, never by
 * client code); no RPC URL is ever sent to the browser.
 */


import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";

import { PHASE6B_CHAIN_ID, PHASE6B_RPC_DEFAULT } from "../deploy/phase6b";
import type { ChainReader } from "./verify";

const RPC_TIMEOUT_MS = 15_000;

function rpcUrl(): string {
  const configured = (process.env.BSC_TESTNET_RPC_URL ?? "").trim();
  return configured || PHASE6B_RPC_DEFAULT;
}

let cached: ChainReader | null = null;

/**
 * Shared server chain reader for chain 97. Pure reads
 * (getTransaction / getTransactionReceipt) — no wallet, no signing.
 */
export function getServerChainReader(): ChainReader {
  if (cached) return cached;
  const client = createPublicClient({
    chain: bscTestnet,
    transport: http(rpcUrl(), { timeout: RPC_TIMEOUT_MS }),
  });
  cached = {
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
  };
  return cached;
}

/** Expected factory address for server verification (chain 97 only). */
export function getExpectedFactory(): `0x${string}` | null {
  const raw = (process.env.NEXT_PUBLIC_TESTNET_FACTORY_ADDRESS ?? "").trim();
  return /^0x[a-fA-F0-9]{40}$/.test(raw) ? (raw as `0x${string}`) : null;
}

export { PHASE6B_CHAIN_ID };
