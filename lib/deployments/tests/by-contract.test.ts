import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InMemoryDeploymentStore } from "../store";
import { GET } from "../../../app/api/deployments/by-contract/route";

/**
 * By-contract lookup tests. Store behavior via the in-memory double;
 * route validation without network or database (deep paths fail closed
 * to sanitized 503 when unconfigured).
 */

const TOKEN = "0x1111111111111111111111111111111111111111";
const TX = "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

function row() {
  return {
    chainId: 56,
    txHash: TX as `0x${string}`,
    contractAddress: TOKEN as `0x${string}`,
    factoryAddress: "0xd7de07de5113efa6cf0c213914ed7f0df60b682c" as `0x${string}`,
    deployerAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`,
    tokenName: "T",
    tokenSymbol: "T",
    decimals: 18,
    initialSupplyBase: "100",
    featureConfig: {},
    quoteSnapshot: {},
    platformFeeWei: "0",
    blockNumber: 1,
  };
}

describe("findByContract", () => {
  it("resolves a known contract to its row", async () => {
    const store = new InMemoryDeploymentStore();
    await store.upsertDeployment(row() as never);
    const found = await store.findByContract(56, TOKEN);
    assert.equal(found?.txHash, TX);
  });

  it("returns null for unknown contracts and isolates chains and case", async () => {
    const store = new InMemoryDeploymentStore();
    await store.upsertDeployment(row() as never);
    assert.equal(await store.findByContract(56, "0x2222222222222222222222222222222222222222"), null);
    assert.equal(await store.findByContract(97, TOKEN), null);
    const upper = await store.findByContract(56, TOKEN.toUpperCase());
    assert.equal(upper?.txHash, TX);
  });
});

describe("GET /api/deployments/by-contract", () => {
  let ipCounter = 100;
  function get(url: string): Request {
    ipCounter += 1;
    return new Request(url, {
      method: "GET",
      headers: { "x-forwarded-for": `10.8.8.${ipCounter}` },
    });
  }

  it("rejects malformed queries", async () => {
    for (const url of [
      "http://localhost/api/deployments/by-contract",
      "http://localhost/api/deployments/by-contract?chainId=56",
      "http://localhost/api/deployments/by-contract?chainId=1&contractAddress=0x1234567890abcdef1234567890abcdef12345678",
      "http://localhost/api/deployments/by-contract?chainId=56&contractAddress=0x123",
      "http://localhost/api/deployments/by-contract?chainId=abc&contractAddress=0x1234567890abcdef1234567890abcdef12345678",
    ]) {
      const response = await GET(get(url));
      assert.equal(response.status, 400, url);
    }
  });

  it("exposes only the public txHash on success-shaped paths", async () => {
    // Without DATABASE_URL the store fails closed to sanitized 503.
    const response = await GET(
      get(`http://localhost/api/deployments/by-contract?chainId=56&contractAddress=${TOKEN}`)
    );
    assert.ok([200, 503].includes(response.status));
    const parsed = (await response.json()) as Record<string, unknown>;
    if (response.status === 200) {
      assert.deepEqual(Object.keys(parsed).sort(), ["txHash"]);
      assert.ok(/^0x[a-fA-F0-9]{64}$/.test(String(parsed.txHash)));
    } else {
      assert.ok(typeof (parsed as { error: { code: string } }).error.code === "string");
    }
  });
});
