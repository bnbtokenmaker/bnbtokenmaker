/**
 * Dual-chain support for V1 deployments.
 *
 * BSC Mainnet (56) and BSC Testnet (97) are both supported with isolated
 * configuration, RPCs, and factory addresses. Unknown chains fail closed.
 *
 * Architecture:
 * - Each chain has its own factory address (no cross-chain fallback)
 * - Each chain has its own RPC endpoint
 * - Server authorization is chain-specific
 * - Client UI resolves the intended chain from configuration
 */

export const BSC_MAINNET_CHAIN_ID = 56;
export const BSC_TESTNET_CHAIN_ID = 97;

export const SUPPORTED_V1_CHAIN_IDS = [
  BSC_MAINNET_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
] as const;

export type SupportedV1ChainId = (typeof SUPPORTED_V1_CHAIN_IDS)[number];

export type V1ChainDescriptor = {
  id: SupportedV1ChainId;
  name: string;
  shortName: string;
  isTestnet: boolean;
  explorerUrl: string;
};

export const V1_CHAIN_DESCRIPTORS: Record<SupportedV1ChainId, V1ChainDescriptor> = {
  [BSC_MAINNET_CHAIN_ID]: {
    id: BSC_MAINNET_CHAIN_ID,
    name: "BNB Smart Chain",
    shortName: "BNB Chain",
    isTestnet: false,
    explorerUrl: "https://bscscan.com",
  },
  [BSC_TESTNET_CHAIN_ID]: {
    id: BSC_TESTNET_CHAIN_ID,
    name: "BNB Smart Chain Testnet",
    shortName: "BNB Testnet",
    isTestnet: true,
    explorerUrl: "https://testnet.bscscan.com",
  },
};

export function isSupportedV1ChainId(
  chainId: number | null | undefined
): chainId is SupportedV1ChainId {
  return (
    typeof chainId === "number" &&
    (SUPPORTED_V1_CHAIN_IDS as readonly number[]).includes(chainId)
  );
}

export function v1ChainDescriptor(
  chainId: number | null | undefined
): V1ChainDescriptor | null {
  return isSupportedV1ChainId(chainId) ? V1_CHAIN_DESCRIPTORS[chainId] : null;
}

export function v1ExplorerTxUrl(
  chainId: number | null | undefined,
  txHash: string
): string | null {
  const descriptor = v1ChainDescriptor(chainId);
  if (!descriptor || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) return null;
  return `${descriptor.explorerUrl}/tx/${txHash}`;
}

export function v1ExplorerAddressUrl(
  chainId: number | null | undefined,
  address: string
): string | null {
  const descriptor = v1ChainDescriptor(chainId);
  if (!descriptor || !/^0x[a-fA-F0-9]{40}$/.test(address)) return null;
  return `${descriptor.explorerUrl}/address/${address}`;
}

export function v1ExplorerTokenUrl(
  chainId: number | null | undefined,
  token: string
): string | null {
  const descriptor = v1ChainDescriptor(chainId);
  if (!descriptor || !/^0x[a-fA-F0-9]{40}$/.test(token)) return null;
  return `${descriptor.explorerUrl}/token/${token}`;
}
