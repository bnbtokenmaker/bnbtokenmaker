import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  keccak256,
  recoverTypedDataAddress,
  stringToHex,
  type Hex,
} from "viem";

import {
  QUOTE_DOMAIN_NAME,
  QUOTE_DOMAIN_VERSION,
  buildDeployQuote,
  deriveQuoteNonce,
  getQuoteServerConfig,
  quoteDigest,
  quoteDomain,
  serverAccountFromEnv,
  signDeployQuote,
  tokenConfigHash,
  QuoteSignerError,
  type TypedDataSigner,
  type V1TokenConfig,
} from "../quote-signer";

const FREEZE = JSON.parse(
  readFileSync(join(process.cwd(), "contracts", "freeze", "vectors.json"), "utf8")
) as {
  domain: { name: string; version: string; chainId: string };
  types: { DeployQuote: { name: string; type: string }[] };
  cases: Array<{
    label: string;
    token: Record<string, unknown>;
    quote: Record<string, string>;
    configHash: Hex;
    digest: Hex;
    signature: Hex;
    signer: string;
  }>;
};

const OWNER = "0x2222222222222222222222222222222222222222" as `0x${string}`;
const FACTORY = "0x1111111111111111111111111111111111111111" as `0x${string}`;

function baseToken(): V1TokenConfig {
  return {
    name: "Vector Token",
    symbol: "VCTR",
    decimals: 18,
    initialSupply: 1000000n * 10n ** 18n,
    owner: OWNER,
    burnable: false,
    mintable: false,
    pausable: false,
    maxTxAmount: 0n,
    maxWalletAmount: 0n,
    blacklistEnabled: false,
    whitelistEnabled: false,
    buyTaxBps: 0,
    sellTaxBps: 0,
    marketingWallet: "0x0000000000000000000000000000000000000000",
    marketingShareBps: 0,
    liquidityShareBps: 0,
    autoLiquidityEnabled: false,
    swapThreshold: 0n,
    antiBotEnabled: false,
    snipeBlocks: 0n,
    maxSupply: 0n,
  };
}

function unbigint(value: unknown): unknown {
  if (typeof value === "bigint") return value;
  if (typeof value === "string" && value.startsWith("bigint:")) {
    return BigInt(value.slice("bigint:".length));
  }
  if (Array.isArray(value)) return value.map(unbigint);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, unbigint(v)])
    );
  }
  return value;
}

function stubSigner(address: `0x${string}`, signature: Hex): TypedDataSigner & {
  seen: unknown[];
} {
  const seen: unknown[] = [];
  return {
    address,
    seen,
    signTypedData: async (args) => {
      seen.push(args);
      return signature;
    },
  };
}

describe("deploy quote signer — frozen vector parity (no key required)", () => {
  it("tokenConfigHash reproduces the frozen base-only configHash", () => {
    const base = FREEZE.cases.find((c) => c.label === "base-only");
    assert.ok(base);
    const token = unbigint(base.token) as unknown as V1TokenConfig;
    assert.equal(tokenConfigHash(token), base.configHash);
    assert.equal(tokenConfigHash(baseToken()), base.configHash);
  });

  it("quoteDigest reproduces the frozen digests (byte-identical encoding)", () => {
    for (const c of FREEZE.cases) {
      const message = unbigint(c.quote) as Parameters<typeof quoteDigest>[2];
      assert.equal(quoteDigest(56, FACTORY, message), c.digest, c.label);
    }
  });

  it("frozen signatures recover to the frozen signer (real secp256k1)", async () => {
    for (const c of FREEZE.cases) {
      const message = unbigint(c.quote) as {
        configHash: Hex;
        feeWei: bigint;
        chainId: bigint;
        factory: `0x${string}`;
        nonce: Hex;
        expiry: bigint;
        pricingVersion: Hex;
      };
      const recovered = await recoverTypedDataAddress({
        domain: {
          name: FREEZE.domain.name,
          version: FREEZE.domain.version,
          chainId: 56,
          verifyingContract: FACTORY,
        },
        types: FREEZE.types,
        primaryType: "DeployQuote",
        message,
        signature: c.signature,
      });
      assert.equal(recovered.toLowerCase(), c.signer.toLowerCase(), c.label);
    }
  });

  it("domain constants match the frozen spec", () => {
    assert.equal(QUOTE_DOMAIN_NAME, "BNBTokenMaker");
    assert.equal(QUOTE_DOMAIN_VERSION, "1");
    assert.deepEqual(quoteDomain(56, FACTORY), {
      name: "BNBTokenMaker",
      version: "1",
      chainId: 56,
      verifyingContract: FACTORY,
    });
  });
});

