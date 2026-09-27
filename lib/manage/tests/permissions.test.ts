import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canBurnFrom,
  canBurnOwn,
  isTokenOwner,
  ownerActions,
  unavailableReason,
  type AuthorityInput,
} from "../permissions";

const OWNER = "0x1111111111111111111111111111111111111111" as `0x${string}`;
const ALICE = "0x2222222222222222222222222222222222222222" as `0x${string}`;

function fullCaps() {
  return {
    burnable: true,
    mintable: true,
    pausable: true,
    blacklistEnabled: true,
    whitelistEnabled: true,
    tradingEnabled: true,
    autoLiquidityEnabled: true,
    antiBotEnabled: true,
    tradingLaunched: false,
  };
}

function input(overrides: Partial<AuthorityInput> = {}): AuthorityInput {
  return {
    kind: "own-v1",
    connected: OWNER,
    owner: OWNER,
    capabilities: fullCaps(),
    ...overrides,
  };
}

describe("manage permissions", () => {
  it("owner comparison is case-insensitive and null-safe", () => {
    assert.equal(isTokenOwner(OWNER, OWNER.toUpperCase() as `0x${string}`), true);
    assert.equal(isTokenOwner(null, OWNER), false);
    assert.equal(isTokenOwner(OWNER, null), false);
    assert.equal(isTokenOwner(ALICE, OWNER), false);
  });

  it("owner gets the full gated action set", () => {
    const actions = ownerActions(input());
    for (const id of [
      "mint", "pause", "unpause", "blacklistAdd", "whitelistAdd",
      "whitelistEnforce", "feeExemptAdd", "marketingChange",
      "pairAdd", "pairRemove", "swapBackToggle", "enableTrading",
      "transferOwnership", "renounceOwnership",
    ] as const) {
      assert.ok(actions.includes(id), id);
    }
  });

  it("capability flags gate their actions", () => {
    const noMint = ownerActions(input({ capabilities: { ...fullCaps(), mintable: false } }));
    assert.ok(!noMint.includes("mint"));
    const noLists = ownerActions(
      input({ capabilities: { ...fullCaps(), blacklistEnabled: false, whitelistEnabled: false } })
    );
    assert.ok(!noLists.includes("blacklistAdd"));
    assert.ok(!noLists.includes("whitelistAdd"));
    const noTrading = ownerActions(input({ capabilities: { ...fullCaps(), tradingEnabled: false } }));
    assert.ok(!noTrading.includes("marketingChange"));
    assert.ok(!noTrading.includes("feeExemptAdd"));
    const noAutoLiq = ownerActions(
      input({ capabilities: { ...fullCaps(), autoLiquidityEnabled: false } })
    );
    assert.ok(!noAutoLiq.includes("swapBackToggle"));
  });

  it("enableTrading disappears once launched (one-way UX)", () => {
    assert.ok(ownerActions(input()).includes("enableTrading"));
    assert.ok(!ownerActions(input({ capabilities: { ...fullCaps(), tradingLaunched: true } })).includes("enableTrading"));
    assert.ok(!ownerActions(input({ capabilities: { ...fullCaps(), antiBotEnabled: false } })).includes("enableTrading"));
  });

  it("non-owners and external tokens get nothing owner-gated", () => {
    assert.deepEqual(ownerActions(input({ connected: ALICE })), []);
    assert.deepEqual(ownerActions(input({ connected: null })), []);
    assert.deepEqual(ownerActions(input({ kind: "external" })), []);
    assert.deepEqual(ownerActions(input({ kind: "unsupported" })), []);
  });

  it("burn is holder-available; burnFrom needs the capability", () => {
    assert.equal(canBurnOwn(input()), true);
    assert.equal(canBurnFrom(input()), true);
    assert.equal(canBurnOwn(input({ connected: ALICE })), true);
    assert.equal(canBurnOwn(input({ capabilities: { ...fullCaps(), burnable: false } })), false);
    assert.equal(canBurnOwn(input({ kind: "external" })), false);
  });

  it("unavailable reasons explain without leaking", () => {
    assert.match(unavailableReason(input({ kind: "external" }), "mint") ?? "", /BNBTokenMaker/);
    assert.match(unavailableReason(input({ connected: null }), "mint") ?? "", /Connect/);
    assert.match(unavailableReason(input({ connected: ALICE }), "mint") ?? "", /owner/);
    assert.match(
      unavailableReason(input({ capabilities: { ...fullCaps(), mintable: false } }), "mint") ?? "",
      /not enabled/
    );
    assert.equal(unavailableReason(input(), "mint"), null);
  });
});
