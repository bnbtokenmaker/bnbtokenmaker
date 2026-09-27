import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keccak256, stringToHex, type Hex } from "viem";

import { devPricingConfig } from "../../pricing/server/dev-values";
import type { AuthoritativeSnapshot } from "../../pricing/server/store";
import {
  authorizeDeployment,
  parseAuthorizeRequest,
  parseAuthorizeToken,
  selectionsFromToken,
  AuthorizeError,
  type AuthorizeTokenInput,
  type V1TokenConfig,
} from "../authorize";
import type { TypedDataSigner } from "../quote-signer";

const OWNER = "0x2222222222222222222222222222222222222222" as `0x${string}`;
const MARKETING = "0x3333333333333333333333333333333333333333" as `0x${string}`;
const FACTORY = "0x1111111111111111111111111111111111111111" as `0x${string}`;
const FIXED_SIG = ("0x" + "bb".repeat(65)) as Hex;

function baseInput(overrides: Partial<AuthorizeTokenInput> = {}): AuthorizeTokenInput {
  return {
    name: "Auth Token",
    symbol: "AUTH",
    decimals: 18,
    initialSupplyBase: (1000000n * 10n ** 18n).toString(10),
    owner: OWNER,
    burnable: false,
    mintable: false,
    pausable: false,
    maxTxAmountBase: "0",
    maxWalletAmountBase: "0",
    blacklistEnabled: false,
    whitelistEnabled: false,
    buyTaxBps: 0,
    sellTaxBps: 0,
    marketingWallet: "0x0000000000000000000000000000000000000000",
    marketingShareBps: 0,
    liquidityShareBps: 0,
    autoLiquidityEnabled: false,
    swapThresholdBase: "0",
    antiBotEnabled: false,
    snipeBlocks: 0,
    maxSupplyBase: "0",
    ...overrides,
  };
}

function fullMonty(): V1TokenConfig {
  return parseAuthorizeToken(
    baseInput({
      burnable: true,
      mintable: true,
      pausable: true,
      maxTxAmountBase: (10000n * 10n ** 18n).toString(10),
      maxWalletAmountBase: (20000n * 10n ** 18n).toString(10),
      blacklistEnabled: true,
      whitelistEnabled: false,
      buyTaxBps: 400,
      sellTaxBps: 600,
      marketingWallet: MARKETING,
      marketingShareBps: 7000,
      liquidityShareBps: 3000,
      autoLiquidityEnabled: true,
      swapThresholdBase: (1000n * 10n ** 18n).toString(10),
      antiBotEnabled: true,
      snipeBlocks: 10,
      maxSupplyBase: (10000000n * 10n ** 18n).toString(10),
    })
  );
}

function stubSigner(address: `0x${string}`): TypedDataSigner {
  return {
    address,
    signTypedData: async () => FIXED_SIG,
  };
}

function snapshot(): AuthoritativeSnapshot {
  return {
    config: devPricingConfig(),
    version: "dev-1",
    campaign: null,
    fallback: true,
  };
}

function serverConfig(overrides = {}) {
  return {
    chainId: 97,
    factory: FACTORY,
    signerAddress: OWNER,
    ttlSeconds: 900,
    zeroFee: false,
    ...overrides,
  };
}

function expectInvalid(fn: () => unknown, fragment: string): void {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof AuthorizeError);
    assert.equal(error.code, "invalid-config");
    assert.match(error.message, new RegExp(fragment));
    return;
  }
  assert.fail("expected AuthorizeError");
}

