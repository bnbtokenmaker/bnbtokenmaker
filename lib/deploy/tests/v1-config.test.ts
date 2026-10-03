import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  authorizationFingerprint,
  bpsToPercentString,
  isGasEstimateReady,
  isPackageOwnerMatch,
  isPackageUsable,
  packageToCalldata,
  parseDeploymentPackage,
  parseHumanToBaseUnits,
  percentStringToBps,
  percentToBaseUnits,
  validateV1Form,
  V1_FORM_DEFAULTS,
  type V1FormState,
} from "../v1-config";

function form(overrides: Partial<V1FormState> = {}): V1FormState {
  return {
    ...V1_FORM_DEFAULTS,
    name: "Test Token",
    symbol: "TST",
    decimals: "18",
    supplyHuman: "1,000,000",
    ...overrides,
  };
}

const OWNER = "0x2222222222222222222222222222222222222222" as `0x${string}`;

describe("v1-config — human to base-unit conversion (bigint-safe)", () => {
  it("converts comma/decimal human amounts exactly", () => {
    assert.equal(parseHumanToBaseUnits("1,000,000", 18), 1000000n * 10n ** 18n);
    assert.equal(parseHumanToBaseUnits("1.5", 18), 1500000000000000000n);
    assert.equal(parseHumanToBaseUnits("100", 6), 100000000n);
    assert.equal(parseHumanToBaseUnits("0.000001", 6), 1n);
  });

  it("fails closed on malformed or over-precise input (never rounds)", () => {
    assert.equal(parseHumanToBaseUnits("", 18), null);
    assert.equal(parseHumanToBaseUnits("abc", 18), null);
    assert.equal(parseHumanToBaseUnits("-5", 18), null);
    assert.equal(parseHumanToBaseUnits("0.0000001", 6), null);
    assert.equal(parseHumanToBaseUnits("1", 19), null);
  });

  it("converts percents of supply exactly", () => {
    const supply = 1000000n * 10n ** 18n;
    assert.equal(percentToBaseUnits("1", supply), 10000n * 10n ** 18n);
    assert.equal(percentToBaseUnits("2.5", supply), 25000n * 10n ** 18n);
    assert.equal(percentToBaseUnits("0.0001", supply), 1n * 10n ** 18n);
    assert.equal(percentToBaseUnits("0", supply), null);
    assert.equal(percentToBaseUnits("100.0001", supply), null);
    assert.equal(percentToBaseUnits("abc", supply), null);
  });
});

