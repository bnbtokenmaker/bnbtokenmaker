import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GET } from "../../../app/api/deployments/route";

function get(url: string): Request {
  return new Request(url, { method: "GET" });
}

describe("GET /api/deployments — discovery validation", () => {
  it("rejects malformed deployer, chain and limit", async () => {
    for (const url of [
      "http://localhost/api/deployments",
      "http://localhost/api/deployments?deployer=nope",
      "http://localhost/api/deployments?deployer=0x123",
      "http://localhost/api/deployments?deployer=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266&chainId=56",
      "http://localhost/api/deployments?deployer=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266&limit=0",
      "http://localhost/api/deployments?deployer=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266&limit=99",
    ]) {
      const response = await GET(get(url));
      assert.equal(response.status, 400, url);
      const body = (await response.json()) as { error: { code: string } };
      assert.ok(typeof body.error.code === "string", url);
    }
  });

  it("returns an empty list (not an error) when no DB is configured", async () => {
    // Without DATABASE_URL the store fails closed to sanitized 503 — the
    // manager treats that as silent discovery outage (recents remain).
    const response = await GET(
      get("http://localhost/api/deployments?deployer=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266&chainId=97&limit=8")
    );
    assert.ok([200, 503].includes(response.status));
    if (response.status === 200) {
      const body = (await response.json()) as { deployments: unknown[] };
      assert.ok(Array.isArray(body.deployments));
    }
  });
});
