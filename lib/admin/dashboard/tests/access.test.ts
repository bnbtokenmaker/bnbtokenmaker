import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hashPassword } from "../../password";
import { generateSessionToken, hashSessionToken } from "../../session";
import {
  InMemoryAdminSessionStore,
  InMemoryAdminUserStore,
} from "../../store";
import { resolveAdminAccess } from "../access";

/**
 * Authorization behavior for admin pages (in-memory stores — no database).
 * Pages redirect on `unauthenticated` and render a sanitized error state on
 * `unavailable`; this helper is the single decision point under test.
 */
async function storesWithSession(identifier = "operator"): Promise<{
  token: string;
  stores: {
    users: InMemoryAdminUserStore;
    sessions: InMemoryAdminSessionStore;
  };
}> {
  const users = new InMemoryAdminUserStore();
  const sessions = new InMemoryAdminSessionStore();
  const user = await users.insertUser({
    identifier,
    passwordHash: await hashPassword("correct-horse-12"),
  });
  const token = generateSessionToken();
  await sessions.create({
    adminUserId: user.id,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  return { token, stores: { users, sessions } };
}

describe("admin dashboard — page access decisions", () => {
  it("valid session resolves the identifier", async () => {
    const { token, stores } = await storesWithSession();
    const access = await resolveAdminAccess(token, stores);
    assert.deepEqual(access, { ok: true, identifier: "operator" });
  });

  it("missing/malformed/unknown tokens are unauthenticated (redirect)", async () => {
    const { stores } = await storesWithSession();
    for (const token of [
      null,
      undefined,
      "",
      "not-a-token",
      generateSessionToken(),
    ]) {
      const access = await resolveAdminAccess(token, stores);
      assert.deepEqual(access, { ok: false, reason: "unauthenticated" });
    }
  });

  it("revoked sessions are unauthenticated", async () => {
    const { token, stores } = await storesWithSession();
    await stores.sessions.revokeByTokenHash(hashSessionToken(token), new Date());
    const access = await resolveAdminAccess(token, stores);
    assert.deepEqual(access, { ok: false, reason: "unauthenticated" });
  });

  it("deactivated admins are unauthenticated", async () => {
    const { token, stores } = await storesWithSession();
    await stores.users.deactivate("operator");
    const access = await resolveAdminAccess(token, stores);
    assert.deepEqual(access, { ok: false, reason: "unauthenticated" });
  });

  it("store outage maps to unavailable (sanitized error state, never redirect loop)", async () => {
    const { token } = await storesWithSession();
    const broken = {
      users: {
        findByIdentifier: async () => {
          throw new Error("postgres connection refused");
        },
      },
      sessions: {},
    };
    const access = await resolveAdminAccess(
      token,
      broken as unknown as Parameters<typeof resolveAdminAccess>[1]
    );
    assert.deepEqual(access, { ok: false, reason: "unavailable" });
  });
});
