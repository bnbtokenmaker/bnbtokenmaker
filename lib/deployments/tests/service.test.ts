import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeAbiParameters, keccak256, pad, stringToHex } from "viem";

import {
  RecordDeploymentsError,
  recordDeployment,
  toPublicDto,
  type RecordDependencies,
} from "../service";
import { InMemoryDeploymentStore } from "../store";
import type { ChainReader } from "../verify";

const FACTORY = "0x5357b13c30967197cf38b5ffae2088417c562187";
const TOKEN = "0x1111111111111111111111111111111111111111" as `0x${string}`;
const TOKEN_TAMPERED = "0x2222222222222222222222222222222222222222" as `0x${string}`;
const DEPLOYER = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" as `0x${string}`;
const TX =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`;
const SUPPLY = 1_000_000n * 10n ** 18n;

function eventLog(token: `0x${string}`) {
  const topic0 = keccak256(
    stringToHex(
      "TokenCreated(address,address,address,string,string,uint8,uint256,uint256)"
    )
  );
  return {
    address: FACTORY,
    topics: [topic0, pad(token), pad(DEPLOYER), pad(DEPLOYER)] as [
      `0x${string}`,
      ...`0x${string}`[],
    ],
    data: encodeAbiParameters(
      [
        { type: "string" },
        { type: "string" },
        { type: "uint8" },
        { type: "uint256" },
        { type: "uint256" },
      ],
      ["Test Token", "TST", 18, SUPPLY, 0n]
    ),
  };
}

/** Deterministic chain fixture: the SAME facts the real testnet would show. */
function chainFor(token: `0x${string}`): ChainReader {
  return {
    async getTransaction() {
      return { hash: TX, from: DEPLOYER, to: FACTORY, value: 0n };
    },
    async getTransactionReceipt() {
      return { status: "success", blockNumber: 42n, logs: [eventLog(token)] };
    },
  };
}

function deps(store: InMemoryDeploymentStore, token = TOKEN): RecordDependencies {
  return {
    store,
    chain: chainFor(token),
    expectedFactory: FACTORY as `0x${string}`,
    quoteForFeatures: () => ({ pricingVersion: "dev-1", totalWei: "0" }),
  };
}

const BODY = { chainId: 97, txHash: TX };

describe("deployments — record service (verify → idempotent upsert)", () => {
  it("first record verifies on-chain and inserts (201 semantics)", async () => {
    const store = new InMemoryDeploymentStore();
    const outcome = await recordDeployment(BODY, deps(store));
    assert.equal(outcome.result.inserted, true);
    assert.equal(outcome.result.row.contractAddress, TOKEN.toLowerCase());
    assert.equal(outcome.result.row.deployerAddress, DEPLOYER.toLowerCase());
    assert.equal(
      outcome.result.row.initialSupplyBase,
      SUPPLY.toString(10)
    );
    assert.equal(store.size(), 1);
  });

  it("duplicate same-transaction record is idempotent (no second row)", async () => {
    const store = new InMemoryDeploymentStore();
    const first = await recordDeployment(BODY, deps(store));
    const second = await recordDeployment(BODY, deps(store));
    assert.equal(second.result.inserted, false);
    assert.equal(second.result.row.id, first.result.row.id);
    assert.equal(store.size(), 1);
  });

  it("tampered re-record (chain now claims a different token) → 409, row kept", async () => {
    const store = new InMemoryDeploymentStore();
    await recordDeployment(BODY, deps(store, TOKEN));
    try {
      await recordDeployment(BODY, deps(store, TOKEN_TAMPERED));
      assert.fail("expected conflict");
    } catch (error) {
      assert.ok(error instanceof RecordDeploymentsError);
      assert.equal(error.code, "conflict");
      assert.equal(error.httpStatus, 409);
    }
    // Original facts preserved.
    const row = await store.findByTx(97, TX.toLowerCase());
    assert.equal(row?.contractAddress, TOKEN.toLowerCase());
    assert.equal(store.size(), 1);
  });

  it("unknown transaction → sanitized 404 (no internals)", async () => {
    const store = new InMemoryDeploymentStore();
    const empty: RecordDependencies = {
      ...deps(store),
      chain: {
        async getTransaction() {
          return null;
        },
        async getTransactionReceipt() {
          return null;
        },
      },
    };
    try {
      await recordDeployment(BODY, empty);
      assert.fail("expected not-found");
    } catch (error) {
      assert.ok(error instanceof RecordDeploymentsError);
      assert.equal(error.code, "not-found");
      assert.equal(error.httpStatus, 404);
    }
    assert.equal(store.size(), 0);
  });

  it("store outage after successful verification → sanitized 503", async () => {
    const store = new InMemoryDeploymentStore();
    const broken: RecordDependencies = {
      ...deps(store),
      store: {
        findByTx: async () => null,
        upsertDeployment: async () => {
          throw new Error("postgres connection refused at 10.1.2.3:5432");
        },
      },
    };
    try {
      await recordDeployment(BODY, broken);
      assert.fail("expected unavailable");
    } catch (error) {
      assert.ok(error instanceof RecordDeploymentsError);
      assert.equal(error.code, "unavailable");
      assert.equal(error.httpStatus, 503);
      assert.ok(!String(error).includes("10.1.2.3"));
    }
  });

  it("public DTO exposes proof-of-record only", async () => {
    const store = new InMemoryDeploymentStore();
    const outcome = await recordDeployment(BODY, deps(store));
    const dto = toPublicDto(outcome.result.row, outcome.result.inserted);
    assert.deepEqual(Object.keys(dto).sort(), [
      "chainId",
      "contractAddress",
      "recorded",
      "tokenName",
      "tokenSymbol",
      "txHash",
    ]);
    assert.equal(dto.recorded, true);
    assert.equal(dto.contractAddress, TOKEN.toLowerCase());
  });
});