describe("v1-config — form validation mirrors frozen rules", () => {
  it("accepts a minimal valid form", () => {
    const result = validateV1Form(form(), OWNER);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.input.initialSupplyBase, (1000000n * 10n ** 18n).toString(10));
      assert.equal(result.input.maxSupplyBase, "0");
      assert.equal(result.input.marketingShareBps, 0);
    }
  });

  it("rejects invalid name/symbol/decimals/supply", () => {
    for (const [patch, field] of [
      [{ name: "" }, "name"],
      [{ symbol: "A B" }, "symbol"],
      [{ symbol: "TOOLONG SYMBOL!" }, "symbol"],
      [{ decimals: "19" }, "decimals"],
      [{ supplyHuman: "0" }, "supplyHuman"],
    ] as Array<[Partial<V1FormState>, string]>) {
      const result = validateV1Form(form(patch), OWNER);
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.ok(result.errors.some((e) => e.field === field), field);
      }
    }
  });

  it("enforces initial <= maxSupply and unlimited opt-in", () => {
    const bad = validateV1Form(
      form({ mintable: true, mintMode: "capped", maxSupplyHuman: "1" }),
      OWNER
    );
    assert.equal(bad.ok, false);
    const unlimited = validateV1Form(
      form({ mintable: true, mintMode: "unlimited" }),
      OWNER
    );
    assert.equal(unlimited.ok, true);
    if (unlimited.ok) assert.equal(unlimited.input.maxSupplyBase, "0");
    const capped = validateV1Form(
      form({ mintable: true, mintMode: "capped", maxSupplyHuman: "2,000,000" }),
      OWNER
    );
    assert.equal(capped.ok, true);
    if (capped.ok) {
      assert.equal(capped.input.maxSupplyBase, (2000000n * 10n ** 18n).toString(10));
    }
  });

  it("blacklist+whitelist coexist in form state (server/pricing decide)", () => {
    // Mutual exclusivity is a product/pricing rule enforced at toggle time
    // and by the authorize path — the pure validator stays neutral.
    const result = validateV1Form(form({ blacklist: true, whitelist: true }), OWNER);
    assert.equal(result.ok, true);
  });

  it("rejects tax above 10% and missing marketing wallet", () => {
    const over = validateV1Form(
      form({ trading: true, buyTaxBps: "1001", marketingWallet: OWNER }),
      OWNER
    );
    assert.equal(over.ok, false);
    const noWallet = validateV1Form(form({ trading: true, buyTaxBps: "100" }), OWNER);
    assert.equal(noWallet.ok, false);
    const ok = validateV1Form(
      form({ trading: true, buyTaxBps: "400", sellTaxBps: "600", marketingWallet: OWNER }),
      OWNER
    );
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.input.marketingShareBps, 10000);
      assert.equal(ok.input.liquidityShareBps, 0);
    }
  });

  it("rejects out-of-range antiBot/autoLiquidity config", () => {
    assert.equal(validateV1Form(form({ antiBot: true, snipeBlocks: "51" }), OWNER).ok, false);
    assert.equal(
      validateV1Form(form({ autoLiquidity: true, buyTaxBps: "0", sellTaxBps: "0" }), OWNER).ok,
      false
    );
    const ok = validateV1Form(
      form({
        trading: true, buyTaxBps: "400", sellTaxBps: "0", marketingWallet: OWNER,
        autoLiquidity: true,
      }),
      OWNER
    );
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.input.marketingShareBps, 7000);
      assert.equal(ok.input.liquidityShareBps, 3000);
      // Threshold auto-derived: supply / 1000.
      assert.equal(ok.input.swapThresholdBase, ((1000000n * 10n ** 18n) / 1000n).toString(10));
    }
  });
});

describe("v1-config — package calldata and lifecycle", () => {
  function pkg() {
    return {
      token: {
        name: "T",
        symbol: "T",
        decimals: 18,
        initialSupplyBase: "100",
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
      },
      quote: {
        configHash: ("0x" + "11".repeat(32)) as `0x${string}`,
        feeWei: 50000n,
        chainId: 97n,
        factory: OWNER,
        nonce: ("0x" + "22".repeat(32)) as `0x${string}`,
        expiry: 1700000900n,
        pricingVersion: ("0x" + "33".repeat(32)) as `0x${string}`,
      },
      signature: ("0x" + "44".repeat(65)) as `0x${string}`,
    };
  }

  it("builds exact calldata + value from a package (never mutates)", () => {
    const { data, valueHex } = packageToCalldata(pkg());
    assert.ok(data.startsWith("0x"));
    assert.ok(data.length > 100);
    assert.equal(valueHex, `0x${(50000n).toString(16)}`);
  });

  it("rejects malformed packages fail-closed", () => {
    const bad = pkg();
    (bad.token as Record<string, unknown>).owner = "nope";
    assert.throws(() => packageToCalldata(bad), /owner/);
    const badSig = pkg();
    (badSig as Record<string, unknown>).signature = "0x1234";
    assert.throws(() => packageToCalldata(badSig), /signature/);
  });

  it("fingerprints invalidate on any deployment-affecting change", () => {
    const token = {
      ...pkg().token,
      initialSupplyBase: "100",
    };
    const a = authorizationFingerprint({ token: token as never, chainId: 97, account: OWNER });
    const b = authorizationFingerprint({
      token: { ...token, initialSupplyBase: "101" } as never,
      chainId: 97,
      account: OWNER,
    });
    assert.notEqual(a, b);
    const c = authorizationFingerprint({ token: token as never, chainId: 97, account: null });
    assert.notEqual(a, c);
    assert.equal(a, authorizationFingerprint({ token: token as never, chainId: 97, account: OWNER }));
  });

  it("expiry usability respects skew", () => {
    assert.equal(isPackageUsable({ expiry: "1700000900" }, 1700000000), true);
    assert.equal(isPackageUsable({ expiry: "1700000900" }, 1700000850), false);
    assert.equal(isPackageUsable(null, 1700000000), false);
    assert.equal(isPackageUsable({ expiry: "nope" }, 1700000000), false);
  });
});

