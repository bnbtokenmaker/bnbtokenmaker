import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

import { getQuoteServerConfig, QuoteSignerError } from "../quote-signer";

describe("quote-signer mainnet safety", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.DEPLOY_QUOTE_CHAIN_ID = "";
    process.env.DEPLOY_QUOTE_FACTORY_ADDRESS = "";
    process.env.DEPLOY_QUOTE_SIGNER_ADDRESS = "";
    process.env.DEPLOY_QUOTE_TTL_SECONDS = "";
    process.env.DEPLOY_QUOTE_ZERO_FEE = "";
  });

  afterEach(() => {
    for (const key of [
      "DEPLOY_QUOTE_CHAIN_ID",
      "DEPLOY_QUOTE_FACTORY_ADDRESS",
      "DEPLOY_QUOTE_SIGNER_ADDRESS",
      "DEPLOY_QUOTE_TTL_SECONDS",
      "DEPLOY_QUOTE_ZERO_FEE",
    ]) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it("rejects zero-fee for chain 56 (BSC Mainnet)", () => {
    process.env.DEPLOY_QUOTE_CHAIN_ID = "56";
    process.env.DEPLOY_QUOTE_FACTORY_ADDRESS = "0x1234567890123456789012345678901234567890";
    process.env.DEPLOY_QUOTE_SIGNER_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    process.env.DEPLOY_QUOTE_ZERO_FEE = "true";
    assert.throws(
      () => getQuoteServerConfig(),
      (error: unknown) => {
        assert.ok(error instanceof QuoteSignerError);
        assert.equal(error.code, "signer-unavailable");
        return true;
      }
    );
  });

  it("allows zero-fee for chain 97 (BSC Testnet)", () => {
    process.env.DEPLOY_QUOTE_CHAIN_ID = "97";
    process.env.DEPLOY_QUOTE_FACTORY_ADDRESS = "0x1234567890123456789012345678901234567890";
    process.env.DEPLOY_QUOTE_SIGNER_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    process.env.DEPLOY_QUOTE_ZERO_FEE = "true";
    const config = getQuoteServerConfig();
    assert.equal(config.chainId, 97);
    assert.equal(config.zeroFee, true);
  });

  it("allows non-zero-fee for chain 56", () => {
    process.env.DEPLOY_QUOTE_CHAIN_ID = "56";
    process.env.DEPLOY_QUOTE_FACTORY_ADDRESS = "0x1234567890123456789012345678901234567890";
    process.env.DEPLOY_QUOTE_SIGNER_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    process.env.DEPLOY_QUOTE_ZERO_FEE = "false";
    const config = getQuoteServerConfig();
    assert.equal(config.chainId, 56);
    assert.equal(config.zeroFee, false);
  });

  it("rejects missing chain ID", () => {
    process.env.DEPLOY_QUOTE_FACTORY_ADDRESS = "0x1234567890123456789012345678901234567890";
    process.env.DEPLOY_QUOTE_SIGNER_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    assert.throws(
      () => getQuoteServerConfig(),
      (error: unknown) => {
        assert.ok(error instanceof QuoteSignerError);
        assert.equal(error.code, "chain-unavailable");
        return true;
      }
    );
  });

  it("rejects missing factory address", () => {
    process.env.DEPLOY_QUOTE_CHAIN_ID = "56";
    process.env.DEPLOY_QUOTE_SIGNER_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    assert.throws(
      () => getQuoteServerConfig(),
      (error: unknown) => {
        assert.ok(error instanceof QuoteSignerError);
        assert.equal(error.code, "factory-unavailable");
        return true;
      }
    );
  });

  it("rejects missing signer address", () => {
    process.env.DEPLOY_QUOTE_CHAIN_ID = "56";
    process.env.DEPLOY_QUOTE_FACTORY_ADDRESS = "0x1234567890123456789012345678901234567890";
    assert.throws(
      () => getQuoteServerConfig(),
      (error: unknown) => {
        assert.ok(error instanceof QuoteSignerError);
        assert.equal(error.code, "signer-unavailable");
        return true;
      }
    );
  });

  it("rejects malformed factory address", () => {
    process.env.DEPLOY_QUOTE_CHAIN_ID = "56";
    process.env.DEPLOY_QUOTE_FACTORY_ADDRESS = "not-an-address";
    process.env.DEPLOY_QUOTE_SIGNER_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    assert.throws(
      () => getQuoteServerConfig(),
      (error: unknown) => {
        assert.ok(error instanceof QuoteSignerError);
        assert.equal(error.code, "factory-unavailable");
        return true;
      }
    );
  });
});
