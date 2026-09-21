"use client";

import { useEffect, useState } from "react";
import { useConnection } from "wagmi";

import {
  classifyWalletNetwork,
  type WalletNetworkStatus,
} from "../../lib/wallet/network";

type Eip1193ProviderLike = {
  on?: (event: string, handler: (value: unknown) => void) => void;
  removeListener?: (event: string, handler: (value: unknown) => void) => void;
};

function toChainId(value: unknown): number | null {
  if (typeof value === "string") {
    const parsed = value.startsWith("0x")
      ? Number.parseInt(value, 16)
      : Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

/**
 * Single source of truth for the connected wallet's network.
 *
 * The value is derived from the chain of the connector/provider that owns the
 * connected account (never from the configured/default chain). On top of
 * wagmi's reactive connection state we re-read `eth_chainId` straight from the
 * active provider and listen to its `chainChanged` event, so the UI reflects a
 * wallet network switch immediately and cannot drift from the real provider.
 */
export function useWalletNetwork() {
  const connection = useConnection();
  const connector = connection.connector;
  const [providerChain, setProviderChain] = useState<{
    uid: string;
    chainId: number;
  } | null>(null);

  useEffect(() => {
    if (!connection.isConnected || !connector) return;

    let cancelled = false;
    let provider: Eip1193ProviderLike | undefined;
    const uid = connector.uid;

    const read = async () => {
      try {
        const id = await connector.getChainId();
        if (!cancelled && Number.isFinite(id)) {
          setProviderChain({ uid, chainId: id });
        }
      } catch {
        /* provider not available yet */
      }
    };
    void read();

    const onChainChanged = (value: unknown) => {
      const id = toChainId(value);
      if (id !== null) setProviderChain({ uid, chainId: id });
    };

    void (async () => {
      try {
        provider = (await connector.getProvider()) as
          | Eip1193ProviderLike
          | undefined;
        provider?.on?.("chainChanged", onChainChanged);
      } catch {
        /* provider not available yet */
      }
    })();

    return () => {
      cancelled = true;
      try {
        provider?.removeListener?.("chainChanged", onChainChanged);
      } catch {
        /* ignore */
      }
    };
  }, [connection.isConnected, connector]);

  const providerChainId =
    connector && providerChain && providerChain.uid === connector.uid
      ? providerChain.chainId
      : null;
  const chainId = providerChainId ?? connection.chainId ?? null;
  const status: WalletNetworkStatus = classifyWalletNetwork(
    connection.isConnected,
    chainId
  );

  return {
    status,
    chainId,
    isConnected: connection.isConnected,
    connector,
  };
}