describe("authorize — token validation mirrors on-chain rules", () => {
  it("accepts a complete valid config", () => {
    const token = fullMonty();
    assert.equal(token.decimals, 18);
    assert.equal(token.snipeBlocks, 10n);
    assert.deepEqual(selectionsFromToken(token), [
      "burn", "mint", "pause", "maxTx", "maxWallet", "blacklist",
      "trading", "antiBot", "autoLiquidity",
    ]);
  });

  it("rejects identity violations", () => {
    expectInvalid(() => parseAuthorizeToken(baseInput({ name: "" })), "name");
    expectInvalid(() => parseAuthorizeToken(baseInput({ name: "x".repeat(65) })), "64 bytes");
    expectInvalid(() => parseAuthorizeToken(baseInput({ symbol: "abc" })), "symbol");
    expectInvalid(() => parseAuthorizeToken(baseInput({ symbol: "TOOLONG SYMBOL!" })), "symbol");
    expectInvalid(() => parseAuthorizeToken(baseInput({ decimals: 19 })), "decimals");
    expectInvalid(() => parseAuthorizeToken(baseInput({ initialSupplyBase: "0" })), "positive");
    expectInvalid(() => parseAuthorizeToken(baseInput({ owner: "nope" })), "owner");
  });

  it("rejects limit/cap violations", () => {
    expectInvalid(
      () => parseAuthorizeToken(baseInput({ maxTxAmountBase: "100", maxWalletAmountBase: "99" })),
      "maxWalletAmount"
    );
    expectInvalid(
      () => parseAuthorizeToken(baseInput({ mintable: false, maxSupplyBase: "100" })),
      "mintable"
    );
    expectInvalid(
      () => parseAuthorizeToken(baseInput({ mintable: true, maxSupplyBase: "1" })),
      "exceeds maxSupply"
    );
  });

  it("rejects tax/liquidity/launch violations", () => {
    expectInvalid(() => parseAuthorizeToken(baseInput({ buyTaxBps: 1001 })), "1000");
    expectInvalid(
      () => parseAuthorizeToken(baseInput({ buyTaxBps: 100, marketingWallet: "0x0000000000000000000000000000000000000000" })),
      "marketingWallet"
    );
    expectInvalid(
      () => parseAuthorizeToken(baseInput({
        buyTaxBps: 100, marketingWallet: MARKETING, marketingShareBps: 9000, liquidityShareBps: 0,
      })),
      "10000"
    );
    expectInvalid(
      () => parseAuthorizeToken(baseInput({ autoLiquidityEnabled: true })),
      "liquidity share"
    );
    expectInvalid(() => parseAuthorizeToken(baseInput({ snipeBlocks: 51 })), "50");
    expectInvalid(
      () => parseAuthorizeToken(baseInput({ swapThresholdBase: "abc" })),
      "swapThresholdBase"
    );
  });

  it("rejects unknown token fields (typo fail-closed)", () => {
    expectInvalid(
      () => parseAuthorizeToken({ ...baseInput(), maxTx: "100" }),
      "unexpected token field"
    );
  });

  it("parseAuthorizeRequest rejects unknown top-level fields and bad chain", () => {
    assert.throws(() => parseAuthorizeRequest({ token: baseInput(), chainId: 97, fee: "1" }), (e: unknown) => {
      assert.ok(e instanceof AuthorizeError);
      return true;
    });
    assert.throws(() => parseAuthorizeRequest({ token: baseInput(), chainId: "97" }), (e: unknown) => {
      assert.ok(e instanceof AuthorizeError && e.code === "chain-mismatch");
      return true;
    });
    const parsed = parseAuthorizeRequest({ token: baseInput(), chainId: 97 });
    assert.equal(parsed.chainId, 97);
    assert.equal(parsed.campaignCode, null);
  });

  it("client cannot smuggle fee/factory/signature/pricing into the request", () => {
    // The authorization derives every money/binding field server-side; any
    // client-supplied money/binding field is an unknown field and rejected.
    for (const smuggled of [
      { feeWei: "1" },
      { fee: "1" },
      { factory: "0x1111111111111111111111111111111111111111" },
      { signature: "0x1234" },
      { pricingVersion: "v99" },
      { configHash: "0x1234" },
      { nonce: "0x1234" },
    ]) {
      assert.throws(
        () => parseAuthorizeRequest({ token: baseInput(), chainId: 97, ...smuggled }),
        (e: unknown) => {
          assert.ok(e instanceof AuthorizeError && e.code === "invalid-config");
          return true;
        },
        JSON.stringify(smuggled)
      );
    }
  });
});

