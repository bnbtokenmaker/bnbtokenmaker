import { expect } from "chai";
import { parseUnits, zeroAddress } from "viem";
import {
  accounts,
  baseConfig,
  deployToken,
  expectRevert,
  tokenAs,
} from "./helpers";

const M = (v: string) => parseUnits(v, 18);

describe("BNBTokenMakerToken — individual features", () => {
  describe("burn", () => {
    it("holder burn reduces balance and totalSupply", async () => {
      const { owner, alice } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { burnable: true })
      );
      await token.write.transfer([alice.account.address, M("1000")]);
      const asAlice = await tokenAs(token.address, alice);
      const supplyBefore = await token.read.totalSupply();
      await asAlice.write.burn([M("400")]);
      expect(await token.read.balanceOf([alice.account.address])).to.equal(
        M("600")
      );
      expect(await token.read.totalSupply()).to.equal(supplyBefore - M("400"));
    });

    it("burnFrom honors allowance", async () => {
      const { owner, alice, bob } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { burnable: true })
      );
      await token.write.transfer([alice.account.address, M("100")]);
      const asAlice = await tokenAs(token.address, alice);
      await asAlice.write.approve([bob.account.address, M("40")]);
      const asBob = await tokenAs(token.address, bob);
      await asBob.write.burnFrom([alice.account.address, M("40")]);
      expect(await token.read.balanceOf([alice.account.address])).to.equal(
        M("60")
      );
    });

    it("burn beyond balance reverts; zero burn reverts", async () => {
      const { owner, alice } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { burnable: true })
      );
      const asAlice = await tokenAs(token.address, alice);
      await expectRevert(
        asAlice.write.burn([M("1")]),
        /balance|insufficient/i
      );
      await expectRevert(token.write.burn([0n]), /ZeroBurnAmount/);
    });
  });

  describe("mint", () => {
    it("owner mint increases supply; balance credited", async () => {
      const { owner, alice } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { mintable: true })
      );
      const supplyBefore = await token.read.totalSupply();
      await token.write.mint([alice.account.address, M("500")]);
      expect(await token.read.balanceOf([alice.account.address])).to.equal(
        M("500")
      );
      expect(await token.read.totalSupply()).to.equal(supplyBefore + M("500"));
    });

    it("non-owner mint reverts (unauthorized mint)", async () => {
      const { owner, alice, bob } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { mintable: true })
      );
      const asAlice = await tokenAs(token.address, alice);
      await expectRevert(
        asAlice.write.mint([bob.account.address, M("1")]),
        /OwnableUnauthorized|not.*owner|unauthorized/i
      );
    });

    it("mint to zero address and zero amount revert", async () => {
      const { owner, alice } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { mintable: true })
      );
      await expectRevert(
        token.write.mint([zeroAddress, M("1")]),
        /ZeroAddress/
      );
      await expectRevert(
        token.write.mint([alice.account.address, 0n]),
        /ZeroMintAmount/
      );
    });
  });

  describe("pause", () => {
    it("owner pause blocks transfers; unpause restores", async () => {
      const { owner, alice } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { pausable: true })
      );
      await token.write.pause();
      expect(await token.read.paused()).to.equal(true);
      await expectRevert(
        token.write.transfer([alice.account.address, M("1")]),
        /EnforcedPause/
      );
      await token.write.unpause();
      expect(await token.read.paused()).to.equal(false);
      await token.write.transfer([alice.account.address, M("1")]);
      expect(await token.read.balanceOf([alice.account.address])).to.equal(
        M("1")
      );
    });

    it("non-owner pause/unpause reverts (unauthorized pause)", async () => {
      const { owner, alice } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { pausable: true })
      );
      const asAlice = await tokenAs(token.address, alice);
      await expectRevert(
        asAlice.write.pause(),
        /OwnableUnauthorized|unauthorized/i
      );
      await expectRevert(
        asAlice.write.unpause(),
        /OwnableUnauthorized|unauthorized/i
      );
    });

    it("pause blocks mint and burn too (documented semantics)", async () => {
      const { owner, alice } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, {
          burnable: true,
          mintable: true,
          pausable: true,
        })
      );
      await token.write.pause();
      await expectRevert(
        token.write.mint([alice.account.address, M("1")]),
        /EnforcedPause/
      );
      await expectRevert(token.write.burn([M("1")]), /EnforcedPause/);
    });
  });

  describe("maxTx", () => {
    const maxTx = M("1000");
    async function maxTxToken() {
      const { owner, alice, bob, carol } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { maxTxAmount: maxTx })
      );
      return { owner, alice, bob, carol, token };
    }

    it("transfer at/below limit succeeds; above reverts", async () => {
      const { alice, bob, token } = await maxTxToken();
      await token.write.transfer([alice.account.address, maxTx]);
      const asAlice = await tokenAs(token.address, alice);
      await asAlice.write.transfer([bob.account.address, maxTx]);
      await expectRevert(
        asAlice.write.transfer([bob.account.address, maxTx + 1n]),
        /MaxTxExceeded/
      );
    });

    it("owner is exempt as sender and recipient", async () => {
      const { owner, alice, bob, token } = await maxTxToken();
      // Owner sends far above the limit to fund alice, then alice -> owner (exempt recipient).
      await token.write.transfer([alice.account.address, M("5000")]);
      const asAlice = await tokenAs(token.address, alice);
      await asAlice.write.transfer([owner.account.address, M("5000")]);
      await token.write.transfer([bob.account.address, M("5000")]);
    });

    it("non-owner large transfer between users reverts even with balance", async () => {
      const { alice, bob, token } = await maxTxToken();
      await token.write.transfer([alice.account.address, M("5000")]);
      await token.write.transfer([bob.account.address, maxTx]);
      const asAlice = await tokenAs(token.address, alice);
      await expectRevert(
        asAlice.write.transfer([bob.account.address, maxTx + 1n]),
        /MaxTxExceeded/
      );
    });
  });

  describe("maxWallet", () => {
    const cap = M("2000");
    it("recipient up to cap succeeds; exceeding reverts", async () => {
      const { owner, alice, bob } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { maxWalletAmount: cap })
      );
      await token.write.transfer([alice.account.address, cap]);
      await expectRevert(
        token.write.transfer([alice.account.address, M("1")]),
        /MaxWalletExceeded/
      );
      // A different recipient still has room.
      await token.write.transfer([bob.account.address, M("1")]);
    });

    it("owner recipient is exempt (deployment never blocked)", async () => {
      const { owner } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, {
          initialSupply: M("1000000"),
          maxWalletAmount: M("1"),
        })
      );
      expect(await token.read.balanceOf([owner.account.address])).to.equal(
        M("1000000")
      );
    });

    it("mint respects the cap for non-owner recipients", async () => {
      const { owner, alice } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, {
          mintable: true,
          maxWalletAmount: cap,
        })
      );
      await token.write.mint([alice.account.address, cap]);
      await expectRevert(
        token.write.mint([alice.account.address, M("1")]),
        /MaxWalletExceeded/
      );
    });

    it("constructor rejects maxWallet < maxTx", async () => {
      const { owner } = await accounts();
      await expectRevert(
        deployToken(
          baseConfig(owner.account.address, {
            maxTxAmount: M("1000"),
            maxWalletAmount: M("999"),
          })
        ),
        /MaxWalletBelowMaxTx/
      );
    });
  });

  describe("blacklist", () => {
    it("add/remove; blocked sender and recipient revert", async () => {
      const { owner, alice, bob } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { blacklistEnabled: true })
      );
      await token.write.transfer([alice.account.address, M("100")]);
      await token.write.setBlacklisted([alice.account.address, true]);
      expect(await token.read.isBlacklisted([alice.account.address])).to.equal(
        true
      );
      const asAlice = await tokenAs(token.address, alice);
      await expectRevert(
        asAlice.write.transfer([bob.account.address, M("1")]),
        /Blacklisted/
      );
      await expectRevert(
        token.write.transfer([alice.account.address, M("1")]),
        /Blacklisted/
      );
      await token.write.setBlacklisted([alice.account.address, false]);
      await token.write.transfer([alice.account.address, M("1")]);
    });

    it("only owner can change the list; zero address rejected", async () => {
      const { owner, alice, bob } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { blacklistEnabled: true })
      );
      const asAlice = await tokenAs(token.address, alice);
      await expectRevert(
        asAlice.write.setBlacklisted([bob.account.address, true]),
        /OwnableUnauthorized|unauthorized/i
      );
      await expectRevert(
        token.write.setBlacklisted([zeroAddress, true]),
        /ZeroAddress/
      );
    });

    it("owner can recover from self-blacklisting (no admin self-lock)", async () => {
      const { owner, alice } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { blacklistEnabled: true })
      );
      await token.write.setBlacklisted([owner.account.address, true]);
      await expectRevert(
        token.write.transfer([alice.account.address, M("1")]),
        /Blacklisted/
      );
      // Management calls are not transfers: the owner can always unblock.
      await token.write.setBlacklisted([owner.account.address, false]);
      await token.write.transfer([alice.account.address, M("1")]);
      expect(await token.read.balanceOf([alice.account.address])).to.equal(
        M("1")
      );
    });

    it("mint to blacklisted recipient reverts; burn from blacklisted stays allowed", async () => {
      const { owner, alice } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, {
          burnable: true,
          mintable: true,
          blacklistEnabled: true,
        })
      );
      await token.write.transfer([alice.account.address, M("10")]);
      await token.write.setBlacklisted([alice.account.address, true]);
      await expectRevert(
        token.write.mint([alice.account.address, M("1")]),
        /Blacklisted/
      );
      const asAlice = await tokenAs(token.address, alice);
      await asAlice.write.burn([M("10")]);
      expect(await token.read.balanceOf([alice.account.address])).to.equal(0n);
    });
  });

  describe("whitelist", () => {
    it("restriction starts OFF: open trading right after deployment", async () => {
      const { owner, alice, bob } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { whitelistEnabled: true })
      );
      expect(await token.read.whitelistEnforced()).to.equal(false);
      await token.write.transfer([alice.account.address, M("100")]);
      const asAlice = await tokenAs(token.address, alice);
      await asAlice.write.transfer([bob.account.address, M("10")]);
    });

    it("owner is auto-whitelisted at construction", async () => {
      const { owner } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { whitelistEnabled: true })
      );
      expect(
        await token.read.isWhitelisted([owner.account.address])
      ).to.equal(true);
    });

    it("when enforced: non-listed transfers revert; listed succeed", async () => {
      const { owner, alice, bob } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { whitelistEnabled: true })
      );
      await token.write.transfer([alice.account.address, M("100")]);
      await token.write.setWhitelistEnforced([true]);
      const asAlice = await tokenAs(token.address, alice);
      // Neither side approved (alice is not listed) -> revert.
      await expectRevert(
        asAlice.write.transfer([bob.account.address, M("1")]),
        /WhitelistEnforced/
      );
      await token.write.setWhitelisted([alice.account.address, true]);
      await token.write.setWhitelisted([bob.account.address, true]);
      await asAlice.write.transfer([bob.account.address, M("1")]);
    });

    it("owner qualifies on its own side; can disable enforcement", async () => {
      const { owner, alice, bob } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { whitelistEnabled: true })
      );
      await token.write.setWhitelistEnforced([true]);
      // Owner -> non-listed reverts: BOTH sides must qualify while enforced.
      await expectRevert(
        token.write.transfer([alice.account.address, M("5")]),
        /WhitelistEnforced/
      );
      // Owner whitelists the recipient first, then sends.
      await token.write.setWhitelisted([alice.account.address, true]);
      await token.write.transfer([alice.account.address, M("5")]);
      // Owner -> owner always qualifies.
      await token.write.transfer([owner.account.address, M("1")]);
      await token.write.setWhitelistEnforced([false]);
      const asAlice = await tokenAs(token.address, alice);
      await asAlice.write.transfer([bob.account.address, M("1")]);
    });

    it("mint to non-listed reverts while enforced; burn stays allowed", async () => {
      const { owner, alice } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, {
          burnable: true,
          mintable: true,
          whitelistEnabled: true,
        })
      );
      await token.write.setWhitelistEnforced([true]);
      await expectRevert(
        token.write.mint([alice.account.address, M("1")]),
        /WhitelistEnforced/
      );
      // Owner whitelists alice, funds her, then alice burns (exit allowed).
      await token.write.setWhitelisted([alice.account.address, true]);
      await token.write.transfer([alice.account.address, M("7")]);
      const asAlice = await tokenAs(token.address, alice);
      await asAlice.write.burn([M("7")]);
    });

    it("only owner manages the list; zero address rejected", async () => {
      const { owner, alice, bob } = await accounts();
      const token = await deployToken(
        baseConfig(owner.account.address, { whitelistEnabled: true })
      );
      const asAlice = await tokenAs(token.address, alice);
      await expectRevert(
        asAlice.write.setWhitelisted([bob.account.address, true]),
        /OwnableUnauthorized|unauthorized/i
      );
      await expectRevert(
        asAlice.write.setWhitelistEnforced([true]),
        /OwnableUnauthorized|unauthorized/i
      );
      await expectRevert(
        token.write.setWhitelisted([zeroAddress, true]),
        /ZeroAddress/
      );
    });
  });
});
