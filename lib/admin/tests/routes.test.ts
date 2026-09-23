import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

import { isSameOriginRequest } from "../csrf";
import { hashPassword } from "../password";
import { ADMIN_SESSION_COOKIE } from "../session";
import {
  getAdminStores,
  resetAdminStoresForTests,
} from "../stores";
import { InMemoryAdminUserStore } from "../store";
import { resetRateLimitsForTests } from "../../server/rate-limit";

import { POST as loginPost } from "../../../app/api/admin/login/route";
import { POST as logoutPost } from "../../../app/api/admin/logout/route";
import { GET as meGet } from "../../../app/api/admin/me/route";

// Route handlers read this lazily at call time, so assigning here (before
// any test runs) takes effect despite static imports above.
process.env.ADMIN_AUTH_STORE = "memory";

const PASSWORD = "correct-horse-12";

async function seedUser(identifier = "operator"): Promise<void> {
  resetAdminStoresForTests();
  resetRateLimitsForTests();
  const { users } = getAdminStores();
  await (users as InMemoryAdminUserStore).insertUser({
    identifier,
    passwordHash: await hashPassword(PASSWORD),
  });
}

function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function sessionCookieFrom(response: Response): string | null {
  const cookies = response.headers.getSetCookie?.() ?? [];
  const match = cookies.find((c) => c.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  if (!match) return null;
  return match.split(";")[0].slice(ADMIN_SESSION_COOKIE.length + 1);
}

describe("admin routes — login/logout/me behavior", () => {
  it("login success sets an HttpOnly session cookie; me returns the identifier", async () => {
    await seedUser();
    const login = await loginPost(
      postJson("http://localhost/api/admin/login", {
        identifier: "operator",
        password: PASSWORD,
      })
    );
    assert.equal(login.status, 200);
    const token = sessionCookieFrom(login);
    assert.ok(token && /^[0-9a-f]{64}$/.test(token));
    const setCookie = (login.headers.getSetCookie?.() ?? []).join("; ");
    assert.ok(setCookie.includes("HttpOnly"));
    assert.ok(setCookie.includes("SameSite=Lax"));

    const me = await meGet(
      new Request("http://localhost/api/admin/me", {
        headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
      })
    );
    assert.equal(me.status, 200);
    assert.deepEqual(await me.json(), { admin: { identifier: "operator" } });
  });

  it("wrong password → generic 401; no session cookie", async () => {
    await seedUser();
    const login = await loginPost(
      postJson("http://localhost/api/admin/login", {
        identifier: "operator",
        password: "wrong-password-99",
      })
    );
    assert.equal(login.status, 401);
    assert.deepEqual(await login.json(), {
      error: { code: "invalid-credentials", message: "Invalid credentials." },
    });
    assert.equal(sessionCookieFrom(login), null);
  });

  it("malformed login input → 400 (never a session)", async () => {
    await seedUser();
    const login = await loginPost(
      postJson("http://localhost/api/admin/login", { identifier: "operator" })
    );
    assert.equal(login.status, 400);
    assert.equal(sessionCookieFrom(login), null);
  });

  it("me without a session → 401; protected data unavailable", async () => {
    await seedUser();
    const me = await meGet(new Request("http://localhost/api/admin/me"));
    assert.equal(me.status, 401);
    assert.deepEqual(await me.json(), { error: { code: "unauthenticated" } });
  });

  it("logout revokes the session and clears the cookie", async () => {
    await seedUser();
    const login = await loginPost(
      postJson("http://localhost/api/admin/login", {
        identifier: "operator",
        password: PASSWORD,
      })
    );
    const token = sessionCookieFrom(login);
    assert.ok(token);

    const logout = await logoutPost(
      new Request("http://localhost/api/admin/logout", {
        method: "POST",
        headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
      })
    );
    assert.equal(logout.status, 200);
    const cleared = (logout.headers.getSetCookie?.() ?? []).join("; ");
    assert.ok(cleared.includes("Max-Age=0"));

    const me = await meGet(
      new Request("http://localhost/api/admin/me", {
        headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
      })
    );
    assert.equal(me.status, 401);
  });

  it("cross-site POST mutations are rejected (Origin/Host check)", async () => {
    await seedUser();
    const evil = await loginPost(
      postJson(
        "http://localhost/api/admin/login",
        { identifier: "operator", password: PASSWORD },
        { origin: "https://evil.example" }
      )
    );
    assert.equal(evil.status, 403);
    assert.equal(sessionCookieFrom(evil), null);
  });

  it("no unauthenticated admin-creation endpoint exists", async () => {
    const adminApi = new URL("../../../app/api/admin", import.meta.url);
    const entries = await readdir(adminApi, { withFileTypes: true });
    const routes = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    // Phase 7C adds authenticated pricing/campaign management. Every route
    // under these directories requires a valid admin session (proven by
    // lib/admin/tests/pricing-campaigns-routes.test.ts); this allowlist
    // exists to catch stray new endpoints, not to freeze the set.
    assert.deepEqual(routes, [
      "campaigns",
      "login",
      "logout",
      "me",
      "pricing",
    ]);
    for (const route of routes) {
      const files = await readdir(join(adminApi.pathname, route));
      if (route === "pricing") {
        assert.deepEqual(files.sort(), ["publish", "route.ts"]);
        const nested = await readdir(join(adminApi.pathname, route, "publish"));
        assert.deepEqual(nested, ["route.ts"]);
      } else if (route === "campaigns") {
        assert.deepEqual(files.sort(), ["[id]", "route.ts"]);
        const nested = await readdir(join(adminApi.pathname, route, "[id]"));
        assert.deepEqual(nested, ["route.ts"]);
      } else {
        assert.deepEqual(files, ["route.ts"]);
      }
    }
  });
});

describe("admin — CSRF origin policy", () => {
  it("same-origin and headerless requests pass; cross-site fails", () => {
    const same = new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { origin: "http://localhost" },
    });
    assert.equal(isSameOriginRequest(same), true);

    const headerless = new Request("http://localhost/api/admin/login", {
      method: "POST",
    });
    assert.equal(isSameOriginRequest(headerless), true);

    const evil = new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    assert.equal(isSameOriginRequest(evil), false);

    const evilReferer = new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { referer: "https://evil.example/" },
    });
    assert.equal(isSameOriginRequest(evilReferer), false);
  });
});
