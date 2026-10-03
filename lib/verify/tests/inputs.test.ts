import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeFunctionData, encodeDeployData, type Abi } from "viem";

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
import { factoryAbi, tokenAbi } from "../../token/factory";
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

describe("FULL TEST production regression fixture", () => {
  // Real mainnet deployment calldata (chain 56, factory createToken).
  // Token 0x817683366DfAF428a4972bcF314731F9728Dbb66 ("FULL TEST" / "FULL"),
  // tx 0x77be8621ea0343690ace86073adfd992293a21b1b760af6eb2ce7e95e3a200f3.
  // Public on-chain data only: no keys, no signatures asserted here.
  const REAL_TX_INPUT = "0x7d64e37100000000000000000000000000000000000000000000000000000000000001206a6c7ca1fd0781f87bf4819cc77c58f9a3e6639833c5927d721db8481b267b610000000000000000000000000000000000000000000000000006c00a3912c0000000000000000000000000000000000000000000000000000000000000000038000000000000000000000000d7de07de5113efa6cf0c213914ed7f0df60b682c9d20830f62a241fab5218c28266d75a285affe0e27f2becd93d8939cd324ebdd000000000000000000000000000000000000000000000000000000006ac0102bed5686e73010fba4ecb2c09433bc9a39b60dff1b1e198e90ad1a32aff650fa7c0000000000000000000000000000000000000000000000000000000000000480000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000002c0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000000090000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000008d3218a2cd42388ca627a9432e8b14f65d1c999000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000470de4df82000000000000000000000000000000000000000000000000000000b1a2bc2ec5000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000019000000000000000000000000000000000000000000000000000000000000002580000000000000000000000008d3218a2cd42388ca627a9432e8b14f65d1c99900000000000000000000000000000000000000000000000000000000000001b580000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000038d7ea4c68000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000001bc16d674ec80000000000000000000000000000000000000000000000000000000000000000000946554c4c20544553540000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000446554c4c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041de325f369e486e11f4512b8c11e4737d58f8cb00e4174233a78232c92bf4133f49d5739e6756f9b9b1c790be4f30d924fd9846fbd9ee634348d5b048e9851aa31b00000000000000000000000000000000000000000000000000000000000000";

  const EXPECTED = {
    name: "FULL TEST",
    symbol: "FULL",
    decimals: 9,
    initialSupply: 1000000000000000000n,
    owner: "0x8d3218A2cD42388CA627a9432e8b14F65d1c9990",
    burnable: true,
    mintable: true,
    pausable: true,
    maxTxAmount: 20000000000000000n,
    maxWalletAmount: 50000000000000000n,
    blacklistEnabled: true,
    whitelistEnabled: false,
    buyTaxBps: 400n,
    sellTaxBps: 600n,
    marketingWallet: "0x8d3218A2cD42388CA627a9432e8b14F65d1c9990",
    marketingShareBps: 7000n,
    liquidityShareBps: 3000n,
    autoLiquidityEnabled: true,
    swapThreshold: 1000000000000000n,
    antiBotEnabled: true,
    snipeBlocks: 5n,
    maxSupply: 2000000000000000000n,
  };

  it("decodes the real production tuple through the tracked factory ABI", () => {
    const decoded = decodeFunctionData({
      abi: factoryAbi as never,
      data: REAL_TX_INPUT as `0x${string}`,
    }) as unknown as { functionName: string; args: [{ token: Record<string, unknown> }] };
    assert.equal(decoded.functionName, "createToken");
    const token = decoded.args[0].token;
    for (const [key, value] of Object.entries(EXPECTED)) {
      const actual = token[key];
      assert.equal(
        typeof actual === "bigint" ? actual : String(actual),
        typeof value === "bigint" ? value : String(value),
        key
      );
    }
  });

  it("encodes byte-exact constructor args matching the real calldata", () => {
    const values = {
      ...EXPECTED,
      owner: EXPECTED.owner as `0x${string}`,
      marketingWallet: EXPECTED.marketingWallet as `0x${string}`,
    };
    const hex = encodeTokenConstructorArgs(values);
    assert.ok(
      REAL_TX_INPUT.slice(2).includes(hex),
      "encoder output must appear verbatim in production calldata"
    );
  });
});
