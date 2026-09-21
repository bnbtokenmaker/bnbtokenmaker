"use client";

import { createConfig, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected } from "@wagmi/connectors/injected";
import { walletConnect } from "@wagmi/connectors/walletConnect";

import { BNB_MAINNET_CHAIN_ID, BNB_TESTNET_CHAIN_ID } from "./chains";

const projectId = (
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ""
).trim();

export const walletConnectProjectId = projectId;
export const walletConnectEnabled = projectId.length > 0;

const WALLETCONNECT_METADATA = {
  name: "BNB Token Maker",
  description: "Create a BEP-20 token on BNB Smart Chain.",
  url: "https://bnbtokenmaker.com",
  icons: ["https://bnbtokenmaker.com/logo-bnb-token-maker.svg"],
};

function currentThemeMode(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

/**
 * Fallback connector for browsers that expose `window.ethereum` but announce
 * no EIP-6963 provider. It is intentionally NOT registered in the wagmi config:
 * a targetless injected connector would auto-reconnect from its persisted shim
 * and could shadow a real EIP-6963 wallet, causing the app to read account and
 * chain state from the wrong provider (see WalletModal for on-demand use).
 */
export const browserWalletConnector = injected({ shimDisconnect: false });

export const walletConfig = createConfig({
  ssr: true,
  chains: [bsc, bscTestnet],
  connectors: [
    ...(walletConnectEnabled
      ? [
          walletConnect({
            projectId,
            showQrModal: true,
            metadata: WALLETCONNECT_METADATA,
            qrModalOptions: {
              themeMode: currentThemeMode(),
              themeVariables: {
                "--wcm-accent-color": "#f3ba2f",
                "--wcm-accent-fill-color": "#171208",
                "--wcm-background-color": "#f7f6f2",
                "--wcm-container-border-radius": "14px",
                "--wcm-button-border-radius": "10px",
                "--wcm-wallet-icon-border-radius": "10px",
                "--wcm-font-family": "Manrope, system-ui, sans-serif",
              },
            },
          }),
        ]
      : []),
  ],
  transports: {
    [BNB_MAINNET_CHAIN_ID]: http(),
    [BNB_TESTNET_CHAIN_ID]: http(),
  },
});
