import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkRateLimit,
  clientIpFromRequest,
  resetRateLimitsForTests,
} from "../../server/rate-limit";

describe("server — sliding-window rate limiter", () => {
  it("allows up to the limit, then blocks with Retry-After", () => {
    resetRateLimitsForTests();
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      assert.equal(checkRateLimit("k", 5, 60_000, now + i).allowed, true);
    }
    const blocked = checkRateLimit("k", 5, 60_000, now + 5);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds >= 1);
  });

  it("window expiry restores access; keys are isolated", () => {
    resetRateLimitsForTests();
    assert.equal(checkRateLimit("a", 1, 1000, 0).allowed, true);
    assert.equal(checkRateLimit("a", 1, 1000, 500).allowed, false);
    assert.equal(checkRateLimit("a", 1, 1000, 1001).allowed, true);
    assert.equal(checkRateLimit("b", 1, 1000, 500).allowed, true);
  });

  it("extracts the client IP from forwarding headers", () => {
    const forwarded = new Request("http://x/", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    assert.equal(clientIpFromRequest(forwarded), "1.2.3.4");
    assert.equal(
      clientIpFromRequest(new Request("http://x/")),
      "unknown"
    );
  });
});
