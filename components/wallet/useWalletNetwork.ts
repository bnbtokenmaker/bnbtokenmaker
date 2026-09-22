"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConnection } from "wagmi";

import {
  resolveDisplayNetwork,
} from "../../lib/wallet/network";
import {
  clearProviderSession,
  ensureSessionFromConnection,
  getProviderSession,
  isSessionProviderLive,
  reconcileSessionOnConnectionChange,
  verifyProviderSession,
  type SessionConnectorLike,
} from "../../lib/wallet/session";
import { devLog, devRefId } from "../../lib/wallet/devlog";
import { parseChainId } from "../../lib/wallet/switch";

type ConnectorLike = SessionConnectorLike & {
  uid: string;
};

type SessionProviderLike = {
  on?: (event: string, handler: (value: unknown) => void) => void;
  removeListener?: (event: string, handler: (value: unknown) => void) => void;
};

/** Live re-verification cadence for the pinned provider session. */
const REVERIFY_POLL_MS = 5000;

/**
 * Single source of truth for the connected wallet's network — FAIL CLOSED.
 *
 * Truth comes ONLY from the session-pinned EIP-6963 provider object,
 * re-verified live (same object `===`, expected account present, fresh
 * `eth_chainId`) on connect, on every wagmi cache move, on a poll cadence,
 * and whenever the page regains visibility/focus — plus its
 * `chainChanged`/`accountsChanged` events.
 *
 * Display state is derived through `resolveDisplayNetwork`, so a stale
 * object, a superseded/re-instantiated provider, a disconnected connector,
 * or any unknown live state renders Wrong Network (never BSC Connected) and
 * stays deployment-ineligible. Verified readings are keyed by
 * `connectorUid|address`, so a disconnect, account switch, or connector
 * rotation instantly invalidates old truth without relying on effect
 * cleanups.
 */
