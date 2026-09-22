import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decodeFeatureBitmap,
  flagsFromSelection,
  percentToBaseUnits,
  toBaseUnits,
  toContractArgs,
  toFactoryArgs,
  TokenConfigError,
  validateTokenConfig,
  type TokenConfigInput,
} from "../config";

const OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function baseInput(overrides: Partial<TokenConfigInput> = {}): TokenConfigInput {
  return {
    name: "Test Token",
    symbol: "TST",
    decimals: "18",
    supplyHuman: "1,000,000",
    owner: OWNER,
    features: {
      burn: false,
      mint: false,
      pause: false,
      maxTx: false,
      maxWallet: false,
      blacklist: false,
      whitelist: false,
    },
    ...overrides,
  };
}

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof TokenConfigError, "expected TokenConfigError");
    assert.equal(error.code, code);
    return;
  }
  assert.fail("expected TokenConfigError");
}

describe("token config validation", () => {
  it("accepts a valid base config; supply scales by decimals", () => {
    const v = validateTokenConfig(baseInput());
    assert.equal(v.name, "Test Token");
    assert.equal(v.symbol, "TST");
    assert.equal(v.decimals, 18);
    assert.equal(v.initialSupply, 1000000n * 10n ** 18n);
    assert.equal(v.owner.toLowerCase(), OWNER.toLowerCase());
    assert.equal(v.maxTxAmount, 0n);
    assert.equal(v.maxWalletAmount, 0n);
  });

  it("handles non-18 decimals without assuming 18", () => {
    const v = validateTokenConfig(
      baseInput({ decimals: "6", supplyHuman: "1000000" })
    );
    assert.equal(v.initialSupply, 1000000n * 10n ** 6n);
    const zero = validateTokenConfig(
      baseInput({ decimals: "0", supplyHuman: "100" })
    );
    assert.equal(zero.initialSupply, 100n);
  });

  it("rejects bad name/symbol/decimals/supply/owner", () => {
    expectCode(() => validateTokenConfig(baseInput({ name: "   " })), "invalid-name");
    expectCode(() => validateTokenConfig(baseInput({ name: "x".repeat(41) })), "invalid-name");
    expectCode(() => validateTokenConfig(baseInput({ symbol: "" })), "invalid-symbol");
    expectCode(() => validateTokenConfig(baseInput({ symbol: "toolongsymbol!" })), "invalid-symbol");
    expectCode(() => validateTokenConfig(baseInput({ symbol: "A C" })), "invalid-symbol");
    expectCode(() => validateTokenConfig(baseInput({ decimals: "19" })), "invalid-decimals");
    expectCode(() => validateTokenConfig(baseInput({ decimals: "-1" })), "invalid-decimals");
    expectCode(() => validateTokenConfig(baseInput({ supplyHuman: "0" })), "invalid-supply");
    expectCode(() => validateTokenConfig(baseInput({ supplyHuman: "1" + "0".repeat(15) })), "invalid-supply");
    expectCode(() => validateTokenConfig(baseInput({ owner: "0x123" })), "invalid-owner");
    expectCode(
      () => validateTokenConfig(baseInput({ owner: "0x0000000000000000000000000000000000000000" })),
      "invalid-owner"
    );
  });

  it("normalizes symbol case like the builder (on-chain still enforces charset)", () => {
    const v = validateTokenConfig(baseInput({ symbol: "abc" }));
    assert.equal(v.symbol, "ABC");
  });

  it("does not silently truncate overlong values", () => {
    // 41-char name must fail, not truncate to 40.
    expectCode(() => validateTokenConfig(baseInput({ name: "n".repeat(41) })), "invalid-name");
    // 16-digit supply must fail, not truncate to 15.
    expectCode(() => validateTokenConfig(baseInput({ supplyHuman: "9999999999999999" })), "invalid-supply");
  });

  it("rejects names that exceed the on-chain byte limit", () => {
    // 20 emoji = 20 chars (within the 40-char UI limit) but 80 bytes > 64.
    expectCode(() => validateTokenConfig(baseInput({ name: "🚀".repeat(20) })), "invalid-name");
    const ok = validateTokenConfig(baseInput({ name: "Test Token 🚀" }));
    assert.equal(ok.name, "Test Token 🚀");
  });

  it("converts maxTx/maxWallet percents to base units", () => {
    const v = validateTokenConfig(
      baseInput({
        features: {
          burn: false, mint: false, pause: false,
          maxTx: true, maxWallet: true,
          blacklist: false, whitelist: false,
        },
        maxTxPercent: "1",
        maxWalletPercent: "2",
      })
    );
    assert.equal(v.maxTxAmount, (1000000n * 10n ** 18n) / 100n);
    assert.equal(v.maxWalletAmount, ((1000000n * 10n ** 18n) * 2n) / 100n);
  });

  it("rejects missing/out-of-range percents and wallet < tx", () => {
    const on = { burn: false, mint: false, pause: false, maxTx: true, maxWallet: false, blacklist: false, whitelist: false };
    expectCode(() => validateTokenConfig(baseInput({ features: on })), "invalid-max-tx");
    expectCode(() => validateTokenConfig(baseInput({ features: on, maxTxPercent: "0" })), "invalid-max-tx");
    expectCode(() => validateTokenConfig(baseInput({ features: on, maxTxPercent: "101" })), "invalid-max-tx");
    const both = { ...on, maxWallet: true };
    expectCode(
      () => validateTokenConfig(baseInput({ features: both, maxTxPercent: "5", maxWalletPercent: "1" })),
      "invalid-max-wallet"
    );
  });

  it("flagsFromSelection maps paid feature ids", () => {
    const flags = flagsFromSelection(["mint", "maxTx", "maxWallet"]);
    assert.equal(flags.mint, true);
    assert.equal(flags.maxTx, true);
    assert.equal(flags.maxWallet, true);
    assert.equal(flags.burn, false);
  });

  it("toFactoryArgs nests the token struct for createToken", () => {
    const v = validateTokenConfig(baseInput());
    const args = toFactoryArgs(v);
    assert.equal(args.token.name, "Test Token");
    assert.equal(args.token.initialSupply, 1000000n * 10n ** 18n);
    assert.equal(args.token.owner.toLowerCase(), OWNER.toLowerCase());
    assert.deepEqual(toContractArgs(v), args.token);
  });

  it("toBaseUnits example: 1,000,000 x 10^18", () => {
    assert.equal(toBaseUnits("1000000", 18), 1000000n * 10n ** 18n);
  });

  it("percentToBaseUnits rounds down and rejects zero results", () => {
    assert.equal(percentToBaseUnits("1", 1000000n * 10n ** 18n, "invalid-max-tx"), 10000n * 10n ** 18n);
    assert.equal(percentToBaseUnits("0.1", 1000n, "invalid-max-tx"), 1n);
    expectCode(() => percentToBaseUnits("0.1", 5n, "invalid-max-tx"), "invalid-max-tx");
  });

  it("decodeFeatureBitmap round-trips factory flags", () => {
    // burn(1) | mint(2) | maxTx(8) | blacklist(32) = 43
    const flags = decodeFeatureBitmap(43n);
    assert.deepEqual(flags, {
      burn: true, mint: true, pause: false, maxTx: true,
      maxWallet: false, blacklist: true, whitelist: false,
    });
    assert.deepEqual(decodeFeatureBitmap(0n), {
      burn: false, mint: false, pause: false, maxTx: false,
      maxWallet: false, blacklist: false, whitelist: false,
    });
  });
});
