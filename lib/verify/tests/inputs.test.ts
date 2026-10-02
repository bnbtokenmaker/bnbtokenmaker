import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeDeployData, type Abi } from "viem";

import {
  buildStandardJson,
  encodeTokenConstructorArgs,
  reconstructTokenConfig,
  TOKEN_CONFIG_FIELD_ORDER,
  tokenConstructorComponents,
  VERIFY_COMPILER_SETTINGS,
  VERIFY_COMPILERVERSION_PARAM,
  VERIFY_CONTRACT_FQN,
  VERIFY_LICENSE_TYPE_MIT,
  VERIFY_SOLC_LONG_VERSION,
  VERIFY_SWAPLIB_ADDRESSES,
  type ProvenDeploymentEvidence,
  type TokenConstructorValues,
} from "../inputs";
import { VERIFY_SOURCES } from "../sources";
import { tokenAbi } from "../../token/factory";
import {
  BSC_MAINNET_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
} from "../../deploy/chains";

/**
 * Deterministic verification-input tests. No network, no key, no chain.
 * The constructor encoding is cross-checked through an independent path
 * (viem encodeDeployData against the tracked contract ABI), so a field
 * ordering mistake fails loudly instead of shipping bad BscScan input.
 */

const OWNER = "0x1111111111111111111111111111111111111111" as `0x${string}`;
const MARKETING = "0x2222222222222222222222222222222222222222" as `0x${string}`;

function baseValues(): TokenConstructorValues {
  return {
    name: "Test Token",
    symbol: "TEST",
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
    buyTaxBps: 0n,
    sellTaxBps: 0n,
    marketingWallet: "0x0000000000000000000000000000000000000000",
    marketingShareBps: 0n,
    liquidityShareBps: 0n,
    autoLiquidityEnabled: false,
    swapThreshold: 0n,
    antiBotEnabled: false,
    snipeBlocks: 0n,
    maxSupply: 0n,
  };
}

function fullValues(): TokenConstructorValues {
  return {
    name: "Full Feature Token",
    symbol: "FULL",
    decimals: 9,
    initialSupply: 5000000n * 10n ** 9n,
    owner: OWNER,
    burnable: true,
    mintable: true,
    pausable: true,
    maxTxAmount: 50000n * 10n ** 9n,
    maxWalletAmount: 100000n * 10n ** 9n,
    blacklistEnabled: true,
    whitelistEnabled: true,
    buyTaxBps: 400n,
    sellTaxBps: 600n,
    marketingWallet: MARKETING,
    marketingShareBps: 7000n,
    liquidityShareBps: 3000n,
    autoLiquidityEnabled: true,
    swapThreshold: 5000n * 10n ** 9n,
    antiBotEnabled: true,
    snipeBlocks: 5n,
    maxSupply: 10000000n * 10n ** 9n,
  };
}

function independentEncoding(values: TokenConstructorValues): string {
  const tuple = [
    values.name,
    values.symbol,
    values.decimals,
    values.initialSupply,
    values.owner,
    values.burnable,
    values.mintable,
    values.pausable,
    values.maxTxAmount,
    values.maxWalletAmount,
    values.blacklistEnabled,
    values.whitelistEnabled,
    values.buyTaxBps,
    values.sellTaxBps,
    values.marketingWallet,
    values.marketingShareBps,
    values.liquidityShareBps,
    values.autoLiquidityEnabled,
    values.swapThreshold,
    values.antiBotEnabled,
    values.snipeBlocks,
    values.maxSupply,
  ];
  const deployed = encodeDeployData({
    abi: tokenAbi as unknown as Abi,
    args: [tuple],
    bytecode: "0x",
  });
  return deployed.startsWith("0x") ? deployed.slice(2) : deployed;
}

describe("verification frozen constants", () => {
  it("targets the token contract exactly", () => {
    assert.equal(VERIFY_CONTRACT_FQN, "contracts/BNBTokenMakerToken.sol:BNBTokenMakerToken");
  });

  it("pins the exact solc build", () => {
    assert.equal(VERIFY_SOLC_LONG_VERSION, "0.8.28+commit.7893614a");
    assert.equal(VERIFY_COMPILERVERSION_PARAM, "v0.8.28+commit.7893614a");
  });

  it("pins MIT license code", () => {
    assert.equal(VERIFY_LICENSE_TYPE_MIT, 3);
  });

  it("reproduces the frozen compiler settings", () => {
    assert.deepEqual(VERIFY_COMPILER_SETTINGS, {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
      metadata: { bytecodeHash: "ipfs" },
      viaIR: false,
    });
  });

  it("maps the exact chain-specific SwapLib addresses", () => {
    assert.equal(
      VERIFY_SWAPLIB_ADDRESSES[BSC_MAINNET_CHAIN_ID],
      "0xe3a51665ae1b7897f1ed05c3dc79f82f3df07f2a"
    );
    assert.equal(
      VERIFY_SWAPLIB_ADDRESSES[BSC_TESTNET_CHAIN_ID],
      "0xf82c8783898f3c0f03ece27d412c94ad502f459f"
    );
  });
});

describe("token constructor field order", () => {
  it("matches the tracked contract ABI constructor exactly", () => {
    const abiOrder = tokenConstructorComponents().map((c) => c.name);
    assert.deepEqual(abiOrder, [...TOKEN_CONFIG_FIELD_ORDER]);
  });

  it("has exactly the 22 frozen TokenConfig fields in order", () => {
    assert.deepEqual([...TOKEN_CONFIG_FIELD_ORDER], [
      "name", "symbol", "decimals", "initialSupply", "owner",
      "burnable", "mintable", "pausable", "maxTxAmount", "maxWalletAmount",
      "blacklistEnabled", "whitelistEnabled", "buyTaxBps", "sellTaxBps",
      "marketingWallet", "marketingShareBps", "liquidityShareBps",
      "autoLiquidityEnabled", "swapThreshold", "antiBotEnabled",
      "snipeBlocks", "maxSupply",
    ]);
  });
});

