import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GET, POST } from "../../../app/api/deployments/verify/route";

/**
 * Verify-route validation tests. Only request-shape paths are exercised
 * here (no network, no database, no key): deep behavior is covered by
 * the service tests with injected fakes.
 */

const TX = "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

let ipCounter = 0;

function post(body: unknown): Request {
  ipCounter += 1;
  return new Request("http://localhost/api/deployments/verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Unique client IP per request: the route's in-memory throttle is
      // per-IP, and tests must not trip each other's buckets.
      "x-forwarded-for": `10.9.9.${ipCounter}`,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function get(url: string): Request {
  ipCounter += 1;
  return new Request(url, {
    method: "GET",
    headers: { "x-forwarded-for": `10.9.9.${ipCounter}` },
  });
}

describe("POST /api/deployments/verify — request validation", () => {
  it("rejects malformed bodies without side effects", async () => {
    for (const body of [
      "not-json{{{",
      null,
      [],
      {},
      { chainId: "56", txHash: TX },
      { chainId: 56 },
      { chainId: 56, txHash: "0x123" },
      { chainId: 56, txHash: TX, tokenAddress: "0x1234567890abcdef1234567890abcdef12345678" },
      { chainId: 1, txHash: TX },
      { chainId: 137, txHash: TX },
      // Extra client-supplied verification material must not validate.
      { chainId: 56, txHash: TX, source: "...", constructorArgs: "0x" },
    ]) {
      const response = await POST(post(body));
      assert.equal(response.status, 400, JSON.stringify(body));
      const parsed = (await response.json()) as { error: { code: string; retryable: boolean } };
      assert.equal(parsed.error.code, "invalid-request", JSON.stringify(body));
      assert.equal(parsed.error.retryable, false);
    }
  });

  it("fails closed with sanitized output when backends are unconfigured", async () => {
    // Factory configured but no RPC/DB in the test env: the route must
    // fail closed to a sanitized 503, never leak internals.
    const original = process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS;
    process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS =
      "0xd7de07de5113efa6cf0c213914ed7f0df60b682c";
    try {
      const response = await POST(post({ chainId: 56, txHash: TX }));
      assert.equal(response.status, 503);
      const parsed = (await response.json()) as { error: { code: string } };
      assert.ok(typeof parsed.error.code === "string");
      const text = JSON.stringify(parsed);
      assert.ok(!text.includes("DATABASE_URL"));
      assert.ok(!text.includes("BSCSCAN"));
    } finally {
      if (original === undefined) delete process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS;
      else process.env.NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS = original;
    }
  });
});

describe("GET /api/deployments/verify — status validation", () => {
  it("rejects malformed queries", async () => {
    for (const url of [
      "http://localhost/api/deployments/verify",
      "http://localhost/api/deployments/verify?chainId=56",
      "http://localhost/api/deployments/verify?chainId=1&contractAddress=0x1234567890abcdef1234567890abcdef12345678",
      "http://localhost/api/deployments/verify?chainId=56&contractAddress=0x123",
      "http://localhost/api/deployments/verify?chainId=abc&contractAddress=0x1234567890abcdef1234567890abcdef12345678",
    ]) {
      const response = await GET(get(url));
      assert.equal(response.status, 400, url);
    }
  });

  it("fails closed with sanitized output when the database is unconfigured", async () => {
    const response = await GET(
      get("http://localhost/api/deployments/verify?chainId=56&contractAddress=0x1234567890abcdef1234567890abcdef12345678")
    );
    assert.ok([200, 503].includes(response.status));
    if (response.status === 200) {
      const parsed = (await response.json()) as {
        verification: { status: string; contractAddress: string };
      };
      assert.ok(typeof parsed.verification.status === "string");
    } else {
      const parsed = (await response.json()) as { error: { code: string } };
      assert.ok(typeof parsed.error.code === "string");
    }
  });
});
