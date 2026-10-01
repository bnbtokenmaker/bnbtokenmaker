import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyDeployFailure,
  classifyReceiptFailure,
  deployErrorMessage,
  devQueryErrorCode,
  fallbackDeployMessage,
  DeployFlowError,
} from "../errors";
import { BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID } from "../chains";

describe("deploy errors — sanitized user messages", () => {
  it("maps every code to a non-empty title and body", () => {
    const codes = [
      "wallet-disconnected",
      "wrong-network",
      "account-changed",
      "provider-unavailable",
      "user-rejected",
      "insufficient-gas-funds",
      "gas-estimate-failed",
      "simulation-reverted",
      "rpc-unavailable",
      "tx-submit-failed",
      "tx-reverted",
      "receipt-timeout",
      "event-missing",
      "quote-stale",
      "invalid-config",
      "duplicate-attempt",
      "factory-unavailable",
      "authorization-failed",
      "fee-mismatch",
      "mainnet-disabled",
    ] as const;
    for (const code of codes) {
      for (const chainId of [BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID]) {
        const message = deployErrorMessage(code, chainId);
        assert.ok(message.title.length > 0, `${code}/${chainId}`);
        assert.ok(message.body.length > 0, `${code}/${chainId}`);
        // Network-dependent copy must never leak an unresolved placeholder.
        assert.ok(!/\{(network|asset)\}/.test(message.body), `${code}/${chainId}`);
      }
    }
  });

  it("user rejection copy states nothing was submitted", () => {
    const message = deployErrorMessage("user-rejected", BSC_MAINNET_CHAIN_ID);
    assert.match(message.body, /no transaction was submitted/i);
  });

  it("receipt-timeout copy distinguishes submitted-but-unknown and forbids auto-send", () => {
    const message = deployErrorMessage("receipt-timeout", BSC_MAINNET_CHAIN_ID);
    assert.match(message.body, /was submitted/i);
    assert.match(message.body, /no additional transaction will be sent automatically/i);
  });

  it("wrong-network copy names the intended chain and never a switch call", () => {
    for (const chainId of [BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID]) {
      const message = deployErrorMessage("wrong-network", chainId);
      assert.match(message.body, /Please switch your wallet to /);
      assert.ok(!/wallet_switchEthereumChain/.test(message.body));
      assert.ok(!/wallet_addEthereumChain/.test(message.body));
    }
    const mainnet = deployErrorMessage("wrong-network", BSC_MAINNET_CHAIN_ID);
    assert.match(mainnet.body, /BNB Smart Chain/);
    assert.ok(!/Testnet/.test(mainnet.body), "mainnet must not say Testnet");
    const testnet = deployErrorMessage("wrong-network", BSC_TESTNET_CHAIN_ID);
    assert.match(testnet.body, /BNB Smart Chain Testnet/);
  });

  it("rpc-unavailable copy names the intended chain", () => {
    const mainnet = deployErrorMessage("rpc-unavailable", BSC_MAINNET_CHAIN_ID);
    assert.match(mainnet.body, /^BNB Smart Chain could not be reached/);
    assert.ok(!/Testnet/.test(mainnet.body), "mainnet must not say Testnet");
    const testnet = deployErrorMessage("rpc-unavailable", BSC_TESTNET_CHAIN_ID);
    assert.match(testnet.body, /^BNB Smart Chain Testnet could not be reached/);
  });

  it("insufficient-gas-funds copy separates real BNB from worthless testnet BNB", () => {
    const mainnet = deployErrorMessage(
      "insufficient-gas-funds",
      BSC_MAINNET_CHAIN_ID,
    );
    assert.match(mainnet.body, /enough BNB to pay the network fee/);
    assert.match(mainnet.body, /Top up BNB/);
    assert.ok(!/testnet/i.test(mainnet.body), "mainnet must not ask for testnet BNB");
    const testnet = deployErrorMessage(
      "insufficient-gas-funds",
      BSC_TESTNET_CHAIN_ID,
    );
    assert.match(testnet.body, /enough testnet BNB to pay the network fee/);
    assert.match(testnet.body, /Top up testnet BNB/);
  });

  it("mainnet copy is preview-only with no urgency language", () => {
    const message = deployErrorMessage("mainnet-disabled", BSC_TESTNET_CHAIN_ID);
    assert.match(message.body, /not available yet/i);
    assert.ok(!/hurry|limited|soon|last chance/i.test(`${message.title} ${message.body}`));
  });

  it("fallback message never promises an automatic retry", () => {
    const message = fallbackDeployMessage();
    assert.match(message.body, /no additional transaction will be sent automatically/i);
  });
});

describe("deploy errors — failure classification", () => {
  it("detects user rejection by code and message variants", () => {
    assert.equal(classifyDeployFailure({ code: 4001, message: "x" }), "user-rejected");
    assert.equal(
      classifyDeployFailure(new Error("User rejected the request")),
      "user-rejected"
    );
    assert.equal(
      classifyDeployFailure({ name: "UserRejectedRequestError" }),
      "user-rejected"
    );
    assert.equal(
      classifyDeployFailure({ shortMessage: "User denied transaction signature." }),
      "user-rejected"
    );
  });

  it("detects insufficient funds for gas", () => {
    assert.equal(
      classifyDeployFailure(new Error("insufficient funds for gas * price + value")),
      "insufficient-gas-funds"
    );
  });

  it("passes DeployFlowError codes through untouched", () => {
    assert.equal(
      classifyDeployFailure(new DeployFlowError("simulation-reverted")),
      "simulation-reverted"
    );
  });

  it("never leaks raw RPC text: unknown errors map to the safe fallback", () => {
    assert.equal(
      classifyDeployFailure(new Error("0x93f03676b597f893b7f1548 stack trace blob")),
      "tx-submit-failed"
    );
    assert.equal(classifyDeployFailure(null), "tx-submit-failed");
    assert.equal(classifyDeployFailure(undefined, "rpc-unavailable"), "rpc-unavailable");
  });

  it("exposes sanitized query codes in development, never raw errors", () => {
    assert.equal(
      devQueryErrorCode(new DeployFlowError("factory-unavailable"), "gas-estimate-failed"),
      "factory-unavailable"
    );
    assert.equal(
      devQueryErrorCode(new Error("0x93f blob"), "gas-estimate-failed"),
      "gas-estimate-failed"
    );
    assert.equal(devQueryErrorCode(null, "quote-stale"), null);
    assert.equal(devQueryErrorCode(undefined, "quote-stale"), null);
  });

  it("hides query codes in production builds", () => {
    const env = process.env as Record<string, string | undefined>;
    const previous = env.NODE_ENV;
    env.NODE_ENV = "production";
    try {
      assert.equal(
        devQueryErrorCode(new DeployFlowError("factory-unavailable"), "gas-estimate-failed"),
        null
      );
    } finally {
      env.NODE_ENV = previous;
    }
  });

  it("classifies receipt failures into reverted vs unknown-confirmation", () => {
    assert.equal(
      classifyReceiptFailure(new Error("transaction reverted and hardhat couldn't...")),
      "tx-reverted"
    );
    assert.equal(
      classifyReceiptFailure(new Error("Timed out while waiting for receipt")),
      "receipt-timeout"
    );
  });
});
