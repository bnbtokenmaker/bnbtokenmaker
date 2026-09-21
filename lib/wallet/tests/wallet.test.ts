import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BNB_MAINNET_CHAIN_ID,
  BNB_TESTNET_CHAIN_ID,
  chainDescriptor,
  chainName,
  explorerAddressUrl,
  isSupportedChainId,
} from "../chains";
import { describeWalletError } from "../errors";
import { formatBalance, isAddress, shortenAddress } from "../format";
import { matchesPopularWallet, POPULAR_WALLETS } from "../popular-wallets";
import { buildWalletOptions, type ConnectorDescriptor } from "../select";

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

const injected: ConnectorDescriptor = {
  id: "injected",
  name: "Injected",
  type: "injected",
};
const metamask: ConnectorDescriptor = {
  id: "io.metamask",
  name: "MetaMask",
  type: "injected",
  rdns: "io.metamask",
  icon: "data:image/svg+xml;base64,AAAA",
};
const rabby: ConnectorDescriptor = {
  id: "io.rabby",
  name: "Rabby Wallet",
  type: "injected",
  rdns: "io.rabby",
};
const walletConnect: ConnectorDescriptor = {
  id: "walletConnect",
  name: "WalletConnect",
  type: "walletConnect",
};

describe("lib/wallet — chains", () => {
  it("recognizes only BNB mainnet and testnet", () => {
    assert.equal(isSupportedChainId(BNB_MAINNET_CHAIN_ID), true);
    assert.equal(isSupportedChainId(BNB_TESTNET_CHAIN_ID), true);
    assert.equal(isSupportedChainId(1), false);
    assert.equal(isSupportedChainId(0), false);
    assert.equal(isSupportedChainId(undefined), false);
    assert.equal(isSupportedChainId(null), false);
  });

  it("exposes chain metadata", () => {
    assert.equal(chainDescriptor(56)?.name, "BNB Smart Chain");
    assert.equal(chainDescriptor(56)?.nativeSymbol, "BNB");
    assert.equal(chainDescriptor(97)?.isTestnet, true);
    assert.equal(chainDescriptor(1), null);
    assert.equal(chainName(1), "Unsupported network");
    assert.equal(chainName(56), "BNB Smart Chain");
  });

  it("builds explorer links only for valid addresses on supported chains", () => {
    assert.equal(
      explorerAddressUrl(56, ADDRESS),
      `https://bscscan.com/address/${ADDRESS}`
    );
    assert.equal(
      explorerAddressUrl(97, ADDRESS),
      `https://testnet.bscscan.com/address/${ADDRESS}`
    );
    assert.equal(explorerAddressUrl(1, ADDRESS), null);
    assert.equal(explorerAddressUrl(56, "not-an-address"), null);
    assert.equal(explorerAddressUrl(undefined, ADDRESS), null);
  });
});

describe("lib/wallet — address formatting", () => {
  it("validates EVM addresses", () => {
    assert.equal(isAddress(ADDRESS), true);
    assert.equal(isAddress("0x123"), false);
    assert.equal(isAddress(ADDRESS.toUpperCase().replace("0X", "0x")), true);
    assert.equal(isAddress(undefined), false);
  });

  it("shortens addresses with an ellipsis", () => {
    assert.equal(shortenAddress(ADDRESS), "0x1234\u20265678");
    assert.equal(shortenAddress(ADDRESS, 2, 2), "0x12\u202678");
    assert.equal(shortenAddress("0x123"), "");
    assert.equal(shortenAddress(undefined), "");
    assert.equal(shortenAddress(null), "");
  });

  it("formats bigint balances without floating point drift", () => {
    assert.equal(formatBalance(0n), "0");
    assert.equal(formatBalance(10n ** 18n), "1");
    assert.equal(formatBalance(15n * 10n ** 17n), "1.5");
    assert.equal(formatBalance(1234567890123456789n), "1.2345");
    assert.equal(formatBalance(1n), "0");
    assert.equal(formatBalance(-(10n ** 18n)), "-1");
  });
});

describe("lib/wallet — error messages", () => {
  it("maps wallet rejections to a friendly message", () => {
    assert.equal(
      describeWalletError({ name: "UserRejectedRequestError" }),
      "The request was rejected in your wallet."
    );
    assert.equal(
      describeWalletError({ message: "User rejected the request." }),
      "The request was rejected in your wallet."
    );
  });

  it("maps unsupported-chain errors", () => {
    assert.equal(
      describeWalletError({ message: "Unrecognized chain ID" }),
      "Your wallet does not support this network yet."
    );
  });

  it("maps provider no-account errors to a friendly message", () => {
    assert.equal(
      describeWalletError({ message: "Unable to find any account for 60" }),
      "We couldn't find an account in that wallet. Add or unlock an account, then try again."
    );
    assert.equal(
      describeWalletError({ message: "No accounts found" }),
      "We couldn't find an account in that wallet. Add or unlock an account, then try again."
    );
  });

  it("maps already-pending wallet requests", () => {
    assert.equal(
      describeWalletError({ message: "Request already pending" }),
      "A request is already open in your wallet. Finish or dismiss it, then try again."
    );
  });

  it("falls back to the raw short message or a default", () => {
    assert.equal(describeWalletError({ shortMessage: "RPC down" }), "RPC down");
    assert.equal(describeWalletError(null), "Something went wrong. Please try again.");
    assert.equal(
      describeWalletError({}, "Custom fallback"),
      "Custom fallback"
    );
  });
});

