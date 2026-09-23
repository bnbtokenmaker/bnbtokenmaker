import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ADMIN_SESSION_COOKIE,
  buildClearedSessionCookie,
  buildSessionCookie,
  cookieAttributesForTests,
  cookieSecure,
  generateSessionToken,
  hashSessionToken,
  isSessionTokenShape,
  sessionTokenFromCookieHeader,
  tokenHashEquals,
} from "../session";

describe("admin — session tokens (opaque, hashed at rest)", () => {
  it("generates 32-byte hex tokens; hash is SHA-256 (raw never stored)", async () => {
    const { createHash } = await import("node:crypto");
    const token = generateSessionToken();
    assert.ok(isSessionTokenShape(token));
    assert.equal(
      hashSessionToken(token),
      createHash("sha256").update(token, "utf8").digest("hex")
    );
    assert.match(hashSessionToken(token), /^[0-9a-f]{64}$/);
    assert.notEqual(hashSessionToken(token), token);
  });

  it("token-hash comparison is timing-safe and shape-strict", () => {
    const token = generateSessionToken();
    const hashed = hashSessionToken(token);
    assert.equal(tokenHashEquals(hashed, hashed), true);
    assert.equal(tokenHashEquals(hashed, hashSessionToken(generateSessionToken())), false);
    assert.equal(tokenHashEquals("not-hex", hashed), false);
  });

  it("parses the session cookie from a Cookie header", () => {
    const token = generateSessionToken();
    assert.equal(
      sessionTokenFromCookieHeader(`other=1; ${ADMIN_SESSION_COOKIE}=${token}; x=2`),
      token
    );
    assert.equal(sessionTokenFromCookieHeader(null), null);
    assert.equal(sessionTokenFromCookieHeader(""), null);
    assert.equal(sessionTokenFromCookieHeader(`${ADMIN_SESSION_COOKIE}=garbage`), null);
    assert.equal(sessionTokenFromCookieHeader("unrelated=abc"), null);
  });

  it("issued cookies are HttpOnly + SameSite=Lax, Secure only in production", () => {
    const token = generateSessionToken();
    const prod = buildSessionCookie(token, 3_600_000, true);
    assert.ok(prod.includes("HttpOnly"));
    assert.ok(prod.includes("SameSite=Lax"));
    assert.ok(prod.includes("Secure"));
    assert.ok(prod.includes("Path=/"));
    assert.ok(prod.includes("Max-Age=3600"));

    const dev = buildSessionCookie(token, 3_600_000, false);
    assert.ok(dev.includes("HttpOnly"));
    assert.ok(dev.includes("SameSite=Lax"));
    assert.ok(!/(^|; )Secure/.test(dev));

    // Default wiring follows the environment.
    assert.equal(cookieSecure("production"), true);
    assert.equal(cookieSecure("test"), false);
    assert.equal(cookieSecure(undefined), false);

    const attrs = cookieAttributesForTests();
    assert.equal(attrs.httpOnly, true);
    assert.equal(attrs.sameSite, "Lax");
    assert.equal(attrs.path, "/");
  });

  it("logout clears the cookie immediately", () => {
    const cleared = buildClearedSessionCookie();
    assert.ok(cleared.includes("Max-Age=0"));
    assert.ok(cleared.includes("HttpOnly"));
  });
});
