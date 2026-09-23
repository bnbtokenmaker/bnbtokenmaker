import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hashPassword } from "../password";
import { ADMIN_SESSION_COOKIE } from "../session";
import {
  getAdminStores,
  resetAdminStoresForTests,
} from "../stores";
import { InMemoryAdminUserStore } from "../store";
import { resetRateLimitsForTests } from "../../server/rate-limit";
import { resetPricingStoresForTests } from "../../pricing/server/store";

import { POST as loginPost } from "../../../app/api/admin/login/route";
import { GET as pricingGet } from "../../../app/api/admin/pricing/route";
import { POST as publishPost } from "../../../app/api/admin/pricing/publish/route";
import {
  GET as campaignsGet,
  POST as campaignsPost,
} from "../../../app/api/admin/campaigns/route";
import { PATCH as campaignPatch } from "../../../app/api/admin/campaigns/[id]/route";

// Route handlers read these lazily at call time, so assigning here (before
// any test runs) takes effect despite static imports above.
process.env.ADMIN_AUTH_STORE = "memory";
process.env.PRICING_STORE = "memory";

const PASSWORD = "correct-horse-12";
const HOUR_MS = 60 * 60 * 1000;

const VALID_FEES = {
  base: "0.050",
  burn: "0.005",
  mint: "0.010",
  pause: "0.005",
  maxTx: "0.010",
  maxWallet: "0.010",
  blacklist: "0.010",
  whitelist: "0.010",
};

async function resetAll(): Promise<void> {
  resetAdminStoresForTests();
  resetPricingStoresForTests();
  resetRateLimitsForTests();
}

