"use client";

import { useConnection } from "wagmi";

import { networkLabel } from "../../lib/wallet/chains";
import { shortenAddress } from "../../lib/wallet/format";
import { useWalletUI } from "./WalletUI";
import { useWalletNetwork } from "./useWalletNetwork";

function ConnectedLabel({
  address,
  wrong,
}: {
  address: `0x${string}`;
  wrong?: boolean;
}) {
  return (
    <>
      <span className={"wal-dot" + (wrong ? " is-wrong" : "")} aria-hidden="true" />
      <span className="wal-addr">{shortenAddress(address)}</span>
    </>
  );
}

export function HeaderWalletButton() {
  const { address, isConnected } = useConnection();
  const network = useWalletNetwork();
  const { open } = useWalletUI();
  const wrong = network.status === "wrong";

  if (isConnected && address) {
    return (
      <button
        type="button"
        className={"btn btn-sm nav-wallet is-connected" + (wrong ? " is-wrong" : "")}
        onClick={() => open("account")}
        aria-label={`Wallet ${shortenAddress(address)}. ${
          wrong ? `Wrong network, ${networkLabel(network.chainId)}. ` : ""
        }Open account`}
        title={wrong ? `Wrong Network \u00b7 ${networkLabel(network.chainId)}` : undefined}
      >
        <ConnectedLabel address={address} wrong={wrong} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-primary btn-sm nav-wallet"
      onClick={() => open("connect")}
    >
      <i className="fa-solid fa-wallet" aria-hidden="true" />
      Connect Wallet
    </button>
  );
}

export function HeaderWalletLink() {
  const { address, isConnected } = useConnection();
  const network = useWalletNetwork();
  const { open } = useWalletUI();
  const connected = isConnected && address;
  const wrong = network.status === "wrong";

  return (
    <button
      type="button"
      className={
        "nav-wallet-link" +
        (connected ? " is-connected" : "") +
        (wrong ? " is-wrong" : "")
      }
      onClick={() => open(connected ? "account" : "connect")}
    >
      {connected ? (
        <ConnectedLabel address={address} wrong={wrong} />
      ) : (
        <>
          <i className="fa-solid fa-wallet" aria-hidden="true" />
          Connect Wallet
        </>
      )}
    </button>
  );
}
