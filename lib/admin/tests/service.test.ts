import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hashPassword } from "../password";
import {
  AuthError,
  authenticateAdmin,
  createAdminUser,
  loginAdmin,
  logoutAdmin,
  type AdminStores,
} from "../service";
import { hashSessionToken } from "../session";
import {
  InMemoryAdminSessionStore,
  InMemoryAdminUserStore,
} from "../store";

async function storesWithAdmin(
  identifier = "operator",
  password = "correct-horse-12"
): Promise<{ stores: AdminStores; password: string }> {
  const users = new InMemoryAdminUserStore();
  const sessions = new InMemoryAdminSessionStore();
  await users.insertUser({
    identifier,
    passwordHash: await hashPassword(password),
  });
  return { stores: { users, sessions }, password };
}

describe("admin — login and session lifecycle", () => {
  it("correct credentials succeed and issue an opaque session", async () => {
    const { stores } = await storesWithAdmin();
    const result = await loginAdmin(
      { identifier: "operator", password: "correct-horse-12" },
      stores
    );
    assert.match(result.token, /^[0-9a-f]{64}$/);
    assert.ok(result.expiresAt.getTime() > Date.now());

    // Only the token HASH is stored server-side.
    const sessions = stores.sessions as InMemoryAdminSessionStore;
    const active = await sessions.findActiveByTokenHash(
      hashSessionToken(result.token)
    );
    assert.ok(active);
    assert.equal(await sessions.activeCountForUser(active.adminUserId), 1);
  });

  it("wrong credentials return the generic failure (no enumeration)", async () => {
    const { stores } = await storesWithAdmin();
    for (const body of [
      { identifier: "operator", password: "wrong-password-1" },
      { identifier: "nobody-here", password: "correct-horse-12" },
      { identifier: "operator", password: "" },
    ]) {
      try {
        await loginAdmin(body, stores);
        assert.fail(`expected rejection for ${JSON.stringify(body)}`);
      } catch (error) {
        assert.ok(error instanceof AuthError);
        assert.equal(error.code, "invalid-credentials");
        assert.equal(error.httpStatus, 401);
      }
    }
    // Unknown-user and wrong-password failures are indistinguishable.
  });

  it("malformed auth input is rejected as invalid-request", async () => {
    const { stores } = await storesWithAdmin();
    for (const body of [
      null,
      {},
      { identifier: "operator" },
      { password: "x" },
      { identifier: "operator", password: "x", role: "admin" },
      { identifier: 42, password: "correct-horse-12" },
    ]) {
      try {
        await loginAdmin(body, stores);
        assert.fail(`expected rejection for ${JSON.stringify(body)}`);
      } catch (error) {
        assert.ok(error instanceof AuthError);
        assert.equal(error.code, "invalid-request");
        assert.equal(error.httpStatus, 400);
      }
    }
  });

  it("login rotates sessions: older tokens stop working", async () => {
    const { stores } = await storesWithAdmin();
    const first = await loginAdmin(
      { identifier: "operator", password: "correct-horse-12" },
      stores
    );
    const second = await loginAdmin(
      { identifier: "operator", password: "correct-horse-12" },
      stores
    );
    assert.notEqual(first.token, second.token);
    try {
      await authenticateAdmin(first.token, stores);
      assert.fail("rotated token must be rejected");
    } catch (error) {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, "unauthenticated");
    }
    const me = await authenticateAdmin(second.token, stores);
    assert.equal(me.identifier, "operator");
  });

  it("expired sessions are rejected", async () => {
    const { stores } = await storesWithAdmin();
    const result = await loginAdmin(
      { identifier: "operator", password: "correct-horse-12" },
      stores,
      new Date("2026-01-01T00:00:00Z")
    );
    try {
      await authenticateAdmin(
        result.token,
        stores,
        new Date(result.expiresAt.getTime() + 1000)
      );
      assert.fail("expired session must be rejected");
    } catch (error) {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, "unauthenticated");
    }
  });

  it("revoked sessions are rejected; logout revokes", async () => {
    const { stores } = await storesWithAdmin();
    const result = await loginAdmin(
      { identifier: "operator", password: "correct-horse-12" },
      stores
    );
    await logoutAdmin(result.token, stores);
    try {
      await authenticateAdmin(result.token, stores);
      assert.fail("revoked session must be rejected");
    } catch (error) {
      assert.ok(error instanceof AuthError);
    }
    // Logout of an unknown token still succeeds silently (no oracle).
    await logoutAdmin("f".repeat(64), stores);
    await logoutAdmin(null, stores);
  });

  it("deactivated users lose access immediately", async () => {
    const { stores } = await storesWithAdmin();
    const result = await loginAdmin(
      { identifier: "operator", password: "correct-horse-12" },
      stores
    );
    await (stores.users as InMemoryAdminUserStore).deactivate("operator");
    try {
      await authenticateAdmin(result.token, stores);
      assert.fail("deactivated user must be rejected");
    } catch (error) {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, "unauthenticated");
    }
    try {
      await loginAdmin(
        { identifier: "operator", password: "correct-horse-12" },
        stores
      );
      assert.fail("deactivated user must not log in");
    } catch (error) {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, "invalid-credentials");
    }
  });

  it("malformed tokens are rejected without touching the store", async () => {
    const { stores } = await storesWithAdmin();
    for (const bad of [null, "", "short", 42]) {
      try {
        await authenticateAdmin(bad as unknown as string, stores);
        assert.fail(`expected rejection for ${String(bad)}`);
      } catch (error) {
        assert.ok(error instanceof AuthError);
        assert.equal(error.code, "unauthenticated");
      }
    }
  });
});

