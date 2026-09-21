export const BNB_MAINNET_CHAIN_ID = 56;
export const BNB_TESTNET_CHAIN_ID = 97;

export const SUPPORTED_CHAIN_IDS = [
  BNB_MAINNET_CHAIN_ID,
  BNB_TESTNET_CHAIN_ID,
] as const;

export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

export const DEFAULT_CHAIN_ID: SupportedChainId = BNB_MAINNET_CHAIN_ID;

export type ChainDescriptor = {
  id: SupportedChainId;
  name: string;
  shortName: string;
  nativeSymbol: string;
  isTestnet: boolean;
  explorerUrl: string;
};

export const CHAIN_DESCRIPTORS: Record<SupportedChainId, ChainDescriptor> = {
  [BNB_MAINNET_CHAIN_ID]: {
    id: BNB_MAINNET_CHAIN_ID,
    name: "BNB Smart Chain",
    shortName: "BNB Chain",
    nativeSymbol: "BNB",
    isTestnet: false,
    explorerUrl: "https://bscscan.com",
  },
  [BNB_TESTNET_CHAIN_ID]: {
    id: BNB_TESTNET_CHAIN_ID,
    name: "BNB Smart Chain Testnet",
    shortName: "BNB Testnet",
    nativeSymbol: "tBNB",
    isTestnet: true,
    explorerUrl: "https://testnet.bscscan.com",
  },
};

export function isSupportedChainId(
  chainId: number | undefined | null
): chainId is SupportedChainId {
  return (
    typeof chainId === "number" &&
    (SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId)
  );
}

export function chainDescriptor(
  chainId: number | undefined | null
): ChainDescriptor | null {
  return isSupportedChainId(chainId) ? CHAIN_DESCRIPTORS[chainId] : null;
}

export function chainName(chainId: number | undefined | null): string {
  return chainDescriptor(chainId)?.name ?? "Unsupported network";
}

/**
 * Well-known chain names used only to label an unsupported network safely.
 * Anything not listed is reported by its numeric chain id rather than guessed.
 */
const KNOWN_CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  10: "OP Mainnet",
  56: "BNB Smart Chain",
  97: "BNB Smart Chain Testnet",
  137: "Polygon",
  250: "Fantom",
  324: "zkSync Era",
  8453: "Base",
  42161: "Arbitrum One",
  43114: "Avalanche C-Chain",
  11155111: "Sepolia",
};

/**
 * Human label for the wallet's active chain. Supported chains get their
 * canonical name; known-but-unsupported chains get a safe friendly name;
 * everything else is reported by its chain id so we never mislabel a network.
 */
export function networkLabel(chainId: number | undefined | null): string {
  const descriptor = chainDescriptor(chainId);
  if (descriptor) return descriptor.name;
  if (typeof chainId === "number" && KNOWN_CHAIN_NAMES[chainId]) {
    return KNOWN_CHAIN_NAMES[chainId];
  }
  if (typeof chainId === "number") {
    return `Unsupported network (chain ${chainId})`;
  }
  return "Unsupported network";
}

export function explorerAddressUrl(
  chainId: number | undefined | null,
  address: string
): string | null {
  const descriptor = chainDescriptor(chainId);
  if (!descriptor || !/^0x[a-fA-F0-9]{40}$/.test(address)) return null;
  return `${descriptor.explorerUrl}/address/${address}`;
}