describe("deploy quote signer — bindings", () => {
  const token = () => baseToken();

  it("config mutation changes configHash (exact-config binding)", () => {
    const a = tokenConfigHash(token());
    assert.notEqual(tokenConfigHash({ ...token(), initialSupply: 2n }), a);
    assert.notEqual(tokenConfigHash({ ...token(), owner: "0x3333333333333333333333333333333333333333" as `0x${string}` }), a);
    assert.notEqual(tokenConfigHash({ ...token(), buyTaxBps: 100 }), a);
  });

  it("payer binds through the hashed owner field", () => {
    // Different owners hash differently; the factory enforces owner==sender,
    // so the quote is usable only by the bound payer.
    assert.notEqual(
      tokenConfigHash(token()),
      tokenConfigHash({ ...token(), owner: "0x9999999999999999999999999999999999999999" as `0x${string}` })
    );
  });

  it("chain and factory bind through domain + message", () => {
    const { quote } = buildDeployQuote({
      token: token(),
      feeWei: 100n,
      payer: OWNER,
      chainId: 56,
      factory: FACTORY,
      pricingVersion: keccak256(stringToHex("v1")),
      ttlSeconds: 900,
      nowSeconds: 1700000000,
      nonceRandomness: ("0x" + "11".repeat(32)) as Hex,
    });
    assert.notEqual(quoteDigest(56, FACTORY, quote), quoteDigest(97, FACTORY, quote));
    assert.notEqual(
      quoteDigest(56, FACTORY, quote),
      quoteDigest(56, "0x9999999999999999999999999999999999999999" as `0x${string}`, quote)
    );
    assert.notEqual(
      quoteDigest(56, FACTORY, quote),
      quoteDigest(56, FACTORY, { ...quote, feeWei: 101n })
    );
  });

  it("expiry is now + ttl; nonce is unique per randomness", () => {
    const a = buildDeployQuote({
      token: token(),
      feeWei: 100n,
      payer: OWNER,
      chainId: 56,
      factory: FACTORY,
      pricingVersion: keccak256(stringToHex("v1")),
      ttlSeconds: 900,
      nowSeconds: 1700000000,
      nonceRandomness: ("0x" + "11".repeat(32)) as Hex,
    });
    assert.equal(a.quote.expiry, 1700000900n);
    const b = buildDeployQuote({
      token: token(),
      feeWei: 100n,
      payer: OWNER,
      chainId: 56,
      factory: FACTORY,
      pricingVersion: keccak256(stringToHex("v1")),
      ttlSeconds: 900,
      nowSeconds: 1700000000,
      nonceRandomness: ("0x" + "22".repeat(32)) as Hex,
    });
    assert.notEqual(a.quote.nonce, b.quote.nonce);
    // Same inputs + same randomness are deterministic (retry-safe).
    const a2 = buildDeployQuote({
      token: token(),
      feeWei: 100n,
      payer: OWNER,
      chainId: 56,
      factory: FACTORY,
      pricingVersion: keccak256(stringToHex("v1")),
      ttlSeconds: 900,
      nowSeconds: 1700000000,
      nonceRandomness: ("0x" + "11".repeat(32)) as Hex,
    });
    assert.equal(a.quote.nonce, a2.quote.nonce);
  });

  it("deriveQuoteNonce binds the full authorization context", () => {
    const base = {
      chainId: 56n,
      factory: FACTORY,
      payer: OWNER,
      configHash: keccak256(stringToHex("cfg")),
      feeWei: 100n,
      expiry: 1700000900n,
      randomness: ("0x" + "11".repeat(32)) as Hex,
    };
    const a = deriveQuoteNonce(base);
    assert.notEqual(deriveQuoteNonce({ ...base, feeWei: 101n }), a);
    assert.notEqual(deriveQuoteNonce({ ...base, expiry: 1700000901n }), a);
    assert.notEqual(
      deriveQuoteNonce({ ...base, payer: "0x9999999999999999999999999999999999999999" as `0x${string}` }),
      a
    );
  });

  it("pricingVersion binds (different version, different digest)", () => {
    const t = token();
    const q1 = buildDeployQuote({
      token: t, feeWei: 100n, payer: OWNER, chainId: 56, factory: FACTORY,
      pricingVersion: keccak256(stringToHex("v1")),
      ttlSeconds: 900, nowSeconds: 1700000000,
      nonceRandomness: ("0x" + "11".repeat(32)) as Hex,
    });
    const q2 = buildDeployQuote({
      token: t, feeWei: 100n, payer: OWNER, chainId: 56, factory: FACTORY,
      pricingVersion: keccak256(stringToHex("v2")),
      ttlSeconds: 900, nowSeconds: 1700000000,
      nonceRandomness: ("0x" + "11".repeat(32)) as Hex,
    });
    // Same context + randomness: same nonce (pricingVersion binds through
    // the digest, which is the on-chain security property).
    assert.equal(q1.quote.nonce, q2.quote.nonce);
    assert.notEqual(quoteDigest(56, FACTORY, q1.quote), quoteDigest(56, FACTORY, q2.quote));
  });

  it("signDeployQuote passes the exact domain + message to the signer", async () => {
    const stub = stubSigner(OWNER, ("0x" + "aa".repeat(65)) as Hex);
    const { quote } = buildDeployQuote({
      token: token(),
      feeWei: 100n,
      payer: OWNER,
      chainId: 56,
      factory: FACTORY,
      pricingVersion: keccak256(stringToHex("v1")),
      ttlSeconds: 900,
      nowSeconds: 1700000000,
      nonceRandomness: ("0x" + "11".repeat(32)) as Hex,
    });
    const sig = await signDeployQuote({ signer: stub, chainId: 56, factory: FACTORY, quote });
    assert.equal(sig, ("0x" + "aa".repeat(65)) as Hex);
    assert.equal(stub.seen.length, 1);
    const call = stub.seen[0] as {
      domain: unknown;
      primaryType: string;
      message: unknown;
    };
    assert.deepEqual(call.domain, quoteDomain(56, FACTORY));
    assert.equal(call.primaryType, "DeployQuote");
    assert.deepEqual(call.message, quote);
  });
});

