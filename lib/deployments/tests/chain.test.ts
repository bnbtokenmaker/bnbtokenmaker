import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PHASE6B_RPC_DEFAULT } from "../../deploy/phase6b";
import {
  getExpectedFactory,
  resetServerChainReaderForTests,
  ServerRpcUnavailableError,
  serverRpcUrl,
  serverRpcUrlForChain,
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

  it("chain 97 uses testnet RPC", () => {
    withEnv("BSC_TESTNET_RPC_URL", "https://testnet-rpc.example.com", () => {
      assert.equal(serverRpcUrlForChain(97), "https://testnet-rpc.example.com");
    });
  });

  it("chain 56 uses mainnet RPC", () => {
    withEnv("BSC_MAINNET_RPC_URL", "https://mainnet-rpc.example.com", () => {
      assert.equal(serverRpcUrlForChain(56), "https://mainnet-rpc.example.com");
    });
  });

  it("chain 56 requires explicit RPC URL (no fallback)", () => {
    withEnv("BSC_MAINNET_RPC_URL", undefined, () => {
      withEnv("NODE_ENV", "production", () => {
        assert.throws(() => serverRpcUrlForChain(56), ServerRpcUnavailableError);
      });
    });
  });

  it("unsupported chain returns null", () => {
    assert.equal(serverRpcUrlForChain(1), null);
    assert.equal(serverRpcUrlForChain(137), null);
  });
});

describe("deployments — expected factory resolution (dual-chain)", () => {
  const V1_TESTNET = "0xb0fade4dae1b17b156d21dfe053ee69e0478b80d";
  const V1_MAINNET = "0x1111111111111111111111111111111111111111";

  it("chain 97 resolves testnet V1 factory", () => {
    withEnv("NEXT_PUBLIC_V1_FACTORY_ADDRESS", V1_TESTNET, () => {
      withEnv("NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS", "", () => {
        assert.equal(getExpectedFactory(97), V1_TESTNET);
      });
    });
  });

  it("chain 56 resolves mainnet V1 factory", () => {
    withEnv("NEXT_PUBLIC_V1_FACTORY_ADDRESS", "", () => {
      withEnv("NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS", V1_MAINNET, () => {
        assert.equal(getExpectedFactory(56), V1_MAINNET);
      });
    });
  });

  it("chain 56 returns null when mainnet factory not configured", () => {
    withEnv("NEXT_PUBLIC_V1_FACTORY_ADDRESS", V1_TESTNET, () => {
      withEnv("NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS", "", () => {
        assert.equal(getExpectedFactory(56), null);
      });
    });
  });

  it("chain 97 returns null when testnet factory not configured", () => {
    withEnv("NEXT_PUBLIC_V1_FACTORY_ADDRESS", "", () => {
      withEnv("NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS", V1_MAINNET, () => {
        assert.equal(getExpectedFactory(97), null);
      });
    });
  });

  it("unsupported chain returns null", () => {
    assert.equal(getExpectedFactory(1), null);
    assert.equal(getExpectedFactory(137), null);
  });
});