describe("authorize — package assembly", () => {
  it("builds a priced package bound to factory and chain", async () => {
    const token = fullMonty();
    const pkg = await authorizeDeployment({
      token,
      chainId: 97,
      deps: {
        snapshot: snapshot(),
        signer: stubSigner(OWNER),
        serverConfig: serverConfig(),
        nowSeconds: 1700000000,
        nonceRandomness: ("0x" + "44".repeat(32)) as Hex,
      },
    });
    // Commercial fee = dev base + nine selected add-ons.
    const expected =
      50000n + 5000n + 10000n + 5000n + 10000n + 10000n + 10000n +
      20000n + 10000n + 15000n;
    assert.equal(BigInt(pkg.feeWei), expected * 10n ** 12n);
    assert.equal(pkg.factory, FACTORY);
    assert.equal(pkg.chainId, 97);
    assert.equal(pkg.expiry, (1700000900).toString(10));
    assert.equal(pkg.signature, FIXED_SIG);
    assert.equal(pkg.signer, OWNER);
    assert.equal(pkg.pricing.pricingVersion, "dev-1");
    assert.equal(pkg.pricingVersionBytes, keccak256(stringToHex("dev-1")));
    assert.equal(pkg.selection.length, 9);
    assert.match(pkg.configHash, /^0x[a-f0-9]{64}$/);
    assert.match(pkg.nonce, /^0x[a-f0-9]{64}$/);
  });

  it("zeroFee testnet path signs feeWei zero", async () => {
    const pkg = await authorizeDeployment({
      token: parseAuthorizeToken(baseInput()),
      chainId: 97,
      deps: {
        snapshot: snapshot(),
        signer: stubSigner(OWNER),
        serverConfig: serverConfig({ zeroFee: true }),
        nowSeconds: 1700000000,
        nonceRandomness: ("0x" + "44".repeat(32)) as Hex,
      },
    });
    assert.equal(pkg.feeWei, "0");
    assert.equal(pkg.pricing.pricingVersion, "dev-1");
  });

  it("campaign discounts flow into the signed fee", async () => {
    const snap = snapshot();
    snap.campaign = {
      id: 1,
      name: "Ten",
      code: null,
      basisPoints: 1000,
      startsAt: new Date(1699990000000),
      endsAt: new Date(1800000000000),
    };
    const token = parseAuthorizeToken(baseInput({ burnable: true }));
    const pkg = await authorizeDeployment({
      token,
      chainId: 97,
      deps: {
        snapshot: snap,
        signer: stubSigner(OWNER),
        serverConfig: serverConfig(),
        nowSeconds: 1700000000,
        nonceRandomness: ("0x" + "44".repeat(32)) as Hex,
      },
    });
    // subtotal 0.055 BNB, 10% off => 0.0495 BNB.
    assert.equal(BigInt(pkg.feeWei), 49500n * 10n ** 12n);
    assert.ok(pkg.pricing.campaign !== null);
  });

  it("fails closed: chain mismatch, unoffered feature, signer mismatch", async () => {
    const token = fullMonty();
    const deps = {
      snapshot: snapshot(),
      signer: stubSigner(OWNER),
      serverConfig: serverConfig(),
      nowSeconds: 1700000000,
    };
    await assert.rejects(
      authorizeDeployment({ token, chainId: 56, deps }),
      (e: unknown) => e instanceof AuthorizeError && e.code === "chain-mismatch"
    );
    // Snapshot without trading offered.
    const legacy = {
      ...snapshot(),
      config: {
        ...snapshot().config,
        featureFees: { burn: 1n },
      },
    };
    await assert.rejects(
      authorizeDeployment({ token, chainId: 97, deps: { ...deps, snapshot: legacy } }),
      (e: unknown) => e instanceof AuthorizeError && e.code === "pricing-unavailable"
    );
    // Configured signer differs from the actual signer.
    await assert.rejects(
      authorizeDeployment({
        token,
        chainId: 97,
        deps: { ...deps, serverConfig: serverConfig({ signerAddress: MARKETING }) },
      }),
      (e: unknown) => e instanceof AuthorizeError && e.code === "signer-unavailable"
    );
  });
  it("re-quoting after expiry uses a fresh nonce", async () => {
    const token = parseAuthorizeToken(baseInput());
    const base = {
      token,
      chainId: 97,
      deps: {
        snapshot: snapshot(),
        signer: stubSigner(OWNER),
        serverConfig: serverConfig(),
      },
    };
    const first = await authorizeDeployment({
      ...base,
      deps: { ...base.deps, nowSeconds: 1700000000, nonceRandomness: ("0x" + "44".repeat(32)) as Hex },
    });
    const second = await authorizeDeployment({
      ...base,
      deps: { ...base.deps, nowSeconds: 1700001000, nonceRandomness: ("0x" + "55".repeat(32)) as Hex },
    });
    assert.notEqual(first.nonce, second.nonce);
    assert.equal(BigInt(second.expiry) - BigInt(first.expiry), 1000n);
  });

  it("prices the given snapshot as-is (freshness is the loader's job)", async () => {
    // The route loads snapshots with real `now`; authorize never re-resolves
    // windows itself. A stale snapshot therefore prices stale — this test
    // pins the trust boundary so a future change is deliberate.
    const snap = snapshot();
    snap.campaign = {
      id: 9,
      name: "Old",
      code: null,
      basisPoints: 5000,
      startsAt: new Date(1600000000000),
      endsAt: new Date(1600003600000),
    };
    const token = parseAuthorizeToken(baseInput({ burnable: true }));
    const pkg = await authorizeDeployment({
      token,
      chainId: 97,
      deps: {
        snapshot: snap,
        signer: stubSigner(OWNER),
        serverConfig: serverConfig(),
        nowSeconds: 1700000000,
        nonceRandomness: ("0x" + "44".repeat(32)) as Hex,
      },
    });
    // 50% off the 0.055 subtotal, even though the window is long past.
    assert.equal(BigInt(pkg.feeWei), 27500n * 10n ** 12n);
  });
});
