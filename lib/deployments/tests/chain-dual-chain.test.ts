import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import {
  serverRpcUrlForChain,
  getServerChainReader,
  getExpectedFactory,
  resetServerChainReaderForTests,
  ServerRpcUnavailableError,
} from "../chain";

describe("chain dual-chain RPC isolation", () => {
  const originalTestnetRpc = process.env.BSC_TESTNET_RPC_URL;
  const originalMainnetRpc = process.env.BSC_MAINNET_RPC_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  const setNodeEnv = (value: string | undefined) => {
    if (value === undefined) {
      delete (process.env as unknown as Record<string, unknown>).NODE_ENV;
    } else {
      (process.env as unknown as Record<string, string>).NODE_ENV = value;
    }
  };

  beforeEach(() => {
    resetServerChainReaderForTests();
    process.env.BSC_TESTNET_RPC_URL = "";
    process.env.BSC_MAINNET_RPC_URL = "";
    setNodeEnv("development");
  });

  afterEach(() => {
    resetServerChainReaderForTests();
    if (originalTestnetRpc === undefined) {
      delete process.env.BSC_TESTNET_RPC_URL;
    } else {
      process.env.BSC_TESTNET_RPC_URL = originalTestnetRpc;
    }
    if (originalMainnetRpc === undefined) {
      delete process.env.BSC_MAINNET_RPC_URL;
    } else {
      process.env.BSC_MAINNET_RPC_URL = originalMainnetRpc;
    }
    setNodeEnv(originalNodeEnv);
  });

  it("chain 97 uses testnet RPC", () => {
    process.env.BSC_TESTNET_RPC_URL = "https://testnet-rpc.example.com";
    const url = serverRpcUrlForChain(97);
    assert.equal(url, "https://testnet-rpc.example.com");
  });

  it("chain 56 uses mainnet RPC", () => {
    process.env.BSC_MAINNET_RPC_URL = "https://mainnet-rpc.example.com";
    const url = serverRpcUrlForChain(56);
    assert.equal(url, "https://mainnet-rpc.example.com");
  });

  it("chain 96 does not fall back to mainnet RPC", () => {
    process.env.BSC_MAINNET_RPC_URL = "https://mainnet-rpc.example.com";
    const url = serverRpcUrlForChain(96);
    assert.equal(url, null);
  });

  it("unsupported chain returns null", () => {
    assert.equal(serverRpcUrlForChain(1), null);
    assert.equal(serverRpcUrlForChain(137), null);
  });

  it("chain 56 requires explicit RPC URL (no fallback)", () => {
    // @ts-expect-error -- intentional test mutation (saved/restored in beforeEach/afterEach)
    process.env.NODE_ENV = "production";
    assert.throws(
      () => serverRpcUrlForChain(56),
      ServerRpcUnavailableError
    );
  });

  it("chain 97 falls back to public endpoint outside production", () => {
    // @ts-expect-error -- intentional test mutation (saved/restored in beforeEach/afterEach)
    process.env.NODE_ENV = "development";
    const url = serverRpcUrlForChain(97);
    assert.ok(url);
    assert.ok(url.includes("binance"));
  });

  it("getServerChainReader throws for unsupported chain", () => {
    assert.throws(
      () => getServerChainReader(1),
      ServerRpcUnavailableError
    );
  });

  it("getExpectedFactory delegates to v1FactoryAddress", () => {
    const originalV1Factory = process.env.NEXT_PUBLIC_V1_FACTORY_ADDRESS;
    const originalV1MainnetFactory = process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS;
    process.env.NEXT_PUBLIC_V1_FACTORY_ADDRESS = "0x1234567890123456789012345678901234567890";
    process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS = "";
    try {
      assert.equal(
        getExpectedFactory(97),
        "0x1234567890123456789012345678901234567890"
      );
      assert.equal(getExpectedFactory(56), null);
    } finally {
      if (originalV1Factory === undefined) {
        delete process.env.NEXT_PUBLIC_V1_FACTORY_ADDRESS;
      } else {
        process.env.NEXT_PUBLIC_V1_FACTORY_ADDRESS = originalV1Factory;
      }
      if (originalV1MainnetFactory === undefined) {
        delete process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS;
      } else {
        process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS = originalV1MainnetFactory;
      }
    }
  });
});
