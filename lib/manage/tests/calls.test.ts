import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keccak256, stringToHex } from "viem";

import {
  burnCall,
  burnFromCall,
  enableTradingCall,
  mintCall,
  pauseCall,
  renounceOwnershipCall,
  setAMMPairCall,
  setBlacklistedCall,
  setFeeExemptCall,
  setMarketingWalletCall,
  setSwapBackEnabledCall,
  setWhitelistEnforcedCall,
  setWhitelistedCall,
  transferOwnershipCall,
  unpauseCall,
} from "../calls";

const TOKEN = "0x1111111111111111111111111111111111111111";
const ALICE = "0x2222222222222222222222222222222222222222";

function selector(signature: string): string {
  return keccak256(stringToHex(signature)).slice(0, 10);
}

describe("manage calldata builders", () => {
  it("encodes the canonical selectors with validated args", () => {
    assert.ok(mintCall(TOKEN, ALICE, 100n).data.startsWith(selector("mint(address,uint256)")));
    assert.ok(burnCall(TOKEN, 100n).data.startsWith(selector("burn(uint256)")));
    assert.ok(burnFromCall(TOKEN, ALICE, 100n).data.startsWith(selector("burnFrom(address,uint256)")));
    assert.ok(pauseCall(TOKEN).data.startsWith(selector("pause()")));
    assert.ok(unpauseCall(TOKEN).data.startsWith(selector("unpause()")));
    assert.ok(
      setBlacklistedCall(TOKEN, ALICE, true).data.startsWith(selector("setBlacklisted(address,bool)"))
    );
    assert.ok(
      setWhitelistedCall(TOKEN, ALICE, false).data.startsWith(selector("setWhitelisted(address,bool)"))
    );
    assert.ok(
      setWhitelistEnforcedCall(TOKEN, true).data.startsWith(selector("setWhitelistEnforced(bool)"))
    );
    assert.ok(
      setFeeExemptCall(TOKEN, ALICE, true).data.startsWith(selector("setFeeExempt(address,bool)"))
    );
    assert.ok(
      setMarketingWalletCall(TOKEN, ALICE).data.startsWith(selector("setMarketingWallet(address)"))
    );
    assert.ok(
      setAMMPairCall(TOKEN, ALICE, true).data.startsWith(selector("setAMMPair(address,bool)"))
    );
    assert.ok(
      setSwapBackEnabledCall(TOKEN, false).data.startsWith(selector("setSwapBackEnabled(bool)"))
    );
    assert.ok(enableTradingCall(TOKEN).data.startsWith(selector("enableTrading()")));
    assert.ok(
      transferOwnershipCall(TOKEN, ALICE).data.startsWith(selector("transferOwnership(address)"))
    );
    assert.ok(renounceOwnershipCall(TOKEN).data.startsWith(selector("renounceOwnership()")));
  });

  it("targets the token address on every call", () => {
    for (const call of [mintCall(TOKEN, ALICE, 1n), pauseCall(TOKEN), renounceOwnershipCall(TOKEN)]) {
      assert.equal(call.to.toLowerCase(), TOKEN.toLowerCase());
    }
  });

  it("rejects malformed inputs fail-closed", () => {
    assert.throws(() => mintCall(TOKEN, ALICE, 0n), /amount/);
    assert.throws(() => mintCall(TOKEN, ALICE, -1n), /amount/);
    assert.throws(() => mintCall("nope", ALICE, 1n), /address/);
    assert.throws(() => mintCall(TOKEN, "0x0000000000000000000000000000000000000000".slice(0, 10), 1n), /address/);
    assert.throws(() => setBlacklistedCall(TOKEN, ALICE, "yes"), /blocked/);
    assert.throws(() => setMarketingWalletCall(TOKEN, "0x123"), /address/);
    assert.throws(() => burnCall(TOKEN, "100"), /amount/);
  });
});
