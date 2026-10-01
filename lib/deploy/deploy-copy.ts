/**
 * Chain-aware /deploy display copy.
 *
 * Every network name and gas-asset label rendered on the deployment page is
 * derived here from the canonical intended chain id that the deployment flow
 * already resolves (`resolveIntendedChainId`). Nothing is inferred from wallet
 * balance, pricing, hostname or fee, so the page can never advertise a network
 * the deployment would not actually use.
 *
 * Names come from the wallet chain registry, which stays the single source of
 * truth for chain naming; this module only adds the deploy-specific phrasing.
 */

import { BSC_TESTNET_CHAIN_ID } from "./chains";
import { networkLabel } from "../wallet/chains";

/**
 * Canonical network name for the intended deployment chain:
 * 56 -> "BNB Smart Chain", 97 -> "BNB Smart Chain Testnet".
 */
export function deployNetworkName(intendedChainId: number): string {
  return networkLabel(intendedChainId);
}

/**
 * Native gas asset label for the intended chain. Testnet BNB is worthless, so
 * the copy must distinguish it from real mainnet BNB ("testnet BNB" vs "BNB").
 */
export function deployGasAssetName(intendedChainId: number): string {
  return intendedChainId === BSC_TESTNET_CHAIN_ID ? "testnet BNB" : "BNB";
}

/**
 * Intro sentence above the deployment panel. The network named here must be
 * the same chain the deploy button will actually submit to.
 */
export function deployIntroCopy(intendedChainId: number): string {
  return `Check everything once — limits can't change later. Your wallet will ask you to confirm one transaction on ${deployNetworkName(intendedChainId)}.`;
}

/**
 * Success-panel network row, e.g. "BNB Smart Chain (56)" / "BNB Smart Chain
 * Testnet (97)".
 */
export function deployNetworkSummary(intendedChainId: number): string {
  return `${deployNetworkName(intendedChainId)} (${intendedChainId})`;
}
