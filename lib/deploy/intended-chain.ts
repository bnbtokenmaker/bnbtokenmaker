/**
 * Production chain selection for V1 deployments.
 *
 * Resolves the intended deployment chain from environment configuration.
 * Production defaults to chain 56 (BSC Mainnet). Testnet/development
 * can override to chain 97 via NEXT_PUBLIC_DEPLOY_CHAIN_ID.
 *
 * Fail closed on unsupported/missing configuration.
 */

import { BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID, isSupportedV1ChainId } from "./chains";

const DEFAULT_PRODUCTION_CHAIN_ID = BSC_MAINNET_CHAIN_ID;

export function resolveIntendedChainId(): number {
  const raw = (process.env.NEXT_PUBLIC_DEPLOY_CHAIN_ID ?? "").trim();
  if (raw === "") {
    return DEFAULT_PRODUCTION_CHAIN_ID;
  }
  const parsed = Number(raw);
  if (!isSupportedV1ChainId(parsed)) {
    return DEFAULT_PRODUCTION_CHAIN_ID;
  }
  return parsed;
}