describe("v1-config — authorize package parsing (client fail-closed)", () => {
  function response() {
    return {
      token: {
        name: "T",
        symbol: "T",
        decimals: 18,
        initialSupplyBase: "100",
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
      },
      selection: [],
      pricing: {
        pricingVersion: "dev-1",
        baseFeeWei: "50000",
        lineItems: [],
        subtotalWei: "50000",
        discountWei: "0",
        totalWei: "50000",
        campaign: null,
      },
      configHash: "0x" + "11".repeat(32),
      feeWei: "50000",
      nonce: "0x" + "22".repeat(32),
      expiry: "1700000900",
      signature: "0x" + "44".repeat(65),
      factory: OWNER,
      chainId: 97,
      pricingVersionBytes: "0x" + "33".repeat(32),
      signer: OWNER,
      quote: {
        configHash: "0x" + "11".repeat(32),
        feeWei: "50000",
        chainId: "97",
        factory: OWNER,
        nonce: "0x" + "22".repeat(32),
        expiry: "1700000900",
        pricingVersion: "0x" + "33".repeat(32),
      },
    };
  }

  it("parses a well-formed package and normalizes bigints", () => {
    const pkg = parseDeploymentPackage(response());
    assert.equal(pkg.feeWei, 50000n);
    assert.equal(pkg.expiry, 1700000900n);
    assert.equal(pkg.chainId, 97);
    assert.equal(pkg.pricing.totalWei, "50000");
    const { data, valueHex } = packageToCalldata({
      token: pkg.token,
      quote: pkg.quote,
      signature: pkg.signature,
    });
    assert.ok(data.startsWith("0x"));
    assert.equal(valueHex, `0x${(50000n).toString(16)}`);
  });

  it("rejects malformed and cross-mismatched packages", () => {
    assert.throws(() => parseDeploymentPackage(null), /object/);
    assert.throws(() => parseDeploymentPackage({ ...response(), signature: "0x1234" }), /signature/);
    assert.throws(
      () => parseDeploymentPackage({ ...response(), feeWei: "50001" }),
      /feeWei mismatch/
    );
    assert.throws(
      () => parseDeploymentPackage({ ...response(), chainId: 56 }),
      /chainId mismatch/
    );
    const badQuote = response();
    (badQuote.quote as Record<string, unknown>).nonce = "0x" + "55".repeat(32);
    assert.throws(() => parseDeploymentPackage(badQuote), /nonce mismatch/);
  });
});

