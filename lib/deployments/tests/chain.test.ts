import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PHASE6B_RPC_DEFAULT } from "../../deploy/phase6b";
import {
  getExpectedFactory,
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

describe("deployments — expected factory resolution (V1 trust boundary)", () => {
  const V1 = "0xb0fade4dae1b17b156d21dfe053ee69e0478b80d";
  const LEGACY = "0x1111111111111111111111111111111111111111";

  function withFactories(
    v1: string | undefined,
    legacy: string | undefined,
    fn: () => void
  ): void {
    withEnv("NEXT_PUBLIC_V1_FACTORY_ADDRESS", v1, () => {
      withEnv("NEXT_PUBLIC_TESTNET_FACTORY_ADDRESS", legacy, fn);
    });
  }

  it("resolves the canonical V1 factory when configured", () => {
    withFactories(V1, undefined, () => {
      assert.equal(getExpectedFactory(), V1);
    });
  });

  it("prefers V1 over a stale legacy factory (never shadowed)", () => {
    withFactories(V1, LEGACY, () => {
      assert.equal(getExpectedFactory(), V1);
    });
  });

  it("falls back to the legacy factory only when V1 is unset", () => {
    withFactories(undefined, LEGACY, () => {
      assert.equal(getExpectedFactory(), LEGACY);
    });
  });

  it("returns null when no factory is configured (fail closed)", () => {
    withFactories(undefined, undefined, () => {
      assert.equal(getExpectedFactory(), null);
    });
  });

  it("ignores malformed factory values", () => {
    withFactories("not-an-address", "also-bad", () => {
      assert.equal(getExpectedFactory(), null);
    });
    withFactories("not-an-address", LEGACY, () => {
      assert.equal(getExpectedFactory(), LEGACY);
    });
  });
});
