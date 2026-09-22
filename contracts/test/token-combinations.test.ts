import { expect } from "chai";
import { parseUnits } from "viem";
import {
  accounts,
  baseConfig,
  deployToken,
  expectRevert,
  tokenAs,
} from "./helpers";

const M = (v: string) => parseUnits(v, 18);

/** Every combination the product allows (incl. all-features-on). */
describe("BNBTokenMakerToken — feature combinations", () => {
  it("base only: plain transfers, no restrictions", async () => {
    const { owner, alice, bob } = await accounts();
    const token = await deployToken(baseConfig(owner.account.address));
    await token.write.transfer([alice.account.address, M("100")]);
    const asAlice = await tokenAs(token.address, alice);
    await asAlice.write.transfer([bob.account.address, M("100")]);
    expect(await token.read.balanceOf([bob.account.address])).to.equal(M("100"));
  });

  it("mint + pause: mint blocked while paused, works after unpause", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, { mintable: true, pausable: true })
    );
    await token.write.pause();
    await expectRevert(
      token.write.mint([alice.account.address, M("1")]),
      /EnforcedPause/
    );
    await token.write.unpause();
    await token.write.mint([alice.account.address, M("1")]);
    expect(await token.read.balanceOf([alice.account.address])).to.equal(M("1"));
  });

  it("maxTx + maxWallet: both enforced on the same transfer", async () => {
    const { owner, alice, bob } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, {
        maxTxAmount: M("1000"),
        maxWalletAmount: M("1000"),
      })
    );
    await token.write.transfer([alice.account.address, M("1000")]);
    // Wallet full -> any further credit reverts.
    await expectRevert(
      token.write.transfer([alice.account.address, M("1")]),
      /MaxWalletExceeded/
    );
    const asAlice = await tokenAs(token.address, alice);
    // Over maxTx reverts even with room on the other side.
    await expectRevert(
      asAlice.write.transfer([bob.account.address, M("1001")]),
      /MaxTxExceeded/
    );
    // Within both limits succeeds.
    await asAlice.write.transfer([bob.account.address, M("400")]);
    await asAlice.write.transfer([bob.account.address, M("400")]);
  });

  it("blacklist + whitelist: blacklist wins, whitelist still gates others", async () => {
    const { owner, alice, bob } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, {
        blacklistEnabled: true,
        whitelistEnabled: true,
      })
    );
    await token.write.transfer([alice.account.address, M("100")]);
    await token.write.setWhitelisted([alice.account.address, true]);
    await token.write.setWhitelisted([bob.account.address, true]);
    await token.write.setWhitelistEnforced([true]);
    const asAlice = await tokenAs(token.address, alice);
    await asAlice.write.transfer([bob.account.address, M("10")]);
    // Blacklisting alice now blocks her even though she is whitelisted.
    await token.write.setBlacklisted([alice.account.address, true]);
    await expectRevert(
      asAlice.write.transfer([bob.account.address, M("1")]),
      /Blacklisted/
    );
    // Bob (whitelisted, not blacklisted) can still send to owner.
    const asBob = await tokenAs(token.address, bob);
    await asBob.write.transfer([owner.account.address, M("1")]);
  });

  it("burn + pause: burn blocked while paused, works after unpause", async () => {
    const { owner } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, { burnable: true, pausable: true })
    );
    await token.write.pause();
    await expectRevert(token.write.burn([M("1")]), /EnforcedPause/);
    await token.write.unpause();
    const supplyBefore = await token.read.totalSupply();
    await token.write.burn([M("1")]);
    expect(await token.read.totalSupply()).to.equal(supplyBefore - M("1"));
  });

  it("mint + maxWallet: mint fills to cap, then reverts", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, {
        mintable: true,
        maxWalletAmount: M("500"),
      })
    );
    await token.write.mint([alice.account.address, M("500")]);
    await expectRevert(
      token.write.mint([alice.account.address, M("1")]),
      /MaxWalletExceeded/
    );
    // Owner mint to self is exempt.
    await token.write.mint([owner.account.address, M("1000000")]);
  });

  it("all features enabled: full lifecycle works", async () => {
    const { owner, alice, bob } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, {
        burnable: true,
        mintable: true,
        pausable: true,
        maxTxAmount: M("10000"),
        maxWalletAmount: M("10000"),
        blacklistEnabled: true,
        whitelistEnabled: true,
      })
    );
    // Owner distributes within limits (owner exempt anyway).
    await token.write.transfer([alice.account.address, M("5000")]);
    await token.write.setWhitelisted([alice.account.address, true]);
    await token.write.setWhitelisted([bob.account.address, true]);
    await token.write.setWhitelistEnforced([true]);
    const asAlice = await tokenAs(token.address, alice);
    await asAlice.write.transfer([bob.account.address, M("1000")]);
    // Pause freezes everything.
    await token.write.pause();
    await expectRevert(
      asAlice.write.transfer([bob.account.address, M("1")]),
      /EnforcedPause/
    );
    await token.write.unpause();
    // Owner mints to bob within cap.
    await token.write.mint([bob.account.address, M("1000")]);
    // Bob burns some.
    const asBob = await tokenAs(token.address, bob);
    await asBob.write.burn([M("500")]);
    // Blacklist bob: frozen except burn exit.
    await token.write.setBlacklisted([bob.account.address, true]);
    await expectRevert(
      asBob.write.transfer([alice.account.address, M("1")]),
      /Blacklisted/
    );
    const bobBal = await token.read.balanceOf([bob.account.address]);
    await asBob.write.burn([bobBal]);
    expect(await token.read.balanceOf([bob.account.address])).to.equal(0n);
    expect((await token.read.owner()).toLowerCase()).to.equal(
      owner.account.address.toLowerCase()
    );
  });
});