describe("v1-config — B5 owner binding (checksummed wallet vs package)", () => {
  // Wagmi returns EIP-55 checksummed mixed-case addresses; the server echoes
  // the owner verbatim into the package. The comparison must be
  // case-insensitive or EVERY browser authorization fails (B5 incident).
  const CHECKSUMMED = "0x8d906573844a63A90eae531D54B76327261293e8";
  const LOWER = CHECKSUMMED.toLowerCase();

  it("matches a checksummed package owner against the connected wallet", () => {
    assert.equal(isPackageOwnerMatch(CHECKSUMMED, CHECKSUMMED), true);
    assert.equal(isPackageOwnerMatch(CHECKSUMMED, LOWER), true);
    assert.equal(isPackageOwnerMatch(LOWER, CHECKSUMMED), true);
  });

  it("still fails closed on genuine mismatch or malformed owners", () => {
    assert.equal(
      isPackageOwnerMatch(CHECKSUMMED, "0x0000000000000000000000000000000000000001"),
      false
    );
    assert.equal(isPackageOwnerMatch(undefined, CHECKSUMMED), false);
    assert.equal(isPackageOwnerMatch(123, CHECKSUMMED), false);
    assert.equal(isPackageOwnerMatch(CHECKSUMMED, ""), false);
  });

  it("BASIC UI-equivalent: validated form owner survives parse + binding + zero-value calldata", () => {
    const validated = validateV1Form(
      form({ name: "B5 Basic Probe", symbol: "B5BASIC", supplyHuman: "1000000" }),
      CHECKSUMMED
    );
    assert.equal(validated.ok, true);
    if (!validated.ok) return;
    assert.equal(validated.input.owner, CHECKSUMMED);
    // Server echoes owner verbatim; strict parse keeps it; binding must hold.
    assert.equal(isPackageOwnerMatch(validated.input.owner, LOWER), true);
    const parsed = parseDeploymentPackage({
      token: { ...validated.input, decimals: validated.input.decimals },
      selection: [],
      pricing: {
        pricingVersion: "v1",
        totalWei: "50000000000000000",
        discountWei: "0",
        campaign: null,
      },
      configHash: "0x" + "11".repeat(32),
      feeWei: "0",
      nonce: "0x" + "22".repeat(32),
      expiry: "1790509358",
      signature: "0x" + "44".repeat(65),
      factory: "0xb0fade4dae1b17b156d21dfe053ee69e0478b80d",
      chainId: 97,
      signer: "0x86b9d52cdeb3d5b80408f9123005b3462d54e8f3",
      quote: {
        configHash: "0x" + "11".repeat(32),
        feeWei: "0",
        chainId: "97",
        factory: "0xb0fade4dae1b17b156d21dfe053ee69e0478b80d",
        nonce: "0x" + "22".repeat(32),
        expiry: "1790509358",
        pricingVersion: "0x" + "33".repeat(32),
      },
    });
    assert.equal(isPackageOwnerMatch(parsed.token.owner, CHECKSUMMED), true);
    const { valueHex } = packageToCalldata({
      token: parsed.token,
      quote: parsed.quote,
      signature: parsed.signature,
    });
    assert.equal(valueHex, "0x0");
  });
});

describe("v1-config — gas estimate readiness (no false failure pre-authorization)", () => {
  function ready(overrides = {}) {
    return isGasEstimateReady({
      onTestnet: true,
      address: "0x8d906573844a63A90eae531D54B76327261293e8",
      hasQuote: true,
      reviewValid: true,
      hasPackage: true,
      ...overrides,
    });
  }

  it("is idle (not failed) before authorization is requested", () => {
    assert.equal(ready({ hasPackage: false }), false);
  });

  it("runs only when every precondition holds", () => {
    assert.equal(ready(), true);
    assert.equal(ready({ onTestnet: false }), false);
    assert.equal(ready({ address: null }), false);
    assert.equal(ready({ hasQuote: false }), false);
    assert.equal(ready({ reviewValid: false }), false);
  });
});

describe("tax percentage helpers", () => {
  it("converts accepted percentages to integer bps without floats", async () => {
    assert.equal(percentStringToBps("4"), 400);
    assert.equal(percentStringToBps("6"), 600);
    assert.equal(percentStringToBps("0.5"), 50);
    assert.equal(percentStringToBps("1.25"), 125);
    assert.equal(percentStringToBps("0.01"), 1);
    assert.equal(percentStringToBps("10"), 1000);
    assert.equal(percentStringToBps("0"), 0);
    assert.equal(percentStringToBps("10.00"), 1000);
    assert.equal(bpsToPercentString(400), "4");
    assert.equal(bpsToPercentString("600"), "6");
    assert.equal(bpsToPercentString(50), "0.5");
    assert.equal(bpsToPercentString(125), "1.25");
    assert.equal(bpsToPercentString(1), "0.01");
    assert.equal(bpsToPercentString(1000), "10");
    assert.equal(bpsToPercentString(0), "0");
  });

  it("rejects unrepresentable and out-of-range percentages without rounding", async () => {
    for (const bad of ["-1", "10.01", "0.005", "1.234", "abc", "NaN", "Infinity", "", "  ", "4.", ".5", "100"]) {
      assert.equal(percentStringToBps(bad), null, bad);
    }
  });

  it("keeps the authorize payload in integer BPS", () => {
    const v = validateV1Form(
      form({ trading: true, buyTaxBps: "400", sellTaxBps: "600", marketingWallet: OWNER }),
      OWNER
    );
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.input.buyTaxBps, 400);
      assert.equal(v.input.sellTaxBps, 600);
      assert.ok(Number.isInteger(v.input.buyTaxBps));
      assert.ok(Number.isInteger(v.input.sellTaxBps));
    }
  });
});
