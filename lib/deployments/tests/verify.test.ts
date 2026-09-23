import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeAbiParameters, keccak256, pad, stringToHex } from "viem";

import { parseRecordHint } from "../validate";
import {
  VerificationError,
  verifyDeployment,
  type ChainReader,
  type ChainReceipt,
  type ChainTransaction,
} from "../verify";

const FACTORY = "0x5357b13c30967197cf38b5ffae2088417c562187";
const OTHER = "0x9999999999999999999999999999999999999999" as `0x${string}`;
const TOKEN = "0x1111111111111111111111111111111111111111" as `0x${string}`;
const DEPLOYER = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" as `0x${string}`;
const TX =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;
const SUPPLY = 1_000_000n * 10n ** 18n;

function tokenCreatedLog(token: `0x${string}`, factory: string) {
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
    ["Test Token", "TST", 18, SUPPLY, 43n]
  );
  return {
    address: factory,
    topics: [topic0, pad(token), pad(DEPLOYER), pad(DEPLOYER)] as [
      `0x${string}`,
      ...`0x${string}`[],
    ],
    data,
  };
}

function reader(overrides: {
  tx?: ChainTransaction | null | Error;
  receipt?: ChainReceipt | null | undefined | Error;
}): ChainReader {
  return {
    async getTransaction() {
      if (overrides.tx instanceof Error) throw overrides.tx;
      return overrides.tx ?? null;
    },
    async getTransactionReceipt() {
      if (overrides.receipt instanceof Error) throw overrides.receipt;
      return overrides.receipt;
    },
  };
}

const TX_OK: ChainTransaction = {
  hash: TX,
  from: DEPLOYER,
  to: FACTORY,
  value: 0n,
};

const RECEIPT_OK: ChainReceipt = {
  status: "success",
  blockNumber: 12345678n,
  logs: [tokenCreatedLog(TOKEN, FACTORY)],
};

const QUOTE = () => ({ pricingVersion: "dev-1", totalWei: "0" });

async function verifyWith(overrides: Parameters<typeof reader>[0]) {
  return verifyDeployment({
    hint: parseRecordHint({ chainId: 97, txHash: TX }),
    chain: reader(overrides),
    expectedFactory: FACTORY as `0x${string}`,
    quoteForFeatures: QUOTE,
  });
}

async function rejectsWith(
  promise: Promise<unknown>,
  code: string
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof VerificationError);
    assert.equal(error.code, code);
    return;
  }
  assert.fail(`expected VerificationError(${code})`);
}

describe("deployments — server-side receipt/event verification", () => {
  it("accepts a valid chain-97 receipt + expected-factory TokenCreated event", async () => {
    const record = await verifyWith({ tx: TX_OK, receipt: RECEIPT_OK });
    // Every fact is receipt-derived: contract from the event (never client
    // input), deployer from tx.from, supply as an exact integer string.
    assert.equal(record.chainId, 97);
    assert.equal(record.txHash, TX.toLowerCase());
    assert.equal(record.contractAddress, TOKEN.toLowerCase());
    assert.equal(record.factoryAddress, FACTORY);
    assert.equal(record.deployerAddress, DEPLOYER.toLowerCase());
    assert.equal(record.tokenName, "Test Token");
    assert.equal(record.tokenSymbol, "TST");
    assert.equal(record.decimals, 18);
    assert.equal(record.initialSupplyBase, SUPPLY.toString(10));
    assert.equal(BigInt(record.initialSupplyBase), SUPPLY);
    assert.equal(record.platformFeeWei, "0");
    assert.equal(record.blockNumber, 12345678);
  });

  it("a client-supplied fake contract address cannot override the event", async () => {
    // There is no contract field in the hint: even a tampered body carrying
    // one is rejected at the validation boundary.
    assert.throws(() =>
      parseRecordHint({
        chainId: 97,
        txHash: TX,
        contractAddress: OTHER,
      })
    );
    // And the derived address always equals the EVENT token, never a claim.
    const record = await verifyWith({ tx: TX_OK, receipt: RECEIPT_OK });
    assert.equal(record.contractAddress, TOKEN.toLowerCase());
    assert.notEqual(record.contractAddress, OTHER.toLowerCase());
  });

  it("rejects reverted receipts", async () => {
    await rejectsWith(
      verifyWith({ tx: TX_OK, receipt: { ...RECEIPT_OK, status: "0x0" } }),
      "tx-reverted"
    );
  });

  it("rejects missing receipts and missing transactions", async () => {
    await rejectsWith(verifyWith({ tx: TX_OK, receipt: null }), "receipt-missing");
    await rejectsWith(verifyWith({ tx: null, receipt: RECEIPT_OK }), "tx-missing");
  });

  it("rejects transactions not sent to the expected factory", async () => {
    await rejectsWith(
      verifyWith({
        tx: { ...TX_OK, to: OTHER },
        receipt: RECEIPT_OK,
      }),
      "factory-mismatch"
    );
  });

  it("ignores TokenCreated logs from other addresses (wrong factory event)", async () => {
    await rejectsWith(
      verifyWith({
        tx: TX_OK,
        receipt: {
          ...RECEIPT_OK,
          logs: [tokenCreatedLog(TOKEN, OTHER)],
        },
      }),
      "event-missing"
    );
  });

  it("rejects receipts with no usable TokenCreated event", async () => {
    await rejectsWith(
      verifyWith({ tx: TX_OK, receipt: { ...RECEIPT_OK, logs: [] } }),
      "event-missing"
    );
  });

  it("rejects non-zero-value deployment transactions", async () => {
    await rejectsWith(
      verifyWith({ tx: { ...TX_OK, value: 1n }, receipt: RECEIPT_OK }),
      "nonzero-value"
    );
  });

  it("rejects malformed tx hashes at the hint boundary", () => {
    assert.throws(() => parseRecordHint({ chainId: 97, txHash: "0x123" }));
  });

  it("sanitizes raw RPC errors (no provider text leaks)", async () => {
    const raw = new Error("secret-rpc-endpoint exploded: ECONNREFUSED 10.0.0.9");
    try {
      await verifyWith({ tx: raw, receipt: RECEIPT_OK });
      assert.fail("expected throw");
    } catch (error) {
      assert.ok(error instanceof VerificationError);
      assert.equal(error.code, "rpc-unavailable");
      assert.ok(!String(error).includes("10.0.0.9"));
      assert.ok(!String(error).includes("secret-rpc-endpoint"));
    }
  });

  it("requires a configured expected factory", async () => {
    try {
      await verifyDeployment({
        hint: parseRecordHint({ chainId: 97, txHash: TX }),
        chain: reader({ tx: TX_OK, receipt: RECEIPT_OK }),
        expectedFactory: null,
        quoteForFeatures: QUOTE,
      });
      assert.fail("expected throw");
    } catch (error) {
      assert.ok(error instanceof VerificationError);
      assert.equal(error.code, "factory-unavailable");
    }
  });
});