describe("admin — CLI bootstrap gate (no public endpoint)", () => {
  it("creation requires the setup token and valid input", async () => {
    const users = new InMemoryAdminUserStore();
    const sessions = new InMemoryAdminSessionStore();
    const stores: AdminStores = { users, sessions };
    const previous = process.env.ADMIN_SETUP_TOKEN;
    try {
      process.env.ADMIN_SETUP_TOKEN = "setup-secret-token";
      const row = await createAdminUser(
        {
          identifier: "Owner",
          password: "a-strong-password-1",
          setupToken: "setup-secret-token",
        },
        stores
      );
      assert.equal(row.identifier, "owner");
      assert.ok(!row.passwordHash.includes("a-strong-password-1"));

      // Wrong setup token → refused.
      await assert.rejects(
        createAdminUser(
          { identifier: "other", password: "a-strong-password-1", setupToken: "nope" },
          stores
        ),
        AuthError
      );
      // Duplicate identifier → refused, never overwritten.
      await assert.rejects(
        createAdminUser(
          { identifier: "owner", password: "another-strong-12", setupToken: "setup-secret-token" },
          stores
        ),
        AuthError
      );
      // Weak password → refused.
      await assert.rejects(
        createAdminUser(
          { identifier: "weak", password: "short", setupToken: "setup-secret-token" },
          stores
        ),
        AuthError
      );
    } finally {
      process.env.ADMIN_SETUP_TOKEN = previous;
    }
  });

  it("creation is impossible without a configured setup token", async () => {
    const stores: AdminStores = {
      users: new InMemoryAdminUserStore(),
      sessions: new InMemoryAdminSessionStore(),
    };
    const previous = process.env.ADMIN_SETUP_TOKEN;
    try {
      process.env.ADMIN_SETUP_TOKEN = "";
      await assert.rejects(
        createAdminUser(
          { identifier: "x-admin", password: "a-strong-password-1", setupToken: "" },
          stores
        ),
        AuthError
      );
    } finally {
      process.env.ADMIN_SETUP_TOKEN = previous;
    }
  });
});
