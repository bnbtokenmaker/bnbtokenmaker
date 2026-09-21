export type PopularWallet = {
  id: string;
  name: string;
  rdns: string;
  matchNames: readonly string[];
  installUrl: string;
};

/**
 * Wallets we can recognize by EIP-6963 reverse-DNS identifier and offer an
 * install link for when they are not present in the browser.
 *
 * Only EVM/BEP-20 capable wallets belong here. Solana-only providers never
 * announce an EIP-6963 provider, so they can never be matched or listed as
 * installed; they are intentionally absent.
 */
export const POPULAR_WALLETS: readonly PopularWallet[] = [
  {
    id: "metamask",
    name: "MetaMask",
    rdns: "io.metamask",
    matchNames: ["metamask"],
    installUrl: "https://metamask.io/download/",
  },
  {
    id: "trust",
    name: "Trust Wallet",
    rdns: "com.trustwallet.app",
    matchNames: ["trust wallet", "trustwallet", "trust"],
    installUrl: "https://trustwallet.com/download",
  },
  {
    id: "phantom",
    name: "Phantom",
    rdns: "app.phantom",
    matchNames: ["phantom"],
    installUrl: "https://phantom.app/download",
  },
  {
    id: "rabby",
    name: "Rabby Wallet",
    rdns: "io.rabby",
    matchNames: ["rabby"],
    installUrl: "https://rabby.io/",
  },
  {
    id: "binance",
    name: "Binance Wallet",
    rdns: "com.binance.wallet",
    matchNames: ["binance wallet", "binance web3", "binance"],
    installUrl: "https://www.binance.com/en/web3wallet",
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    rdns: "com.coinbase.wallet",
    matchNames: ["coinbase wallet", "coinbase"],
    installUrl: "https://www.coinbase.com/wallet/downloads",
  },
  {
    id: "brave",
    name: "Brave Wallet",
    rdns: "com.brave.wallet",
    matchNames: ["brave wallet", "brave"],
    installUrl: "https://brave.com/wallet/",
  },
  {
    id: "okx",
    name: "OKX Wallet",
    rdns: "com.okex.wallet",
    matchNames: ["okx wallet", "okx"],
    installUrl: "https://www.okx.com/web3",
  },
];

export function normalizeWalletName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * A connector matches a known wallet when its reverse-DNS identifier (from
 * EIP-6963 `providerInfo.rdns`, or `connector.id`, which wagmi sets to the
 * rdns) matches, or when its display name contains a known alias.
 */
export function matchesPopularWallet(
  connector: { id?: string; name: string; rdns?: string },
  wallet: PopularWallet
): boolean {
  const identifiers = [connector.rdns, connector.id]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());
  if (identifiers.includes(wallet.rdns.toLowerCase())) return true;

  const connectorName = normalizeWalletName(connector.name);
  if (!connectorName) return false;
  return wallet.matchNames.some((alias) => {
    const normalized = normalizeWalletName(alias);
    return normalized.length > 0 && connectorName.includes(normalized);
  });
}

export function popularWalletById(id: string): PopularWallet | null {
  return POPULAR_WALLETS.find((wallet) => wallet.id === id) ?? null;
}
