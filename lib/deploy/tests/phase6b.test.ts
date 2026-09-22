import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertPhase6bAccount,
  assertPhase6bChain,
  assertPhase6bConnection,
  assertPhase6bPreTransaction,
  assertPhase6bZeroFee,
  PHASE6B_CHAIN_ID,
  Phase6bDeploymentError,
} from "../phase6b";

const DEPLOYER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function expectReason(fn: () => unknown, reason: string) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof Phase6bDeploymentError, "expected Phase6bDeploymentError");
    assert.equal(error.reason, reason);
    return;
  }
  assert.fail("expected Phase6bDeploymentError");
}

describe("phase6b deployment guards", () => {
  it("allows chain 97", () => {
    assert.equal(assertPhase6bChain(97), 97);
    assert.equal(PHASE6B_CHAIN_ID, 97);
  });

  it("rejects mainnet and other chains", () => {
    for (const chain of [56, 1, 8453, 137, 10, 42161]) {
      expectReason(() => assertPhase6bChain(chain), "chain-not-allowed");
    }
  });

  it("rejects unknown/missing chain", () => {
    expectReason(() => assertPhase6bChain(null), "chain-unknown");
    expectReason(() => assertPhase6bChain(undefined), "chain-unknown");
    expectReason(() => assertPhase6bChain(Number.NaN), "chain-unknown");
  });

  it("stale cached 97 can never override a live wrong chain", () => {
    expectReason(() => assertPhase6bChain(56, 97), "stale-chain");
    expectReason(() => assertPhase6bChain(1, 97), "stale-chain");
    expectReason(() => assertPhase6bChain(null, 97), "chain-unknown");
  });

  it("rejects disconnected and missing account", () => {
    expectReason(() => assertPhase6bConnection({ isConnected: false }), "disconnected");
    expectReason(() => assertPhase6bConnection({ isConnected: true }), "no-account");
    expectReason(
      () => assertPhase6bConnection({ isConnected: true, address: "0x123" }),
      "no-account"
    );
  });

  it("rejects account mismatch against live eth_accounts", () => {
    expectReason(() => assertPhase6bAccount(DEPLOYER, []), "account-mismatch");
    expectReason(
      () => assertPhase6bAccount(DEPLOYER, ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8"]),
      "account-mismatch"
    );
    const ok = assertPhase6bAccount(DEPLOYER, [DEPLOYER.toLowerCase()]);
    assert.equal(ok, DEPLOYER.toLowerCase());
  });

  it("rejects nonzero fee (testnet fee is zero)", () => {
    assertPhase6bZeroFee(0n);
    expectReason(() => assertPhase6bZeroFee(50000000000000000n), "nonzero-fee");
  });

  it("pre-transaction gate passes on a clean testnet session", () => {
    const result = assertPhase6bPreTransaction({
      isConnected: true,
      expectedAddress: DEPLOYER,
      liveAccounts: [DEPLOYER],
      liveChainId: 97,
      cachedChainId: 97,
      argsValid: true,
      txValueWei: 0n,
    });
    assert.deepEqual(result, { chainId: 97, deployer: DEPLOYER.toLowerCase() });
  });

  it("pre-transaction gate fails closed on every bad input", () => {
    const good = {
      isConnected: true,
      expectedAddress: DEPLOYER,
      liveAccounts: [DEPLOYER],
      liveChainId: 97 as number | null,
      cachedChainId: 97 as number | null,
      argsValid: true,
      txValueWei: 0n,
    };
    expectReason(() => assertPhase6bPreTransaction({ ...good, isConnected: false }), "disconnected");
    expectReason(() => assertPhase6bPreTransaction({ ...good, liveAccounts: [] }), "account-mismatch");
    expectReason(() => assertPhase6bPreTransaction({ ...good, liveChainId: 56, cachedChainId: 97 }), "stale-chain");
    expectReason(() => assertPhase6bPreTransaction({ ...good, liveChainId: 56, cachedChainId: null }), "chain-not-allowed");
    expectReason(() => assertPhase6bPreTransaction({ ...good, argsValid: false }), "invalid-args");
    expectReason(() => assertPhase6bPreTransaction({ ...good, txValueWei: 1n }), "nonzero-fee");
  });
});
