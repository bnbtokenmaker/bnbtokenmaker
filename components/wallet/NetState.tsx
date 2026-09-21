"use client";

import { networkLabel } from "../../lib/wallet/chains";
import { useWalletNetwork } from "./useWalletNetwork";

type NetStateValue = "disconnected" | "connected" | "testnet" | "wrong";

export function NetState() {
  const network = useWalletNetwork();

  let state: NetStateValue = "disconnected";
  if (network.status === "mainnet") state = "connected";
  else if (network.status === "testnet") state = "testnet";
  else if (network.status === "wrong") state = "wrong";

  return (
    <span
      className="net-state"
      role="status"
      data-netstate={state}
      title={network.isConnected ? networkLabel(network.chainId) : undefined}
    >
      <span className="ns-txt"></span>
    </span>
  );
}
