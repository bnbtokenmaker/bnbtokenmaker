import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PHASE6B_RPC_DEFAULT } from "../../deploy/phase6b";
import {
  resetServerChainReaderForTests,
  ServerRpcUnavailableError,
  serverRpcUrl,
} from "../chain";

function withEnv(name: string, value: string | undefined, fn: () => void): void {
  const previous = process.env[name];
  try {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
    resetServerChainReaderForTests();
    fn();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
    resetServerChainReaderForTests();
  }
}

describe("deployments — server RPC resolution (fail-closed in production)", () => {
  it("prefers an explicit BSC_TESTNET_RPC_URL in every environment", () => {
    withEnv("BSC_TESTNET_RPC_URL", "https://rpc.example.com/", () => {
      withEnv("NODE_ENV", "production", () => {
        assert.equal(serverRpcUrl(), "https://rpc.example.com/");
      });
      withEnv("NODE_ENV", "test", () => {
        assert.equal(serverRpcUrl(), "https://rpc.example.com/");
      });
    });
  });

  it("falls back to the public default outside production", () => {
    withEnv("BSC_TESTNET_RPC_URL", undefined, () => {
      withEnv("NODE_ENV", "test", () => {
        assert.equal(serverRpcUrl(), PHASE6B_RPC_DEFAULT);
      });
    });
  });

  it("fails closed in production when no RPC is configured", () => {
    withEnv("BSC_TESTNET_RPC_URL", undefined, () => {
      withEnv("NODE_ENV", "production", () => {
        assert.throws(() => serverRpcUrl(), ServerRpcUnavailableError);
      });
    });
  });
});
