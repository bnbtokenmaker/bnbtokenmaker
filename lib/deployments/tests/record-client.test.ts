import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { requestDeploymentRecord } from "../../deploy/record-client";

const TX =
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as `0x${string}`;

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("deploy record client — best-effort persistence contract", () => {
  it("POSTs only { chainId, txHash } and resolves true on success", async () => {
    let seenUrl = "";
    let seenBody: unknown = null;
    globalThis.fetch = (async (url: unknown, init: unknown) => {
      seenUrl = String(url);
      seenBody = JSON.parse(
        (init as { body: string }).body as string
      ) as unknown;
      return new Response(JSON.stringify({ ok: true }), { status: 201 });
    }) as typeof fetch;

    assert.equal(await requestDeploymentRecord(TX), true);
    assert.equal(seenUrl, "/api/deployments/record");
    assert.deepEqual(seenBody, { chainId: 97, txHash: TX });
  });

  it("DB/record failure resolves false — NEVER throws into the deploy flow", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { code: "unavailable" } }), {
        status: 503,
      })) as typeof fetch;
    assert.equal(await requestDeploymentRecord(TX), false);

    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    assert.equal(await requestDeploymentRecord(TX), false);
  });

  it("performs no wallet interaction (single fetch, no eth_* calls)", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    await requestDeploymentRecord(TX);
    assert.equal(calls, 1);
  });
});
