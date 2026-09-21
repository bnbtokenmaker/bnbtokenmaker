import {
  POPULAR_WALLETS,
  matchesPopularWallet,
  type PopularWallet,
} from "./popular-wallets";

export type ConnectorDescriptor = {
  id: string;
  name: string;
  type: string;
  rdns?: string | readonly string[];
  icon?: string;
};

export type InstalledWallet = {
  kind: "installed";
  connectorId: string;
  name: string;
  rdns?: string;
  icon?: string;
  isGeneric: boolean;
  popularId: string | null;
};

export type InstallableWallet = {
  kind: "installable";
  wallet: PopularWallet;
};

export type WalletOptions = {
  /** EIP-6963 wallets actually announced by the browser, known ones first. */
  installed: InstalledWallet[];
  /** Known wallets that were not detected, offered as install links. */
  installable: InstallableWallet[];
  /** Connector id of the WalletConnect connector, when configured. */
  walletConnectId: string | null;
};

const GENERIC_INJECTED_ID = "injected";
const WALLETCONNECT_ID = "walletConnect";

/**
 * Sentinel connector id used for the on-demand "Browser Wallet" fallback. It is
 * not a real wagmi connector in the config; WalletModal maps it to a lazily
 * created `browserWalletConnector` at connect time.
 */
export const BROWSER_WALLET_CONNECTOR_ID = GENERIC_INJECTED_ID;

/**
 * Resolve the EIP-6963 reverse-DNS identifier for a connector.
 *
 * wagmi v3 builds EIP-6963 connectors with
 * `injected({ target: { ...providerInfo, id: providerInfo.rdns } })`, so the
 * rdns is exposed as `connector.id` while `connector.rdns` stays `undefined`.
 * Prefer an explicit `rdns` when present (future-proofing), otherwise fall
 * back to the id for any injected connector that is not the generic one.
 */
export function resolveConnectorRdns(
  descriptor: ConnectorDescriptor
): string | undefined {
  const raw = descriptor.rdns;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw)) {
    const first = raw.find(
      (value): value is string => typeof value === "string" && !!value.trim()
    );
    if (first) return first.trim();
  }
  if (
    descriptor.type === "injected" &&
    descriptor.id &&
    descriptor.id !== GENERIC_INJECTED_ID
  ) {
    return descriptor.id;
  }
  return undefined;
}

export function buildWalletOptions(
  connectors: readonly ConnectorDescriptor[],
  options: { hasInjectedProvider: boolean }
): WalletOptions {
  let walletConnectId: string | null = null;
  const candidates: ConnectorDescriptor[] = [];

  for (const connector of connectors) {
    if (connector.id === WALLETCONNECT_ID) {
      walletConnectId = connector.id;
      continue;
    }
    candidates.push(connector);
  }

  const seenRdns = new Set<string>();
  const eip6963: Array<{ descriptor: ConnectorDescriptor; rdns: string }> = [];
  for (const descriptor of candidates) {
    const rdns = resolveConnectorRdns(descriptor);
    if (!rdns) continue;
    const key = rdns.toLowerCase();
    if (seenRdns.has(key)) continue;
    seenRdns.add(key);
    eip6963.push({ descriptor, rdns });
  }

  const matchPopular = (entry: {
    descriptor: ConnectorDescriptor;
    rdns: string;
  }): PopularWallet | undefined =>
    POPULAR_WALLETS.find((wallet) =>
      matchesPopularWallet(
        {
          id: entry.descriptor.id,
          name: entry.descriptor.name,
          rdns: entry.rdns,
        },
        wallet
      )
    );

  const installed: InstalledWallet[] = eip6963.map((entry) => ({
    kind: "installed",
    connectorId: entry.descriptor.id,
    name: entry.descriptor.name,
    rdns: entry.rdns,
    icon: entry.descriptor.icon,
    isGeneric: false,
    popularId: matchPopular(entry)?.id ?? null,
  }));

  const order = new Map(POPULAR_WALLETS.map((wallet, index) => [wallet.id, index]));
  installed.sort((a, b) => {
    const aRank = a.popularId ? order.get(a.popularId)! : Number.MAX_SAFE_INTEGER;
    const bRank = b.popularId ? order.get(b.popularId)! : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });

  // Only offer a generic injected wallet when the browser announced no EIP-6963
  // provider at all, so it can never shadow a real wallet identity. The
  // connector is created on demand and is never registered in the wagmi config.
  if (eip6963.length === 0 && options.hasInjectedProvider) {
    installed.push({
      kind: "installed",
      connectorId: BROWSER_WALLET_CONNECTOR_ID,
      name: "Browser Wallet",
      isGeneric: true,
      popularId: null,
    });
  }

  const installedPopularIds = new Set(
    installed
      .map((wallet) => wallet.popularId)
      .filter((id): id is string => id !== null)
  );
  const installable: InstallableWallet[] = POPULAR_WALLETS.filter(
    (wallet) => !installedPopularIds.has(wallet.id)
  ).map((wallet) => ({ kind: "installable", wallet }));

  return { installed, installable, walletConnectId };
}