describe("deploy quote signer — server config (fail-closed, no secrets)", () => {
  const OLD = { ...process.env };
  const setEnv = (values: Record<string, string | undefined>) => {
    for (const [k, v] of Object.entries(values)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
  const GOOD = {
    DEPLOY_QUOTE_CHAIN_ID: "97",
    DEPLOY_QUOTE_FACTORY_ADDRESS: FACTORY,
    DEPLOY_QUOTE_SIGNER_ADDRESS: OWNER,
    DEPLOY_QUOTE_TTL_SECONDS: "900",
  };

  it("loads a complete configuration", () => {
    setEnv({ ...GOOD, DEPLOY_QUOTE_ZERO_FEE: undefined });
    try {
      assert.deepEqual(getQuoteServerConfig(), {
        chainId: 97,
        factory: FACTORY,
        signerAddress: OWNER,
        ttlSeconds: 900,
        zeroFee: false,
      });
    } finally {
      setEnv(OLD as Record<string, string>);
      process.env = { ...OLD };
    }
  });

  it("rejects missing chain/factory/signer and bad ttl", () => {
    const cases: Array<[Record<string, string | undefined>, string]> = [
      [{ ...GOOD, DEPLOY_QUOTE_CHAIN_ID: undefined }, "chain-unavailable"],
      [{ ...GOOD, DEPLOY_QUOTE_FACTORY_ADDRESS: "nope" }, "factory-unavailable"],
      [{ ...GOOD, DEPLOY_QUOTE_SIGNER_ADDRESS: undefined }, "signer-unavailable"],
      [{ ...GOOD, DEPLOY_QUOTE_TTL_SECONDS: "0" }, "signer-unavailable"],
      [{ ...GOOD, DEPLOY_QUOTE_TTL_SECONDS: "99999999" }, "signer-unavailable"],
    ];
    for (const [env, code] of cases) {
      setEnv(env);
      try {
        assert.throws(() => getQuoteServerConfig(), (e: unknown) => {
          assert.ok(e instanceof QuoteSignerError);
          assert.equal(e.code, code);
          return true;
        });
      } finally {
        process.env = { ...OLD };
      }
    }
  });

  it("refuses to build an account without a key (never logs it)", () => {
    setEnv({ ...GOOD, DEPLOY_QUOTE_SIGNER_KEY: undefined });
    try {
      assert.throws(() => serverAccountFromEnv(), (e: unknown) => {
        assert.ok(e instanceof QuoteSignerError);
        assert.equal(e.code, "signer-unavailable");
        assert.ok(!String(e).includes("0x"));
        return true;
      });
    } finally {
      process.env = { ...OLD };
    }
  });

  it("zeroFee flag parses explicitly", () => {
    setEnv({ ...GOOD, DEPLOY_QUOTE_ZERO_FEE: "true" });
    try {
      assert.equal(getQuoteServerConfig().zeroFee, true);
    } finally {
      process.env = { ...OLD };
    }
    setEnv({ ...GOOD, DEPLOY_QUOTE_ZERO_FEE: "TRUE" });
    try {
      assert.equal(getQuoteServerConfig().zeroFee, true);
    } finally {
      process.env = { ...OLD };
    }
  });
});
