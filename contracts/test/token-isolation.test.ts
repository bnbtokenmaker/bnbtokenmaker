import { expect } from "chai";
import hre from "hardhat";
import { parseEther, parseUnits } from "viem";
import {
  accounts,
  baseConfig,
  deployFactory,
  deployToken,
  expectRevert,
  tokenAs,
} from "./helpers";

const M = (v: string) => parseUnits(v, 18);

/** Battery G — platform addresses hold zero token authority. */
describe("BNBTokenMakerToken — platform isolation", () => {
  async function platformScenario() {
    const { clients, owner, alice, bob, carol } = await accounts();
    // Distinct platform roles: factory owner/signer, fee recipient, stranger.
    const platformOwner = bob;
    const signer = carol;
    const feeRecipient = clients[4];
    const stranger = clients[6];
    const factory = await deployFactory(
      feeRecipient.account.address,
      signer.account.address,
      parseEther("5")
    );
    // Customer token deployed directly (factory path covered in factory.test).
    const token = await deployToken(
      baseConfig(owner.account.address, {
        burnable: true,
        mintable: true,
        pausable: true,
        blacklistEnabled: true,
        whitelistEnabled: true,
        maxTxAmount: M("1000"),
        maxWalletAmount: M("10000"),
        buyTaxBps: 100,
        sellTaxBps: 100,
        marketingWallet: alice.account.address,
        marketingShareBps: 10000,
        liquidityShareBps: 0,
        antiBotEnabled: true,
        snipeBlocks: 5n,
      })
    );
    return { owner, alice, platformOwner, signer, feeRecipient, stranger, factory, token };
  }

  it("platform roles cannot mint/pause/list/exempt/reconfigure", async () => {
    const s = await platformScenario();
    for (const platform of [s.platformOwner, s.signer, s.feeRecipient, s.stranger]) {
      const asPlatform = await tokenAs(s.token.address, platform);
      await expectRevert(
        asPlatform.write.mint([platform.account.address, M("1")]),
        /OwnableUnauthorizedAccount/
      );
      await expectRevert(asPlatform.write.pause(), /OwnableUnauthorizedAccount/);
      await expectRevert(
        asPlatform.write.setBlacklisted([s.alice.account.address, true]),
        /OwnableUnauthorizedAccount/
      );
      await expectRevert(
        asPlatform.write.setWhitelisted([s.alice.account.address, true]),
        /OwnableUnauthorizedAccount/
      );
      await expectRevert(
        asPlatform.write.setFeeExempt([platform.account.address, true]),
        /OwnableUnauthorizedAccount/
      );
      await expectRevert(
        asPlatform.write.setMarketingWallet([platform.account.address]),
        /OwnableUnauthorizedAccount/
      );
      await expectRevert(
        asPlatform.write.setAMMPair([platform.account.address, true]),
        /OwnableUnauthorizedAccount/
      );
      await expectRevert(asPlatform.write.setSwapBackEnabled([false]), /OwnableUnauthorizedAccount/);
      await expectRevert(asPlatform.write.enableTrading(), /OwnableUnauthorizedAccount/);
      await expectRevert(
        asPlatform.write.transferOwnership([platform.account.address]),
        /OwnableUnauthorizedAccount/
      );
    }
  });

  it("tax/marketing/liquidity parameters are immutable (no setter exists)", async () => {
    const s = await platformScenario();
    const names = s.token.abi
      .filter((e) => (e as { type: string }).type === "function")
      .map((e) => (e as { name: string }).name);
    for (const setter of [
      "setBuyTax",
      "setSellTax",
      "setTax",
      "setSwapThreshold",
      "setLiquidityShare",
      "setMarketingShare",
      "setSnipeBlocks",
      "setMaxSupply",
      "setMaxTx",
      "setMaxWallet",
      "withdraw",
      "withdrawBNB",
      "withdrawLP",
      "rescueTokens",
      "permit",
    ]) {
      expect(names).to.not.include(setter);
    }
    // Immutable values read back as deployed.
    expect(await s.token.read.buyTaxBps()).to.equal(100n);
    expect(await s.token.read.sellTaxBps()).to.equal(100n);
    expect(await s.token.read.snipeBlocks()).to.equal(5n);
  });

  it("factory contract holds no token role and cannot seize ownership", async () => {
    const s = await platformScenario();
    expect((await s.token.read.owner()).toLowerCase()).to.not.equal(
      s.factory.address.toLowerCase()
    );
    // No function on the token accepts the factory as authority: the only
    // factory reference is the informational FACTORY lineage getter.
    expect(await s.token.read.FACTORY()).to.not.equal(
      "0x0000000000000000000000000000000000000000"
    );
  });

  it("customer owner retains full control (platform cannot interfere)", async () => {
    const s = await platformScenario();
    await s.token.write.mint([s.alice.account.address, M("10")]);
    await s.token.write.pause();
    await s.token.write.unpause();
    await s.token.write.setFeeExempt([s.alice.account.address, true]);
    await s.token.write.enableTrading();
    expect(await s.token.read.tradingEnabled()).to.equal(true);
    void hre;
  });
});