export function useWalletNetwork() {
  const connection = useConnection();
  const connector = connection.connector as ConnectorLike | undefined;
  const address =
    typeof connection.address === "string" ? connection.address : undefined;
  const cachedChainId =
    typeof connection.chainId === "number" ? connection.chainId : null;

  const sessionKey =
    connection.isConnected && connector && address
      ? `${connector.uid}|${address.toLowerCase()}`
      : null;

  const [verified, setVerified] = useState<{
    key: string;
    uid: string;
    chainId: number;
  } | null>(null);
  // Generation guard for overlapping async verifications (effects only).
  const genRef = useRef(0);

  // A session is only meaningful while connected: any observed wagmi
  // disconnect (user action, wallet-side `disconnect` event on network
  // change, revoked permissions) drops the pinned session so no later
  // render can derive truth from a stale pre-disconnect provider.
  const wagmiConnected = connection.isConnected;
  useEffect(() => {
    reconcileSessionOnConnectionChange(wagmiConnected);
  }, [wagmiConnected]);

  const refresh = useCallback(async (): Promise<number | null> => {
    if (!connector || !address || !sessionKey) return null;
    const key = sessionKey;
    try {
      const result = await verifyProviderSession(connector, {
        expectedAddress: address,
      });
      setVerified({ key, uid: connector.uid, chainId: result.chainId });
      return result.chainId;
    } catch {
      setVerified((prev) => (prev && prev.key === key ? null : prev));
      return null;
    }
  }, [connector, address, sessionKey]);

  useEffect(() => {
    if (!sessionKey || !connector || !address) return;
    const active = connector;
    const expected = address;
    const key = sessionKey;
    genRef.current += 1;
    const gen = genRef.current;
    const isCurrent = () => genRef.current === gen;
    let cancelled = false;
    let sessionProvider: SessionProviderLike | undefined;

    const verifySnapshot = async () => {
      try {
        // Supersession check first: the connector must still expose the
        // exact pinned object (catches re-instantiation / rotated
        // announcements). A rotated object is rebound only when it holds
        // the expected account; otherwise the session stays dead.
        if (!(await isSessionProviderLive(active))) {
          const existing = getProviderSession();
          if (!existing || existing.connectorUid !== active.uid) {
            await ensureSessionFromConnection(active, expected);
          } else {
            clearProviderSession();
            await ensureSessionFromConnection(active, expected);
          }
        }
        const result = await verifyProviderSession(active, {
          expectedAddress: expected,
        });
        devLog(
          "reverify-ok",
          `chain=${result.chainId} ref=${devRefId(result.provider)} uid=${active.uid}`
        );
        return { chainId: result.chainId, provider: result.provider };
      } catch (error) {
        devLog(
          "reverify-failed",
          `${error instanceof Error ? error.name : String(error)} uid=${active.uid}`
        );
        return null;
      }
    };

    const onChainChanged = (value: unknown) => {
      if (!isCurrent()) return;
      const id = parseChainId(value);
      if (id === null) return;
      devLog("chainChanged", `chain=${id} uid=${active.uid}`);
      // The event source is the pinned object itself; narrow the existing
      // verified record for this generation (a full verify follows on poll).
      setVerified((prev) =>
        prev && prev.key === key ? { ...prev, chainId: id } : prev
      );
    };
    const onAccountsChanged = (value: unknown) => {
      if (!isCurrent()) return;
      const list = Array.isArray(value)
        ? value.map((entry) => String(entry).toLowerCase())
        : [];
      devLog("accountsChanged", `count=${list.length} uid=${active.uid}`);
      if (!list.includes(expected.toLowerCase())) {
        const session = getProviderSession();
        if (session && session.connectorUid === active.uid) {
          clearProviderSession();
        }
        setVerified((prev) => (prev && prev.key === key ? null : prev));
      }
    };

    void (async () => {
      const snapshot = await verifySnapshot();
      if (cancelled || !isCurrent()) return;
      if (!snapshot) {
        setVerified((prev) => (prev && prev.key === key ? null : prev));
        return;
      }
      setVerified({ key, uid: active.uid, chainId: snapshot.chainId });
      sessionProvider = snapshot.provider as SessionProviderLike;
      sessionProvider?.on?.("chainChanged", onChainChanged);
      sessionProvider?.on?.("accountsChanged", onAccountsChanged);
    })();

    const timer = setInterval(() => {
      void (async () => {
        const snapshot = await verifySnapshot();
        if (cancelled || !isCurrent()) return;
        if (!snapshot) {
          setVerified((prev) => (prev && prev.key === key ? null : prev));
          return;
        }
        setVerified({ key, uid: active.uid, chainId: snapshot.chainId });
      })();
    }, REVERIFY_POLL_MS);
    const onVisible = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }
      void (async () => {
        const snapshot = await verifySnapshot();
        if (cancelled || !isCurrent()) return;
        if (!snapshot) {
          setVerified((prev) => (prev && prev.key === key ? null : prev));
          return;
        }
        setVerified({ key, uid: active.uid, chainId: snapshot.chainId });
      })();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      try {
        sessionProvider?.removeListener?.("chainChanged", onChainChanged);
        sessionProvider?.removeListener?.("accountsChanged", onAccountsChanged);
      } catch {
        /* ignore */
      }
    };
    // cachedChainId is an intentional re-read trigger: whenever wagmi's cache
    // moves, the pinned provider is queried again so a stale/optimistic cache
    // can never flip the UI without live confirmation.
  }, [sessionKey, cachedChainId, connector, address]);

  const effective =
    verified && sessionKey && verified.key === sessionKey ? verified : null;
  const display = resolveDisplayNetwork({
    wagmiConnected: connection.isConnected,
    connectorUid: connector?.uid ?? null,
    sessionValid: effective !== null,
    verifiedUid: effective?.uid ?? null,
    liveChainId: effective?.chainId ?? null,
  });

  return {
    status: display.status,
    chainId: display.chainId,
    isConnected: connection.isConnected,
    connector: connection.connector,
    refresh,
  };
}
