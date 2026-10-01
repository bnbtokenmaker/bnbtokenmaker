/**
 * Chain-aware manager presentation copy.
 *
 * `/manage` presentation strings must name the chain the manager actually
 * targets. Labels are delegated to the canonical wallet chain registry
 * (`networkLabel`), so this module adds phrasing only and never introduces a
 * second chain-name table.
 *
 * Every function takes an explicit chain id. Nothing is inferred from wallet
 * balance, token balance, pricing, fee, hostname or factory state.
 */

import { isSupportedV1ChainId } from "../deploy/chains";
import { networkLabel } from "../wallet/chains";

/**
 * Canonical network name: 56 -> "BNB Smart Chain",
 * 97 -> "BNB Smart Chain Testnet".
 */
export function manageNetworkLabel(chainId: number): string {
  return networkLabel(chainId);
}

/**
 * Network name plus chain id, used where the UI shows both:
 * 56 -> "BNB Smart Chain (56)", 97 -> "BNB Smart Chain Testnet (97)".
 *
 * An unsupported chain still gets the registry's safe label, but never a
 * chain id, so an unknown value can never be rendered as if it were supported.
 */
export function manageNetworkSummary(chainId: number): string {
  const label = networkLabel(chainId);
  return isSupportedV1ChainId(chainId) ? `${label} (${chainId})` : label;
}