describe("lib/wallet — popular wallet matching", () => {
  it("matches by reverse-DNS identifier", () => {
    const wallet = POPULAR_WALLETS.find((w) => w.id === "metamask")!;
    assert.equal(matchesPopularWallet({ name: "Whatever", rdns: "io.metamask" }, wallet), true);
  });

  it("matches by normalized display name", () => {
    const binance = POPULAR_WALLETS.find((w) => w.id === "binance")!;
    assert.equal(
      matchesPopularWallet({ name: "Binance Web3 Wallet" }, binance),
      true
    );
    const trust = POPULAR_WALLETS.find((w) => w.id === "trust")!;
    assert.equal(matchesPopularWallet({ name: "Trust Wallet" }, trust), true);
  });

  it("does not match unrelated wallets", () => {
    const metamask = POPULAR_WALLETS.find((w) => w.id === "metamask")!;
    assert.equal(
      matchesPopularWallet({ name: "Coinbase Wallet", rdns: "com.coinbase.wallet" }, metamask),
      false
    );
  });

  it("matches by connector id when rdns is not exposed (wagmi v3)", () => {
    const metamaskWallet = POPULAR_WALLETS.find((w) => w.id === "metamask")!;
    assert.equal(
      matchesPopularWallet({ id: "io.metamask", name: "MetaMask" }, metamaskWallet),
      true
    );
  });
});

describe("lib/wallet — wallet option grouping", () => {
  it("splits WalletConnect, installed and installable wallets", () => {
    const options = buildWalletOptions(
      [injected, metamask, rabby, walletConnect],
      { hasInjectedProvider: true }
    );

    assert.equal(options.walletConnectId, "walletConnect");

    const installedIds = options.installed.map((wallet) => wallet.connectorId);
    assert.deepEqual(installedIds, ["io.metamask", "io.rabby"]);
    assert.equal(options.installed[0].icon, metamask.icon);

    const installableIds = options.installable.map((entry) => entry.wallet.id);
    assert.ok(!installableIds.includes("metamask"));
    assert.ok(!installableIds.includes("rabby"));
    assert.ok(installableIds.includes("trust"));
    assert.ok(installableIds.includes("binance"));
  });

  it("treats EIP-6963 connectors whose rdns lives in connector.id as installed", () => {
    const wagmiMetamask: ConnectorDescriptor = {
      id: "io.metamask",
      name: "MetaMask",
      type: "injected",
      icon: metamask.icon,
    };
    const options = buildWalletOptions([injected, wagmiMetamask], {
      hasInjectedProvider: true,
    });
    assert.equal(options.installed.length, 1);
    assert.equal(options.installed[0].connectorId, "io.metamask");
    assert.equal(options.installed[0].popularId, "metamask");
    assert.ok(
      !options.installable.some((entry) => entry.wallet.id === "metamask")
    );
  });

  it("shows unknown EIP-6963 wallets using their provider-supplied name", () => {
    const acme: ConnectorDescriptor = {
      id: "com.acme.wallet",
      name: "Acme Wallet",
      type: "injected",
      rdns: "com.acme.wallet",
      icon: "data:image/png;base64,AAAA",
    };
    const options = buildWalletOptions([injected, acme], {
      hasInjectedProvider: true,
    });
    assert.equal(options.installed.length, 1);
    assert.equal(options.installed[0].name, "Acme Wallet");
    assert.equal(options.installed[0].isGeneric, false);
    assert.equal(options.installed[0].icon, acme.icon);
    assert.equal(options.installable.length, POPULAR_WALLETS.length);
  });

  it("falls back to a generic browser wallet only when no EIP-6963 wallet exists", () => {
    const withProvider = buildWalletOptions([injected], {
      hasInjectedProvider: true,
    });
    assert.equal(withProvider.installed.length, 1);
    assert.equal(withProvider.installed[0].isGeneric, true);
    assert.equal(withProvider.installed[0].name, "Browser Wallet");

    const withoutProvider = buildWalletOptions([injected], {
      hasInjectedProvider: false,
    });
    assert.deepEqual(withoutProvider.installed, []);

    const withEip6963 = buildWalletOptions([injected, metamask], {
      hasInjectedProvider: true,
    });
    assert.equal(withEip6963.installed.length, 1);
    assert.equal(withEip6963.installed[0].isGeneric, false);
  });

  it("de-duplicates providers announcing the same rdns", () => {
    const duplicate: ConnectorDescriptor = {
      ...metamask,
      id: "io.metamask#2",
    };
    const options = buildWalletOptions([metamask, duplicate], {
      hasInjectedProvider: false,
    });
    assert.equal(options.installed.length, 1);
    assert.equal(options.installed[0].connectorId, "io.metamask");
  });
});
