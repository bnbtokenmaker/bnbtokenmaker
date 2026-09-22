import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeFunctionData, encodeAbiParameters, keccak256, pad, stringToHex } from "viem";

import { factoryAbi } from "../../token/factory";
import { validateTokenConfig } from "../../token/config";
import {
  explorerTokenPageUrl,
  explorerTxUrl,
  findDeployedTokenAddress,
  isReceiptSuccess,
  prepareDeploymentTx,
  shortenTxHash,
  DEPLOY_CHAIN_ID,
} from "../tx";
import { DeployFlowError } from "../errors";

const OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const TOKEN = "0x1111111111111111111111111111111111111111";
const HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

function validConfig() {
  return validateTokenConfig({
    name: "Test Token",
    symbol: "TST",
    decimals: "18",
    supplyHuman: "1,000,000",
    owner: OWNER,
    features: {
      burn: true,
      mint: false,
      pause: false,
      maxTx: true,
      maxWallet: false,
      blacklist: false,
      whitelist: false,
    },
    maxTxPercent: "1",
  });
}

describe("deployment tx boundary", () => {
  it("pins the testnet chain id", () => {
    assert.equal(DEPLOY_CHAIN_ID, 97);
  });

  it("refuses to build a transaction for mainnet (56) or any other chain", () => {
    for (const chain of [56, 1, 8453, 137, 10, 42161]) {
      try {
        prepareDeploymentTx(chain, validConfig());
      } catch (error) {
        assert.ok(error instanceof DeployFlowError);
        assert.equal(error.code, "mainnet-disabled");
        continue;
      }
      assert.fail(`expected refusal for chain ${chain}`);
    }
  });

  it("encodes createToken calldata for chain 97 with zero value", () => {
    // Factory address comes from NEXT_PUBLIC_TESTNET_FACTORY_ADDRESS; the CI
    // env may or may not define it — either path must be safe.
    const configured = (process.env.NEXT_PUBLIC_TESTNET_FACTORY_ADDRESS ?? "").trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(configured)) {
      try {
        prepareDeploymentTx(97, validConfig());
      } catch (error) {
        assert.ok(error instanceof DeployFlowError);
        assert.equal(error.code, "factory-unavailable");
        return;
      }
      assert.fail("expected factory-unavailable without a configured factory");
    }
    const prepared = prepareDeploymentTx(97, validConfig());
    assert.equal(prepared.chainId, 97);
    assert.equal(prepared.value, "0x0");
    assert.match(prepared.factory, /^0x[a-fA-F0-9]{40}$/);
    const decoded = decodeFunctionData({
      abi: factoryAbi as never,
      data: prepared.data,
    });
    assert.equal(decoded.functionName, "createToken");
  });

  it("accepts success receipts and rejects reverts", () => {
    assert.ok(isReceiptSuccess("success"));
    assert.ok(isReceiptSuccess("0x1"));
    assert.ok(!isReceiptSuccess("reverted"));
    assert.ok(!isReceiptSuccess("0x0"));
    assert.ok(!isReceiptSuccess(undefined));
  });

  it("finds the token address in receipt logs, null when absent", () => {
    const topic0 = keccak256(
      stringToHex(
        "TokenCreated(address,address,address,string,string,uint8,uint256,uint256)"
      )
    );
    const data = encodeAbiParameters(
      [
        { type: "string" },
        { type: "string" },
        { type: "uint8" },
        { type: "uint256" },
        { type: "uint256" },
      ],
      ["Test Token", "TST", 18, 1000000n * 10n ** 18n, 43n]
    );
    const found = findDeployedTokenAddress([
      {
        topics: [topic0, pad(TOKEN), pad(OWNER), pad(OWNER)],
        data,
      },
    ]);
    assert.equal(found?.toLowerCase(), TOKEN.toLowerCase());
    assert.equal(findDeployedTokenAddress([]), null);
    assert.equal(findDeployedTokenAddress(null), null);
    assert.equal(
      findDeployedTokenAddress([
        {
          topics: ["0x1234567890123456789012345678901234567890123456789012345678901234"],
          data: "0x",
        },
      ]),
      null
    );
  });

  it("builds testnet explorer links and shortens hashes", () => {
    assert.equal(explorerTxUrl(HASH), `https://testnet.bscscan.com/tx/${HASH}`);
    assert.equal(explorerTokenPageUrl(TOKEN), `https://testnet.bscscan.com/token/${TOKEN}`);
    assert.equal(explorerTxUrl("0x123"), null);
    assert.equal(shortenTxHash(HASH), `${HASH.slice(0, 6)}\u2026${HASH.slice(-4)}`);
    assert.equal(shortenTxHash("nope"), "");
  });
});
