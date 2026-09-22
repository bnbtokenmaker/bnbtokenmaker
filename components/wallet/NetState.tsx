"use client";

import { networkLabel } from "../../lib/wallet/chains";
import type { WalletNetworkStatus } from "../../lib/wallet/network";
import { useWalletNetwork } from "./useWalletNetwork";

export type NetStateValue = "disconnected" | "connected" | "testnet" | "wrong";

/**
 * Authoritative pill mapping — the ONLY place wallet status becomes banner
 * text/state. `connected` renders exclusively for a live-verified mainnet
 * status; every other status (including disconnected and unknown) renders a
 * non-connected pill.
 */
export function netStateForStatus(status: WalletNetworkStatus): NetStateValue {
  if (status === "mainnet") return "connected";
  if (status === "testnet") return "testnet";
  if (status === "wrong") return "wrong";
  return "disconnected";
}

export function NetStatePill({
  state,
  title,
}: {
  state: NetStateValue;
  title?: string;
}) {
  return (
    <span
      className="net-state"
      role="status"
      data-netstate={state}
      title={title}
    >
      <span className="ns-txt"></span>
    </span>
  );
}

export function NetState() {
  const network = useWalletNetwork();

  return (
    <NetStatePill
      state={netStateForStatus(network.status)}
      title={network.isConnected ? networkLabel(network.chainId) : undefined}
    />
  );
}
