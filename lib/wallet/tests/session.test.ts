import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  accountPresent,
  clearProviderSession,
  confirmUserSelection,
  ensureSessionFromConnection,
  getProviderSession,
  isSessionProviderLive,
  normalizeAccountList,
  ProviderAccountMismatchError,
  ProviderSessionMismatchError,
  ProviderSessionMissingError,
  reconcileSessionOnConnectionChange,
  recordUserSelection,
  resetSessionStateForTests,
  verifyProviderSession,
} from "../session";
import {
  classifyWalletNetwork,
  walletDeploymentEligibility,
} from "../network";
import {
  parseChainId,
  resolveAuthoritativeChainId,
  WalletProviderUnavailableError,
} from "../switch";

const ACCOUNT_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ACCOUNT_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const BASE_HEX = "0x2105"; // 8453
const BSC_HEX = "0x38"; // 56
const ETH_HEX = "0x1"; // 1

type RequestLog = { method: string; params?: unknown };

/** Read-only fake EIP-1193 provider: answers accounts + chain, mutates nothing. */
function makeProvider(chainHex: string, accounts: string[]) {
  const requests: RequestLog[] = [];
  const state = { requests, chainHex, accounts: [...accounts] };
  const provider = {
    ...state,
    async request(args: { method: string; params?: unknown }): Promise<unknown> {
      requests.push({ method: args.method, params: args.params });
      if (args.method === "eth_accounts") return [...state.accounts];
      if (args.method === "eth_chainId") return state.chainHex;
      throw { code: -32601, message: "Method not found." };
    },
  };
  return provider;
}

function makeConnector(
  provider: unknown,
  overrides?: { uid?: string; id?: string; rdns?: string }
) {
  return {
    uid: overrides?.uid ?? "io.metamask-uid",
    id: overrides?.id ?? "io.metamask",
    rdns: overrides?.rdns ?? "io.metamask",
    getProvider: async () => provider,
  };
}

beforeEach(() => {
  resetSessionStateForTests();
});

describe("lib/wallet — provider session identity", () => {
  it("record + confirm pins the exact provider object selected", async () => {
    const provider = makeProvider(BASE_HEX, [ACCOUNT_A]);
    const connector = makeConnector(provider);
    await recordUserSelection(connector);
    const session = confirmUserSelection(connector, [ACCOUNT_A]);
    assert.equal(session.boundAt, "user-select");
    assert.equal(session.address, ACCOUNT_A.toLowerCase());
    assert.ok(session.providerRef === provider);
    assert.equal(getProviderSession(), session);
  });

  it("duplicate announcements: same rdns but different object fails closed", async () => {
    const visible = makeProvider(BASE_HEX, [ACCOUNT_A]);
    const duplicate = makeProvider(BASE_HEX, [ACCOUNT_A]);
    await recordUserSelection(makeConnector(visible));
    confirmUserSelection(makeConnector(visible), [ACCOUNT_A]);
    // A re-instantiated connector (or a duplicate announcement winning the
    // id) now exposes a DIFFERENT object: identity check must fail before
    // any request is sent to the impostor.
    await assert.rejects(
      () =>
        verifyProviderSession(makeConnector(duplicate), {
          expectedAddress: ACCOUNT_A,
        }),
      ProviderSessionMismatchError
    );
    assert.equal(duplicate.requests.length, 0);
    assert.equal(
      classifyWalletNetwork(true, resolveAuthoritativeChainId(null)),
      "disconnected"
    );
  });

  it("connector re-instantiation is detected before any state is trusted", async () => {
    const selected = makeProvider(BASE_HEX, [ACCOUNT_A]);
    const reinstantiated = makeProvider(BASE_HEX, [ACCOUNT_A]);
    let calls = 0;
    const rotating = {
      uid: "io.metamask-uid",
      id: "io.metamask",
      rdns: "io.metamask",
      getProvider: async () => (calls++ === 0 ? selected : reinstantiated),
    };
    await recordUserSelection(rotating);
    confirmUserSelection(rotating, [ACCOUNT_A]);
    // The second resolution hands back a different object: verification must
    // fail closed without trusting the rotated provider.
    await assert.rejects(
      () => verifyProviderSession(rotating, { expectedAddress: ACCOUNT_A }),
      ProviderSessionMismatchError
    );
    assert.equal(reinstantiated.requests.length, 0);
  });

  it("confirm without a recorded selection fails closed", () => {
    const provider = makeProvider(BASE_HEX, [ACCOUNT_A]);
    assert.throws(
      () => confirmUserSelection(makeConnector(provider), [ACCOUNT_A]),
      ProviderSessionMissingError
    );
    assert.equal(getProviderSession(), null);
  });

  it("isSessionProviderLive tracks the exact pinned object", async () => {
    const provider = makeProvider(BASE_HEX, [ACCOUNT_A]);
    const connector = makeConnector(provider);
    assert.equal(await isSessionProviderLive(connector), false);
    await recordUserSelection(connector);
    confirmUserSelection(connector, [ACCOUNT_A]);
    assert.equal(await isSessionProviderLive(connector), true);
    // Same uid, rotated object => no longer live (superseded).
    const rotated = makeProvider(BASE_HEX, [ACCOUNT_A]);
    assert.equal(
      await isSessionProviderLive(makeConnector(rotated)),
      false
    );
    // Different uid => not live even with the same object.
    assert.equal(
      await isSessionProviderLive(makeConnector(provider, { uid: "other" })),
      false
    );
    void rotated;
  });
});

