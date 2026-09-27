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
import { tokenAbi } from "../token/factory";
import type { ChainReader, TokenScalarViews } from "./verify";

const RPC_TIMEOUT_MS = 15_000;

export class ServerRpcUnavailableError extends Error {
  constructor() {
    super("BSC_TESTNET_RPC_URL is not set");
    this.name = "ServerRpcUnavailableError";
  }
}

/**
 * Resolve the server RPC URL.
 *
 * - An explicit `BSC_TESTNET_RPC_URL` always wins when set.
 * - Outside production, a public Binance Testnet endpoint is used as a
 *   local/test convenience so verification stays exercisable without keys.
 * - In production the fallback is DISABLED (fail-closed): persistence must
 *   run against a deterministic operator-configured endpoint, never a silent
 *   public default. Callers map the thrown error to a sanitized 503 and
 *   never write a deployment row.
 */
export function serverRpcUrl(): string {
  const configured = (process.env.BSC_TESTNET_RPC_URL ?? "").trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new ServerRpcUnavailableError();
  }
  return PHASE6B_RPC_DEFAULT;
}

function rpcUrl(): string {
  return serverRpcUrl();
}

let cached: ChainReader | null = null;

/**
 * Shared server chain reader for chain 97. Pure reads
 * (getTransaction / getTransactionReceipt / token views) — no wallet,
 * no signing.
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
  return cached;
}

/** Test escape hatch: drop the cached reader between isolated runs. */
export function resetServerChainReaderForTests(): void {
  cached = null;
}

/**
 * Expected factory address for server verification (chain 97 only).
 *
 * V1-first: the frozen V1 factory (NEXT_PUBLIC_V1_FACTORY_ADDRESS) is the
 * security-critical comparator for every new deployment — authorize, tx
 * build, receipt verification and the DB record must all resolve to it.
 * The legacy Phase 6B factory env (NEXT_PUBLIC_TESTNET_FACTORY_ADDRESS)
 * remains ONLY as a fallback so historical fee-free receipts can still be
 * recorded when no V1 factory is configured; it is never preferred while
 * V1 is set, so a stale legacy address can never shadow the canonical V1
 * factory on the record path.
 */
export function getExpectedFactory(): `0x${string}` | null {
  const v1 = (process.env.NEXT_PUBLIC_V1_FACTORY_ADDRESS ?? "").trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(v1)) return v1 as `0x${string}`;
  const raw = (process.env.NEXT_PUBLIC_TESTNET_FACTORY_ADDRESS ?? "").trim();
  return /^0x[a-fA-F0-9]{40}$/.test(raw) ? (raw as `0x${string}`) : null;
}

export { PHASE6B_CHAIN_ID };
