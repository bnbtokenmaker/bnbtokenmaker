import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import { v1FactoryAddress } from "../factory";

describe("factory dual-chain resolution", () => {
  const originalV1Factory = process.env.NEXT_PUBLIC_V1_FACTORY_ADDRESS;
  const originalV1MainnetFactory = process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_V1_FACTORY_ADDRESS = "";
    process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS = "";
  });

  afterEach(() => {
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
  });

  it("chain 97 resolves testnet factory", () => {
    process.env.NEXT_PUBLIC_V1_FACTORY_ADDRESS = "0x1234567890123456789012345678901234567890";
    const addr = v1FactoryAddress(97);
    assert.equal(addr, "0x1234567890123456789012345678901234567890");
  });

  it("chain 56 resolves mainnet factory from separate env var", () => {
    process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    const addr = v1FactoryAddress(56);
    assert.equal(addr, "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
  });

  it("chain 56 returns null when mainnet factory not configured", () => {
    const addr = v1FactoryAddress(56);
    assert.equal(addr, null);
  });

  it("chain 97 returns null when testnet factory not configured", () => {
    const addr = v1FactoryAddress(97);
    assert.equal(addr, null);
  });

  it("unsupported chain returns null", () => {
    assert.equal(v1FactoryAddress(1), null);
    assert.equal(v1FactoryAddress(137), null);
    assert.equal(v1FactoryAddress(null), null);
    assert.equal(v1FactoryAddress(undefined), null);
  });

  it("chain 56 never falls back to testnet factory", () => {
    process.env.NEXT_PUBLIC_V1_FACTORY_ADDRESS = "0x1234567890123456789012345678901234567890";
    process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS = "";
    const addr = v1FactoryAddress(56);
    assert.equal(addr, null);
  });

  it("chain 97 never falls back to mainnet factory", () => {
    process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    process.env.NEXT_PUBLIC_V1_FACTORY_ADDRESS = "";
    const addr = v1FactoryAddress(97);
    assert.equal(addr, null);
  });

  it("malformed factory address returns null", () => {
    process.env.NEXT_PUBLIC_V1_FACTORY_ADDRESS = "not-an-address";
    const addr = v1FactoryAddress(97);
    assert.equal(addr, null);
  });
});