async function seedAdmin(identifier = "operator"): Promise<void> {
  await resetAll();
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

function patchJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Request {
  return new Request(url, {
    method: "PATCH",
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

async function loginCookie(): Promise<string> {
  const login = await loginPost(
    postJson("http://localhost/api/admin/login", {
      identifier: "operator",
      password: PASSWORD,
    })
  );
  assert.equal(login.status, 200);
  const token = sessionCookieFrom(login);
  assert.ok(token);
  return `${ADMIN_SESSION_COOKIE}=${token}`;
}

function campaignWindow(now: number): { startsAt: string; endsAt: string } {
  return {
    startsAt: new Date(now - HOUR_MS).toISOString(),
    endsAt: new Date(now + 24 * HOUR_MS).toISOString(),
  };
}

describe("phase 7C admin pricing/campaign routes", () => {
  it("anonymous pricing/campaign reads are rejected (401, sanitized)", async () => {
    await seedAdmin();
    for (const response of [
      await pricingGet(new Request("http://localhost/api/admin/pricing")),
      await campaignsGet(new Request("http://localhost/api/admin/campaigns")),
    ]) {
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), {
        error: { code: "unauthenticated" },
      });
    }
  });

  it("anonymous pricing/campaign mutations are rejected (401)", async () => {
    await seedAdmin();
    const publish = await publishPost(postJson("http://localhost/api/admin/pricing/publish", VALID_FEES));
    assert.equal(publish.status, 401);
    const create = await campaignsPost(
      postJson("http://localhost/api/admin/campaigns", {
        name: "Nope",
        discountBasisPoints: 1000,
        ...campaignWindow(Date.now()),
      })
    );
    assert.equal(create.status, 401);
    const patch = await campaignPatch(
      patchJson("http://localhost/api/admin/campaigns/1", { enabled: false }),
      { params: Promise.resolve({ id: "1" }) }
    );
    assert.equal(patch.status, 401);
  });

  it("cross-origin mutations are rejected (403) even with a session", async () => {
    await seedAdmin();
    const cookie = await loginCookie();
    const publish = await publishPost(
      postJson(
        "http://localhost/api/admin/pricing/publish",
        VALID_FEES,
        { origin: "https://evil.example", cookie }
      )
    );
    assert.equal(publish.status, 403);
    assert.deepEqual(await publish.json(), {
      error: { code: "forbidden-origin" },
    });
  });

  it("malformed publish payloads are rejected (400) without state change", async () => {
    await seedAdmin();
    const cookie = await loginCookie();
    for (const bad of [
      { ...VALID_FEES, base: "-0.01" },
      { ...VALID_FEES, baseFeeWei: "1" },
      { ...VALID_FEES, version: "v99" },
      { ...VALID_FEES, base: "2" },
      { base: "0.05" },
      "not-an-object",
    ]) {
      const response = await publishPost(
        postJson("http://localhost/api/admin/pricing/publish", bad, { cookie })
      );
      assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(bad)}`);
      assert.deepEqual(await response.json(), {
        error: { code: "invalid-request" },
      });
    }
    // Nothing was published by the rejected attempts.
    const state = await pricingGet(
      new Request("http://localhost/api/admin/pricing", {
        headers: { cookie },
      })
    );
    assert.equal(state.status, 200);
    const payload = (await state.json()) as { active: unknown };
    assert.equal(payload.active, null);
  });

  it("publish creates + activates a version and audits it", async () => {
    await seedAdmin();
    const cookie = await loginCookie();
    const publish = await publishPost(
      postJson("http://localhost/api/admin/pricing/publish", VALID_FEES, { cookie })
    );
    assert.equal(publish.status, 201);
    const created = (await publish.json()) as {
      ok: boolean;
      version: { id: number; version: string };
    };
    assert.equal(created.ok, true);
    assert.equal(created.version.version, "v1");

    const state = await pricingGet(
      new Request("http://localhost/api/admin/pricing", { headers: { cookie } })
    );
    assert.equal(state.status, 200);
    const payload = (await state.json()) as {
      active: { version: string; baseFeeWei: string };
      versions: Array<{ version: string }>;
      audit: Array<{ action: string }>;
    };
    assert.equal(payload.active.version, "v1");
    assert.equal(payload.active.baseFeeWei, "50000000000000000");
    assert.equal(payload.versions.length, 1);
    assert.ok(
      payload.audit.some((entry) => entry.action === "pricing_version_published")
    );
  });

  it("campaign lifecycle: create, list with derived status, disable, frozen terms", async () => {
    await seedAdmin();
    const cookie = await loginCookie();

    const create = await campaignsPost(
      postJson(
        "http://localhost/api/admin/campaigns",
        {
          name: "Launch week",
          code: "launch10",
          discountBasisPoints: 1000,
          ...campaignWindow(Date.now()),
        },
        { cookie }
      )
    );
    assert.equal(create.status, 201);
    const created = (await create.json()) as {
      ok: boolean;
      campaign: { id: number; status: string; code: string };
    };
    assert.equal(created.campaign.status, "active");
    assert.equal(created.campaign.code, "LAUNCH10");
    const id = created.campaign.id;

    // Duplicate code conflicts.
    const dupe = await campaignsPost(
      postJson(
        "http://localhost/api/admin/campaigns",
        {
          name: "Copycat",
          code: "LAUNCH10",
          discountBasisPoints: 500,
          ...campaignWindow(Date.now()),
        },
        { cookie }
      )
    );
    assert.equal(dupe.status, 409);

    // Economic edit on a STARTED campaign is rejected (400, terms frozen).
    const frozen = await campaignPatch(
      patchJson(`http://localhost/api/admin/campaigns/${id}`, {
        discountBasisPoints: 2000,
      }, { cookie }),
      { params: Promise.resolve({ id: String(id) }) }
    );
    assert.equal(frozen.status, 400);

    // The kill-switch works.
    const disabled = await campaignPatch(
      patchJson(`http://localhost/api/admin/campaigns/${id}`, { enabled: false }, { cookie }),
      { params: Promise.resolve({ id: String(id) }) }
    );
    assert.equal(disabled.status, 200);
    const disabledBody = (await disabled.json()) as {
      campaign: { status: string; enabled: boolean };
    };
    assert.equal(disabledBody.campaign.enabled, false);
    assert.equal(disabledBody.campaign.status, "disabled");

    // Malformed campaign payloads never write.
    const malformed = await campaignsPost(
      postJson(
        "http://localhost/api/admin/campaigns",
        { name: "AB", discountBasisPoints: 0 },
        { cookie }
      )
    );
    assert.equal(malformed.status, 400);
  });

  it("unknown campaign ids 404", async () => {
    await seedAdmin();
    const cookie = await loginCookie();
    const response = await campaignPatch(
      patchJson("http://localhost/api/admin/campaigns/999", { enabled: false }, { cookie }),
      { params: Promise.resolve({ id: "999" }) }
    );
    assert.equal(response.status, 404);
  });
});