describe("constructor argument encoding", () => {
  it("encodes a base token as raw hex without 0x", () => {
    const hex = encodeTokenConstructorArgs(baseValues());
    assert.ok(!hex.startsWith("0x"));
    assert.ok(/^[0-9a-f]+$/.test(hex));
    assert.equal(hex.length % 64, 0);
  });

  it("matches the independent ABI encoding path for a base token", () => {
    assert.equal(encodeTokenConstructorArgs(baseValues()), independentEncoding(baseValues()));
  });

  it("matches the independent ABI encoding path for a full-feature token", () => {
    assert.equal(encodeTokenConstructorArgs(fullValues()), independentEncoding(fullValues()));
  });

  it("is deterministic and distinguishes feature selections", () => {
    assert.equal(encodeTokenConstructorArgs(fullValues()), encodeTokenConstructorArgs(fullValues()));
    assert.notEqual(encodeTokenConstructorArgs(baseValues()), encodeTokenConstructorArgs(fullValues()));
  });

  it("rejects malformed addresses fail-closed", () => {
    assert.throws(() =>
      encodeTokenConstructorArgs({ ...baseValues(), owner: "0x123" as `0x${string}` })
    );
    assert.throws(() =>
      encodeTokenConstructorArgs({ ...baseValues(), marketingWallet: "nope" as `0x${string}` })
    );
  });
});

describe("constructor reconstruction from evidence", () => {
  function evidence(values: TokenConstructorValues): ProvenDeploymentEvidence {
    return {
      event: {
        name: values.name,
        symbol: values.symbol,
        decimals: values.decimals,
        initialSupply: values.initialSupply,
      },
      owner: values.owner,
      scalars: {
        burnable: values.burnable,
        mintable: values.mintable,
        pausable: values.pausable,
        maxTxAmount: values.maxTxAmount,
        maxWalletAmount: values.maxWalletAmount,
        blacklistEnabled: values.blacklistEnabled,
        whitelistEnabled: values.whitelistEnabled,
        buyTaxBps: values.buyTaxBps,
        sellTaxBps: values.sellTaxBps,
        marketingWallet: values.marketingWallet,
        marketingShareBps: values.marketingShareBps,
        liquidityShareBps: values.liquidityShareBps,
        autoLiquidityEnabled: values.autoLiquidityEnabled,
        swapThreshold: values.swapThreshold,
        antiBotEnabled: values.antiBotEnabled,
        snipeBlocks: values.snipeBlocks,
        maxSupply: values.maxSupply,
      },
    };
  }

  it("round-trips a full-feature deployment through evidence", () => {
    const rebuilt = reconstructTokenConfig(evidence(fullValues()));
    assert.deepEqual(rebuilt, fullValues());
    assert.equal(
      encodeTokenConstructorArgs(rebuilt),
      independentEncoding(fullValues())
    );
  });

  it("round-trips zero/unlimited values", () => {
    const rebuilt = reconstructTokenConfig(evidence(baseValues()));
    assert.deepEqual(rebuilt, baseValues());
  });

  it("rejects malformed evidence fail-closed", () => {
    assert.throws(() => reconstructTokenConfig(evidence({ ...fullValues(), name: "" })));
    assert.throws(() =>
      reconstructTokenConfig({ ...evidence(fullValues()), owner: "0x123" as `0x${string}` })
    );
  });
});

describe("standard JSON builder", () => {
  it("embeds the exact frozen sources for mainnet", () => {
    const parsed = JSON.parse(buildStandardJson(BSC_MAINNET_CHAIN_ID));
    assert.equal(parsed.language, "Solidity");
    assert.deepEqual(Object.keys(parsed.sources).sort(), Object.keys(VERIFY_SOURCES).sort());
    assert.equal(
      parsed.sources["contracts/BNBTokenMakerToken.sol"].content,
      VERIFY_SOURCES["contracts/BNBTokenMakerToken.sol"]
    );
  });

  it("embeds frozen settings and the chain-specific library", () => {
    const mainnet = JSON.parse(buildStandardJson(BSC_MAINNET_CHAIN_ID));
    assert.equal(mainnet.settings.optimizer.enabled, true);
    assert.equal(mainnet.settings.optimizer.runs, 200);
    assert.equal(mainnet.settings.evmVersion, "paris");
    assert.equal(mainnet.settings.metadata.bytecodeHash, "ipfs");
    assert.equal(mainnet.settings.viaIR, false);
    assert.deepEqual(mainnet.settings.libraries, {
      "contracts/SwapLib.sol": { SwapLib: "0xe3a51665ae1b7897f1ed05c3dc79f82f3df07f2a" },
    });
    const testnet = JSON.parse(buildStandardJson(BSC_TESTNET_CHAIN_ID));
    assert.deepEqual(testnet.settings.libraries, {
      "contracts/SwapLib.sol": { SwapLib: "0xf82c8783898f3c0f03ece27d412c94ad502f459f" },
    });
  });

  it("fails closed for unsupported chains", () => {
    assert.throws(() => buildStandardJson(1));
    assert.throws(() => buildStandardJson(137));
  });
});
