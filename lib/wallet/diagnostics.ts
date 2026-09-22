/**
 * DEV-ONLY provider identity diagnostics.
 *
 * Every export here is safe to import in production: all collection functions
 * no-op unless `isDiagnosticsEnabled()` (development + localhost). Production
 * switch/connect paths never import this module and never read
 * `window.ethereum`.
 */

import { devRefId } from "./devlog";

export function isDiagnosticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (process.env.NODE_ENV === "production") return false;
  } catch {
    return false;
  }
  const host = window.location?.hostname ?? "";
  return (
    host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")
  );
}

/** Stable short id for a provider object reference (shared id space). */
export const describeProviderRef = devRefId;

export type ProviderProbeResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export type DiscoveredProviderReport = {
  refId: string;
  uuid: string;
  name: string;
  rdns: string;
  isMetaMask: boolean;
  isCoinbaseWallet: boolean;
  isTrust: boolean;
  isPhantom: boolean;
  accounts: ProviderProbeResult;
  chainId: ProviderProbeResult;
  clientVersion: ProviderProbeResult;
};

export type EthereumAmbientReport = {
  present: boolean;
  refId: string;
  matchesDiscoveredRefId: string | null;
  isMetaMask: boolean;
  isCoinbaseWallet: boolean;
  isTrust: boolean;
  isPhantom: boolean;
  providers: string[];
};

export type DiagnosticsReport = {
  collectedAt: string;
  announcementCount: number;
  duplicateRdns: string[];
  discovered: DiscoveredProviderReport[];
  ethereum: EthereumAmbientReport;
};

type AnnouncedDetail = {
  info: { uuid: string; name: string; rdns: string; icon?: string };
  provider: unknown;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function probe(
  provider: unknown,
  method: string
): Promise<ProviderProbeResult> {
  try {
    const candidate = provider as {
      request?: (args: { method: string }) => Promise<unknown>;
    };
    if (!candidate || typeof candidate.request !== "function") {
      return { ok: false, error: "no request() function" };
    }
    const raw = await withTimeout(candidate.request({ method }), 1500);
    if (method === "eth_accounts") {
      return {
        ok: true,
        value: Array.isArray(raw) ? (raw as unknown[]).map(String).join(",") : String(raw),
      };
    }
    return { ok: true, value: String(raw) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function flag(provider: unknown, key: string): boolean {
  return (
    typeof provider === "object" &&
    provider !== null &&
    (provider as Record<string, unknown>)[key] === true
  );
}

/**
 * Enumerate every EIP-6963 announcement (re-requesting providers so late
 * injectors are included), then probe each announced provider object for
 * wallet flags, `eth_accounts` and `eth_chainId`. Ambient
 * `window.ethereum` is inspected for reference equality only.
 */
export async function discoverInjectedProviders(): Promise<DiagnosticsReport | null> {
  if (!isDiagnosticsEnabled()) return null;
  const announced: AnnouncedDetail[] = [];
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail as AnnouncedDetail | undefined;
    if (detail && detail.info && detail.provider) announced.push(detail);
  };
  window.addEventListener("eip6963:announceProvider", handler);
  try {
    window.dispatchEvent(new CustomEvent("eip6963:requestProvider"));
    await new Promise((resolve) => setTimeout(resolve, 600));
  } finally {
    window.removeEventListener("eip6963:announceProvider", handler);
  }

  const rdnsCount = new Map<string, number>();
  for (const entry of announced) {
    rdnsCount.set(entry.info.rdns, (rdnsCount.get(entry.info.rdns) ?? 0) + 1);
  }

  const discovered: DiscoveredProviderReport[] = [];
  for (const entry of announced) {
    discovered.push({
      refId: describeProviderRef(entry.provider),
      uuid: entry.info.uuid,
      name: entry.info.name,
      rdns: entry.info.rdns,
      isMetaMask: flag(entry.provider, "isMetaMask"),
      isCoinbaseWallet: flag(entry.provider, "isCoinbaseWallet"),
      isTrust:
        flag(entry.provider, "isTrust") || flag(entry.provider, "isTrustWallet"),
      isPhantom: flag(entry.provider, "isPhantom"),
      accounts: await probe(entry.provider, "eth_accounts"),
      chainId: await probe(entry.provider, "eth_chainId"),
      clientVersion: await probe(entry.provider, "web3_clientVersion"),
    });
  }

  const ambient = (window as unknown as { ethereum?: unknown }).ethereum;
  const ambientProviders = (
    ambient as { providers?: unknown[] } | null | undefined
  )?.providers;
  let matches: string | null = null;
  if (typeof ambient === "object" && ambient !== null) {
    for (const entry of announced) {
      if (entry.provider === ambient) {
        matches = describeProviderRef(entry.provider);
        break;
      }
    }
  }

  return {
    collectedAt: new Date().toISOString(),
    announcementCount: announced.length,
    duplicateRdns: [...rdnsCount.entries()]
      .filter(([, count]) => count > 1)
      .map(([rdns]) => rdns),
    discovered,
    ethereum: {
      present: ambient !== undefined && ambient !== null,
      refId: describeProviderRef(ambient),
      matchesDiscoveredRefId: matches,
      isMetaMask: flag(ambient, "isMetaMask"),
      isCoinbaseWallet: flag(ambient, "isCoinbaseWallet"),
      isTrust: flag(ambient, "isTrust") || flag(ambient, "isTrustWallet"),
      isPhantom: flag(ambient, "isPhantom"),
      providers: Array.isArray(ambientProviders)
        ? ambientProviders.map((item) => describeProviderRef(item))
        : [],
    },
  };
}
