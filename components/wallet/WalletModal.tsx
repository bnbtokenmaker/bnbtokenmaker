"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  useBalance,
  useConnect,
  useConnection,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmi";

import {
  BNB_MAINNET_CHAIN_ID,
  explorerAddressUrl,
  isSupportedChainId,
  networkLabel,
} from "../../lib/wallet/chains";
import { browserWalletConnector } from "../../lib/wallet/config";
import { describeWalletError } from "../../lib/wallet/errors";
import { formatBalance, shortenAddress } from "../../lib/wallet/format";
import {
  BROWSER_WALLET_CONNECTOR_ID,
  buildWalletOptions,
  type ConnectorDescriptor,
} from "../../lib/wallet/select";
import { WalletIcon } from "./WalletIcon";
import { useWalletUI } from "./WalletUI";
import { useWalletNetwork } from "./useWalletNetwork";

type Connector = ReturnType<typeof useConnectors>[number];

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const serverFalse = () => false;

function injectedSnapshot() {
  return Boolean((window as unknown as { ethereum?: unknown }).ethereum);
}

function subscribeInjected(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener("eip6963:announceProvider", handler);
  window.addEventListener("ethereum#initialized", handler);
  const timer = window.setTimeout(handler, 0);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("eip6963:announceProvider", handler);
    window.removeEventListener("ethereum#initialized", handler);
  };
}

function toDescriptor(connector: Connector): ConnectorDescriptor {
  return {
    id: connector.id,
    name: connector.name,
    type: connector.type,
    rdns: connector.rdns,
    icon: connector.icon,
  };
}

