import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeAbiParameters, keccak256, pad, stringToHex } from "viem";

import {
  DeploymentConflictError,
  InMemoryDeploymentStore,
} from "../store";
import {
  verifyDeployment,
  type VerifiedDeploymentRecord,
} from "../verify";
import type { ChainReader } from "../verify";

const FACTORY = "0x5357b13c30967197cf38b5ffae2088417c562187" as const;
const TOKEN = "0x1111111111111111111111111111111111111111" as const;
const DEPLOYER = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" as const;
const TX =
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as const;
const SUPPLY = 1_000_000n * 10n ** 18n;

type Hex = `0x${string}`;

function eventLog(token: Hex, features: bigint) {
  const topic0 = keccak256(
    stringToHex(
      "TokenCreated(address,address,address,string,string,uint8,uint256,uint256)"
    )
  );
  return {
    address: FACTORY,
    topics: [topic0, pad(token), pad(DEPLOYER), pad(DEPLOYER)] as [
      Hex,
      ...Hex[],
    ],
    data: encodeAbiParameters(
      [
        { type: "string" },
        { type: "string" },
        { type: "uint8" },
        { type: "uint256" },
        { type: "uint256" },
      ],
      ["Test Token", "TST", 18, SUPPLY, features]
    ),
  };
}

function chainFor(token: Hex, features = 0n): ChainReader {
  return {
    async getTransaction() {
      return { hash: TX, from: DEPLOYER, to: FACTORY, value: 0n };
    },
    async getTransactionReceipt() {
      return { status: "success", blockNumber: 42n, logs: [eventLog(token, features)] };
    },
  };
}

async function verified(
  version: string,
  options: { token?: Hex; features?: bigint } = {}
): Promise<VerifiedDeploymentRecord> {
  return verifyDeployment({
    hint: { chainId: 97, txHash: TX as Hex },
    chain: chainFor(options.token ?? (TOKEN as Hex), options.features ?? 0n),
    expectedFactory: FACTORY as Hex,
    quoteForFeatures: () => ({ pricingVersion: version, totalWei: "0" }),
  });
}

/**
 * Simulate a PostgreSQL JSONB write/read round-trip: jsonb normalizes
 * object key order (length, then bytewise), so rebuild every object with
 * keys in that order. Semantically identical, textually reordered.
 */
function jsonbRoundTrip<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(jsonbRoundTrip) as T;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort(
      (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0)
    )) {
      out[key] = jsonbRoundTrip(record[key]);
    }
    return out as T;
  }
  return value;
}

describe("deployments — idempotency across JSONB key order (Phase 7A fix)", () => {
  it("A. reordered featureConfig keys (jsonb normalization) stay idempotent", async () => {
    const store = new InMemoryDeploymentStore();
    const first = await store.upsertDeployment(await verified("dev-1"));
    assert.equal(first.inserted, true);

    // Same immutable facts, featureConfig rebuilt in jsonb-normalized order.
    const rerecord = await verified("dev-1");
    rerecord.featureConfig = jsonbRoundTrip(rerecord.featureConfig);
    const second = await store.upsertDeployment(rerecord);
    assert.equal(second.inserted, false);
    assert.equal(second.row.id, first.row.id);
    assert.equal(store.size(), 1);
  });

  it("A (reverse). normalized stored row still matches a fresh-order re-record", async () => {
    const store = new InMemoryDeploymentStore();
    const normalized = await verified("dev-1");
    normalized.featureConfig = jsonbRoundTrip(normalized.featureConfig);
    const first = await store.upsertDeployment(normalized);
    assert.equal(first.inserted, true);

    const second = await store.upsertDeployment(await verified("dev-1"));
    assert.equal(second.inserted, false);
    assert.equal(second.row.id, first.row.id);
  });

  it("C. extra/missing/changed feature keys still conflict", async () => {
    for (const mutate of [
      (config: Record<string, unknown>) => ({ ...config, injected: true }),
      (config: Record<string, unknown>) => {
        const rest = { ...config };
        delete rest.mint;
        return rest;
      },
      (config: Record<string, unknown>) => ({ ...config, burn: !config.burn }),
    ]) {
      const store = new InMemoryDeploymentStore();
      await store.upsertDeployment(await verified("dev-1"));
      const tampered = await verified("dev-1");
      tampered.featureConfig = mutate(
        tampered.featureConfig as unknown as Record<string, unknown>
      ) as typeof tampered.featureConfig;
      await assert.rejects(() => store.upsertDeployment(tampered), DeploymentConflictError);
      assert.equal(store.size(), 1);
    }
  });

  it("D. pricing version drift does not conflict; original snapshot wins", async () => {
    const store = new InMemoryDeploymentStore();
    const first = await store.upsertDeployment(await verified("dev-1"));
    assert.equal(first.inserted, true);

    // Same immutable facts, server pricing moved on (new version + total).
    const rerecord = await verified("dev-2");
    rerecord.quoteSnapshot = {
      pricingVersion: "dev-2",
      totalWei: "99900000000000000",
      selectedFeatures: [],
    };
    const second = await store.upsertDeployment(rerecord);
    assert.equal(second.inserted, false);
    assert.equal(second.row.id, first.row.id);
    // First-write-wins: the ORIGINAL snapshot is preserved untouched.
    assert.deepEqual(second.row.quoteSnapshot, first.row.quoteSnapshot);
    assert.equal(
      (second.row.quoteSnapshot as { pricingVersion: string }).pricingVersion,
      "dev-1"
    );
  });

  it("E. genuine immutable tamper still conflicts", async () => {
    const tamperCases: Array<(r: VerifiedDeploymentRecord) => void> = [
      (r) => {
        r.contractAddress =
          "0x2222222222222222222222222222222222222222" as Hex;
      },
      (r) => {
        r.tokenSymbol = "FAKE";
      },
      (r) => {
        r.initialSupplyBase = "1";
      },
      (r) => {
        r.platformFeeWei = "1";
      },
      (r) => {
        r.blockNumber = 43;
      },
    ];
    for (const tamper of tamperCases) {
      const store = new InMemoryDeploymentStore();
      await store.upsertDeployment(await verified("dev-1"));
      const tampered = await verified("dev-1");
      tamper(tampered);
      await assert.rejects(
        () => store.upsertDeployment(tampered),
        DeploymentConflictError
      );
      assert.equal(store.size(), 1);
    }
  });

  it("E (features). different on-chain feature bitmap still conflicts", async () => {
    const store = new InMemoryDeploymentStore();
    await store.upsertDeployment(await verified("dev-1", { features: 0n }));
    // 43n = burn+mint+maxTx+blacklist per decodeFeatureBitmap.
    const tampered = await verified("dev-1", { features: 43n });
    await assert.rejects(
      () => store.upsertDeployment(tampered),
      DeploymentConflictError
    );
    assert.equal(store.size(), 1);
  });
});
