import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InMemoryDeploymentStore } from "../store";
import type { VerifiedDeploymentRecord } from "../verify";

const DEPLOYER = "0xf39fd6e51aad88f6f4ce6ab8827279cffFb92266";
const OTHER = "0x9999999999999999999999999999999999999999";

function record(tx: string, deployer: string): VerifiedDeploymentRecord {
  return {
    chainId: 97,
    txHash: tx as `0x${string}`,
    contractAddress: "0x1111111111111111111111111111111111111111",
    factoryAddress: "0x5357b13c30967197cf38b5ffae2088417c562187",
    deployerAddress: deployer.toLowerCase() as `0x${string}`,
    tokenName: "T",
    tokenSymbol: "T",
    decimals: 18,
    initialSupplyBase: "100",
    featureConfig: {
      version: 1,
      burn: false,
      mint: false,
      pause: false,
      maxTx: false,
      maxWallet: false,
      blacklist: false,
      whitelist: false,
      trading: false,
      antiBot: false,
      autoLiquidity: false,
    },
    quoteSnapshot: {
      pricingVersion: "dev-1",
      totalWei: "0",
      selectedFeatures: [],
      paidBinding: null,
      advancedConfig: null,
    },
    platformFeeWei: "0",
    blockNumber: 1,
  };
}

const TX = (n: number) => (`0x${String(n).padStart(64, "a")}` as `0x${string}`);

describe("deployments — read-only discovery", () => {
  it("lists a deployer's rows newest-first with limit and isolation", async () => {
    const store = new InMemoryDeploymentStore();
    await store.upsertDeployment(record(TX(1), DEPLOYER));
    await store.upsertDeployment(record(TX(2), DEPLOYER));
    await store.upsertDeployment(record(TX(3), OTHER));
    const mine = await store.listByDeployer(97, DEPLOYER, 10);
    assert.equal(mine.length, 2);
    assert.equal(mine[0].txHash, TX(2).toLowerCase());
    assert.equal(mine[1].txHash, TX(1).toLowerCase());
    assert.deepEqual(await store.listByDeployer(97, DEPLOYER, 1), [mine[0]]);
    assert.deepEqual(await store.listByDeployer(56, DEPLOYER, 10), []);
    assert.deepEqual((await store.listByDeployer(97, OTHER, 10)).length, 1);
  });
});
