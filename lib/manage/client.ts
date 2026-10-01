/**
 * Canonical manager public-client selection.
 *
 * Single source of truth for which chain a manager read, block lookup or
 * receipt poll runs against. The chain id is always explicit — it comes from
 * the `/manage/<chainId>/<token>` route or from the action's expected chain —
 * and is never inferred from wallet balance, token balance, pricing, fee,
 * hostname or factory state.
 *
 * Unsupported chains fail closed by returning null. Nothing is ever silently
 * defaulted to mainnet or testnet, because a wrong-chain read is worse than no
 * read: it would silently mix one chain's state into another's dashboard.
 *
 * One client is created per supported chain at module load, so viem's
 * transport/connection caching keeps working across renders exactly as the
 * previous per-file module-level clients did.
 */

import { createPublicClient, http } from "viem";
import { bsc, bscTestnet } from "viem/chains";

import { BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID } from "../deploy/chains";

const mainnetPublicClient = createPublicClient({
  chain: bsc,
  transport: http(),
});

const testnetPublicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(),
});

/**
 * Public client for an explicitly requested manager chain, or null when the
 * chain is not one this project supports.
 */
export function managerPublicClient(chainId: number | null | undefined) {
  if (chainId === BSC_MAINNET_CHAIN_ID) return mainnetPublicClient;
  if (chainId === BSC_TESTNET_CHAIN_ID) return testnetPublicClient;
  return null;
}

/** True when a public client exists for this chain (56 / 97 only). */
export function isManagerChainSupported(chainId: number | null | undefined): boolean {
  return managerPublicClient(chainId) !== null;
}