describe("lib/wallet — session account verification", () => {
  it("account mismatch fails closed even when the chain matches", async () => {
    const provider = makeProvider(BSC_HEX, [ACCOUNT_B]);
    const connector = makeConnector(provider);
    await recordUserSelection(connector);
    confirmUserSelection(connector, [ACCOUNT_A]);
    await assert.rejects(
      () => verifyProviderSession(connector, { expectedAddress: ACCOUNT_A }),
      ProviderAccountMismatchError
    );
  });

  it("accountsChanged away from the expected account invalidates the session", () => {
    assert.equal(accountPresent([ACCOUNT_A.toLowerCase()], ACCOUNT_A), true);
    assert.equal(accountPresent([ACCOUNT_B.toLowerCase()], ACCOUNT_A), false);
    assert.equal(accountPresent([], ACCOUNT_A), false);
    clearProviderSession();
    assert.equal(getProviderSession(), null);
  });

  it("normalizeAccountList lowercases, validates and dedupes", () => {
    assert.deepEqual(normalizeAccountList([ACCOUNT_A, ACCOUNT_A.toLowerCase()]), [
      ACCOUNT_A.toLowerCase(),
    ]);
    assert.deepEqual(normalizeAccountList(["0x123", null, 42]), []);
  });

  it("unavailable provider fails closed with a typed error", async () => {
    const broken = {
      uid: "io.metamask-uid",
      id: "io.metamask",
      getProvider: async () => {
        throw new Error("no provider");
      },
    };
    await assert.rejects(() => recordUserSelection(broken), Error);
    // With no live chain truth, eligibility stays wrong-network.
    assert.deepEqual(
      walletDeploymentEligibility({
        isConnected: true,
        address: ACCOUNT_A,
        chainId: resolveAuthoritativeChainId(null),
      }),
      { eligible: false, reason: "wrong-network" }
    );
  });

  it("getProviderUnavailable surfaces as WalletProviderUnavailableError", async () => {
    const provider = makeProvider(BASE_HEX, [ACCOUNT_A]);
    const connector = makeConnector(provider);
    await recordUserSelection(connector);
    confirmUserSelection(connector, [ACCOUNT_A]);
    const dead = makeConnector(provider);
    (dead as { getProvider: unknown }).getProvider = async () => {
      throw new Error("gone");
    };
    await assert.rejects(
      () => verifyProviderSession(dead, { expectedAddress: ACCOUNT_A }),
      WalletProviderUnavailableError
    );
  });
});

describe("lib/wallet — manual observation (no chain mutation)", () => {
  it("observing a decoy provider never touches it beyond reads", async () => {
    const selected = makeProvider(BASE_HEX, [ACCOUNT_A]);
    const decoy = makeProvider(BSC_HEX, [ACCOUNT_A]);
    const connector = makeConnector(selected);
    await recordUserSelection(connector);
    confirmUserSelection(connector, [ACCOUNT_A]);
    // The decoy already reports 56, but only the SELECTED provider is read.
    const verified = await verifyProviderSession(connector, {
      expectedAddress: ACCOUNT_A,
    });
    assert.equal(verified.chainId, 8453);
    assert.equal(classifyWalletNetwork(true, verified.chainId), "wrong");
    assert.equal(decoy.requests.length, 0);
    for (const entry of selected.requests) {
      assert.ok(
        entry.method === "eth_accounts" || entry.method === "eth_chainId"
      );
    }
  });

  it("live Ethereum with cached 56 resolves to Wrong, never connected", () => {
    const chainId = resolveAuthoritativeChainId(parseChainId(ETH_HEX));
    assert.equal(chainId, 1);
    assert.equal(classifyWalletNetwork(true, chainId), "wrong");
    assert.deepEqual(
      walletDeploymentEligibility({
        isConnected: true,
        address: ACCOUNT_A,
        chainId,
      }),
      { eligible: false, reason: "wrong-network" }
    );
  });
});

describe("lib/wallet — session lifecycle vs connection state", () => {
  it("any observed disconnect drops the pinned session", async () => {
    const provider = makeProvider(BASE_HEX, [ACCOUNT_A]);
    const connector = makeConnector(provider);
    await recordUserSelection(connector);
    confirmUserSelection(connector, [ACCOUNT_A]);
    assert.ok(getProviderSession() !== null);
    // Wallet-side disconnect (e.g. wallet emits `disconnect` on a network
    // change) must invalidate the session: no later render may derive truth
    // from the stale pre-disconnect provider.
    assert.equal(reconcileSessionOnConnectionChange(false), true);
    assert.equal(getProviderSession(), null);
    assert.equal(reconcileSessionOnConnectionChange(false), false);
  });

  it("connected state retains the pinned session", async () => {
    const provider = makeProvider(BASE_HEX, [ACCOUNT_A]);
    const connector = makeConnector(provider);
    await recordUserSelection(connector);
    const session = confirmUserSelection(connector, [ACCOUNT_A]);
    assert.equal(reconcileSessionOnConnectionChange(true), false);
    assert.equal(getProviderSession(), session);
  });

  it("binds the live provider when it holds the expected account", async () => {
    const provider = makeProvider(BASE_HEX, [ACCOUNT_A]);
    const session = await ensureSessionFromConnection(
      makeConnector(provider),
      ACCOUNT_A
    );
    assert.equal(session.boundAt, "observed");
    const verified = await verifyProviderSession(makeConnector(provider), {
      expectedAddress: ACCOUNT_A,
    });
    assert.equal(verified.chainId, 8453);
  });

  it("refuses to bind when the account does not match", async () => {
    const provider = makeProvider(BSC_HEX, [ACCOUNT_B]);
    await assert.rejects(
      () => ensureSessionFromConnection(makeConnector(provider), ACCOUNT_A),
      ProviderAccountMismatchError
    );
    assert.equal(getProviderSession(), null);
  });
});
