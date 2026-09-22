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
      "mainnet-disabled",
    ] as const;
    for (const code of codes) {
      const message = deployErrorMessage(code);
      assert.ok(message.title.length > 0, code);
      assert.ok(message.body.length > 0, code);
    }
  });

  it("user rejection copy states nothing was submitted", () => {
    const message = deployErrorMessage("user-rejected");
    assert.match(message.body, /no transaction was submitted/i);
  });

  it("receipt-timeout copy distinguishes submitted-but-unknown and forbids auto-send", () => {
    const message = deployErrorMessage("receipt-timeout");
    assert.match(message.body, /was submitted/i);
    assert.match(message.body, /no additional transaction will be sent automatically/i);
  });

  it("wrong-network copy names BNB Smart Chain Testnet and never a switch call", () => {
    const message = deployErrorMessage("wrong-network");
    assert.match(message.body, /BNB Smart Chain Testnet/);
    assert.ok(!/wallet_switchEthereumChain/.test(message.body));
    assert.ok(!/wallet_addEthereumChain/.test(message.body));
  });

  it("mainnet copy is preview-only with no urgency language", () => {
    const message = deployErrorMessage("mainnet-disabled");
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