function ConnectRow({
  name,
  sub,
  icon,
  badge,
  pending,
  disabled,
  onClick,
}: {
  name: string;
  sub?: string;
  icon?: string;
  badge?: string;
  pending?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={"wal-item" + (pending ? " is-pending" : "")}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="wal-ico">
        <WalletIcon icon={icon} />
      </span>
      <span className="wal-meta">
        <b>{name}</b>
        {sub ? <span className="wal-sub">{sub}</span> : null}
      </span>
      <span className="wal-trail">
        {pending ? (
          <span className="wal-spin" aria-hidden="true" />
        ) : badge ? (
          <span className="wal-badge">{badge}</span>
        ) : (
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}

export function WalletModal() {
  const { view, isOpen, close } = useWalletUI();
  const { isConnected } = useConnection();

  useEffect(() => {
    if (isOpen && view === "connect" && isConnected) close();
  }, [isOpen, view, isConnected, close]);

  if (!isOpen) return null;

  return <WalletDialog />;
}

function WalletDialog() {
  const { view, close } = useWalletUI();

  const connection = useConnection();
  const connectors = useConnectors();
  const [connectError, setConnectError] = useState<unknown>(null);
  const [switchError, setSwitchError] = useState<unknown>(null);
  const {
    mutate: connect,
    isPending: isConnecting,
    variables: connectVariables,
  } = useConnect({
    mutation: { onError: (error) => setConnectError(error) },
  });
  const {
    mutate: switchChain,
    isPending: isSwitching,
  } = useSwitchChain({
    mutation: { onError: (error) => setSwitchError(error) },
  });
  const { mutate: disconnect } = useDisconnect();

  const hasInjectedProvider = useSyncExternalStore(
    subscribeInjected,
    injectedSnapshot,
    serverFalse,
  );
  const [copied, setCopied] = useState(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const network = useWalletNetwork();
  const isConnected = network.isConnected;
  const address = connection.address;
  const chainId = network.chainId;
  const supported = isSupportedChainId(chainId);
  const connector = connection.connector;

  const balance = useBalance({
    address: isConnected && supported ? address : undefined,
    chainId: supported ? chainId : undefined,
  });

  const connectorsById = useMemo(() => {
    const map = new Map<string, Connector>();
    for (const item of connectors) map.set(item.id, item);
    return map;
  }, [connectors]);

  const options = useMemo(
    () =>
      buildWalletOptions(connectors.map(toDescriptor), { hasInjectedProvider }),
    [connectors, hasInjectedProvider]
  );

  useEffect(() => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.classList.add("wallet-open");

    const focusTimer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const first = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? dialog).focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.classList.remove("wallet-open");
      const restore = restoreFocusRef.current;
      if (restore && typeof restore.focus === "function") restore.focus();
    };
  }, []);

  const handleConnect = useCallback(
    (connectorId: string) => {
      setConnectError(null);
      if (connectorId === BROWSER_WALLET_CONNECTOR_ID) {
        // On-demand fallback for browsers with no EIP-6963 provider. Never
        // registered in the wagmi config so it cannot shadow a real wallet.
        connect({ connector: browserWalletConnector });
        return;
      }
      const target = connectorsById.get(connectorId);
      if (!target) return;
      connect({ connector: target });
    },
    [connectorsById, connect],
  );

  const handleSwitch = useCallback(() => {
    setSwitchError(null);
    switchChain({ chainId: BNB_MAINNET_CHAIN_ID });
  }, [switchChain]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    close();
  }, [disconnect, close]);

  const handleCopy = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [address]);

  const handleDialogKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [close],
  );

  const pendingConnector = isConnecting ? connectVariables?.connector : undefined;
  const pendingConnectorId =
    pendingConnector && typeof pendingConnector !== "function"
      ? pendingConnector.id
      : null;
  const connectErrorMessage = connectError
    ? describeWalletError(connectError)
    : null;
  const switchErrorMessage = switchError
    ? describeWalletError(switchError)
    : null;

  const renderConnect = () => (
    <>
      <header className="wal-head">
        <div>
          <h2 id="wal-title">Connect a wallet</h2>
          <p>Choose a wallet to connect to BNB Smart Chain.</p>
        </div>
        <button
          type="button"
          className="wal-close"
          onClick={close}
          aria-label="Close"
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </header>

      <div className="wal-body">
        {connectErrorMessage ? (
          <p className="wal-alert" role="alert">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            {connectErrorMessage}
          </p>
        ) : null}

        {options.installed.length > 0 ? (
          <section className="wal-sec">
            <span className="wal-sec-label">Installed wallets</span>
            <div className="wal-list">
              {options.installed.map((wallet) => (
                <ConnectRow
                  key={wallet.connectorId}
                  name={wallet.name}
                  sub={wallet.isGeneric ? "Browser extension" : "Ready to connect"}
                  icon={wallet.icon}
                  badge="Installed"
                  pending={pendingConnectorId === wallet.connectorId}
                  disabled={isConnecting && pendingConnectorId !== wallet.connectorId}
                  onClick={() => handleConnect(wallet.connectorId)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {options.installable.length > 0 ? (
          <section className="wal-sec">
            <span className="wal-sec-label">Popular wallets</span>
            <div className="wal-list">
              {options.installable.map((entry) => (
                <a
                  key={entry.wallet.id}
                  className="wal-item"
                  href={entry.wallet.installUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="wal-ico">
                    <WalletIcon />
                  </span>
                  <span className="wal-meta">
                    <b>{entry.wallet.name}</b>
                    <span className="wal-sub">Not installed</span>
                  </span>
                  <span className="wal-trail wal-trail-link">
                    Install
                    <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {options.walletConnectId ? (
          <section className="wal-sec">
            <span className="wal-sec-label">All wallets</span>
            <div className="wal-list">
              <ConnectRow
                name="WalletConnect"
                sub="Scan with a mobile wallet"
                pending={pendingConnectorId === options.walletConnectId}
                disabled={isConnecting && pendingConnectorId !== options.walletConnectId}
                onClick={() => handleConnect(options.walletConnectId as string)}
              />
            </div>
          </section>
        ) : null}
      </div>

      <footer className="wal-foot">
        <p className="wal-safe">
          <i className="fa-solid fa-shield-halved" aria-hidden="true" />
          BNB Token Maker never asks for your seed phrase or private key.
        </p>
        <p className="wal-legal">
          By connecting, you agree to our{" "}
          <Link href="/terms">Terms</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </footer>
    </>
  );

  const renderAccount = () => {
    const explorerUrl = address ? explorerAddressUrl(chainId, address) : null;
    const balanceText = balance.data
      ? `${formatBalance(balance.data.value, balance.data.decimals, 4)} ${
          balance.data.symbol
        }`
      : balance.isLoading
        ? "\u2026"
        : "\u2014";

    return (
      <>
        <header className="wal-head">
          <div>
            <h2 id="wal-title">Wallet</h2>
            <p>
              {supported
                ? "Your connection to BNB Smart Chain."
                : `Connected to ${networkLabel(chainId)}. Switch to BNB Smart Chain to continue.`}
            </p>
          </div>
          <button
            type="button"
            className="wal-close"
            onClick={close}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </header>

        <div className="wal-body">
          <div className="wal-ident">
            <span className="wal-ico wal-ico-lg">
              <WalletIcon icon={connector?.icon} size={40} />
            </span>
            <span className="wal-ident-txt">
              <b>{connector?.name ?? "Wallet"}</b>
              <span className="wal-badge">Connected</span>
            </span>
          </div>

          <div className="wal-rows">
            <div className="wal-row">
              <span className="wal-row-label">Network</span>
              <span className="wal-row-value">
                <span className={"wal-net" + (supported ? "" : " is-wrong")}>
                  <span className="wal-net-dot" aria-hidden="true" />
                  {networkLabel(chainId)}
                </span>
              </span>
            </div>
            <div className="wal-row">
              <span className="wal-row-label">Address</span>
              <span className="wal-row-value">
                <span className="wal-mono-addr" title={address}>
                  {shortenAddress(address, 6, 6) || "\u2014"}
                </span>
                <button
                  type="button"
                  className="wal-copy"
                  onClick={handleCopy}
                  aria-label="Copy address"
                >
                  <i
                    className={
                      copied ? "fa-solid fa-check" : "fa-regular fa-copy"
                    }
                    aria-hidden="true"
                  />
                  {copied ? "Copied" : "Copy"}
                </button>
              </span>
            </div>
            {supported ? (
              <div className="wal-row">
                <span className="wal-row-label">Balance</span>
                <span className="wal-row-value wal-balance">
                  {balanceText}
                </span>
              </div>
            ) : null}
          </div>

          {switchErrorMessage ? (
            <p className="wal-alert" role="alert">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
              {switchErrorMessage}
            </p>
          ) : null}

          <div className="wal-actions">
            {!supported ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSwitch}
                disabled={isSwitching}
              >
                <i className="fa-solid fa-arrow-right-arrow-left" aria-hidden="true" />
                {isSwitching ? "Switching\u2026" : "Switch to BNB Smart Chain"}
              </button>
            ) : explorerUrl ? (
              <a
                className="btn btn-ghost"
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                View on BscScan
              </a>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost wal-disconnect"
              onClick={handleDisconnect}
            >
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
              Disconnect
            </button>
          </div>
        </div>

        <footer className="wal-foot">
          <p className="wal-safe">
            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            BNB Token Maker never asks for your seed phrase or private key.
          </p>
        </footer>
      </>
    );
  };

  return (
    <div
      className="wal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="wal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wal-title"
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        {view === "account" ? renderAccount() : renderConnect()}
      </div>
    </div>
  );
}
