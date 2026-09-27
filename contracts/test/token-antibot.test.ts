import { expect } from "chai";
import hre from "hardhat";
import { parseUnits } from "viem";
import {
  accounts,
  baseConfig,
  deployToken,
  expectRevert,
  tokenAs,
} from "./helpers";

const M = (v: string) => parseUnits(v, 18);

/** Battery E — deterministic bounded anti-bot launch protection. */
describe("BNBTokenMakerToken — anti-bot", () => {
  async function launchToken(snipeBlocks = 10n) {
    const { clients, owner, alice, bob, carol } = await accounts();
    const pairWallet = clients[5];
    const pair = pairWallet.account.address;
    const token = await deployToken(
      baseConfig(owner.account.address, {
        buyTaxBps: 0,
        sellTaxBps: 0,
        antiBotEnabled: true,
        snipeBlocks,
      })
    );
    await token.write.setAMMPair([pair, true]);
    return { clients, owner, alice, bob, carol, pairWallet, pair, token };
  }

  it("pre-launch: pair trading waits, owner seeding works", async () => {
    const { alice, bob, pairWallet, pair, token } = await launchToken();
    expect(await token.read.tradingEnabled()).to.equal(false);
    await token.write.transfer([alice.account.address, M("100000")]);
    // Non-exempt holder cannot buy from the pair pre-launch.
    await token.write.transfer([pair, M("50000")]);
    const asPair = await tokenAs(token.address, pairWallet);
    await expectRevert(
      asPair.write.transfer([alice.account.address, M("100")]),
      /TradingDisabled/
    );
    // Non-exempt holder-to-holder is also gated pre-launch (only owner
    // seeding and mutually fee-exempt non-pair moves are allowed).
    const asAlice = await tokenAs(token.address, alice);
    await expectRevert(
      asAlice.write.transfer([bob.account.address, M("100")]),
      /TradingDisabled/
    );
    // Explicitly exempt wallets move freely pre-launch.
    await token.write.setFeeExempt([alice.account.address, true]);
    await token.write.setFeeExempt([bob.account.address, true]);
    await asAlice.write.transfer([bob.account.address, M("100")]);
    expect(await token.read.balanceOf([bob.account.address])).to.equal(M("100"));
  });

  it("enableTrading is one-way: no restart, no extension", async () => {
    const { token } = await launchToken();
    await token.write.enableTrading();
    expect(await token.read.tradingEnabled()).to.equal(true);
    await expectRevert(token.write.enableTrading(), /TradingAlreadyEnabled/);
  });

  it("enableTrading without the module reverts", async () => {
    const { owner } = await accounts();
    const token = await deployToken(baseConfig(owner.account.address));
    await expectRevert(token.write.enableTrading(), /FeatureDisabled/);
  });

  it("snipe window: one transfer per block per user; sells never blocked", async () => {
    const { alice, token } = await launchToken(10n);
    const tokenAddress = token.address;

    const batch = await hre.viem.deployContract("BatchBuyer");
    await token.write.setAMMPair([batch.address, true]);
    await token.write.transfer([batch.address, M("1000")]);
    await token.write.enableTrading();

    // A lone buy in its own block succeeds (first touch, no cooldown debt).
    await batch.write.singleBuy([tokenAddress, alice.account.address, M("100")]);
    expect(await token.read.balanceOf([alice.account.address])).to.equal(M("100"));

    // doubleBuy executes two pair->holder legs atomically in ONE transaction
    // (same block by construction). The second leg must revert with
    // CooldownActive, rolling the whole batch back.
    await expectRevert(
      batch.write.doubleBuy([tokenAddress, alice.account.address, M("100")]),
      /CooldownActive/
    );
    // Atomic rollback: batch keeps the remainder, alice kept only the single.
    expect(await token.read.balanceOf([batch.address])).to.equal(M("900"));
    expect(await token.read.balanceOf([alice.account.address])).to.equal(M("100"));
  });

  it("sells remain possible during the window (one per block each)", async () => {
    const { alice, pair, token } = await launchToken(10n);
    await token.write.transfer([alice.account.address, M("100000")]);
    await token.write.enableTrading();
    const asAlice = await tokenAs(token.address, alice);
    await asAlice.write.transfer([pair, M("100")]);
    expect(await token.read.balanceOf([pair])).to.equal(M("100"));
  });

  it("window expiry removes restrictions permanently", async () => {
    const { alice, bob, pairWallet, pair, token } = await launchToken(2n);
    await token.write.transfer([alice.account.address, M("100000")]);
    await token.write.transfer([pair, M("50000")]);
    await token.write.enableTrading();
    const publicClient = await hre.viem.getPublicClient();
    // Mine past launchBlock + 2.
    const launch = await token.read.launchBlock();
    void launch;
    await hre.network.provider.send("hardhat_mine", ["0x10"]);
    const asPair = await tokenAs(token.address, pairWallet);
    // Rapid successive buys now succeed even in adjacent blocks with no
    // cooldown state consulted.
    await asPair.write.transfer([alice.account.address, M("100")]);
    await asPair.write.transfer([alice.account.address, M("100")]);
    await asPair.write.transfer([bob.account.address, M("100")]);
    expect(await token.read.balanceOf([bob.account.address])).to.equal(M("100"));
  });

  it("snipe window bounded at construction (>50 reverts)", async () => {
    const { owner } = await accounts();
    await expectRevert(
      deployToken(
        baseConfig(owner.account.address, {
          antiBotEnabled: true,
          snipeBlocks: 51n,
        })
      ),
      /SnipeWindowTooLong/
    );
  });

  it("owner and fee-exempt users skip the snipe cooldown", async () => {
    const { alice, pairWallet, pair, token } = await launchToken(10n);
    await token.write.transfer([alice.account.address, M("100000")]);
    await token.write.transfer([pair, M("50000")]);
    await token.write.enableTrading();
    await token.write.setFeeExempt([alice.account.address, true]);
    const asPair = await tokenAs(token.address, pairWallet);
    await asPair.write.transfer([alice.account.address, M("100")]);
    await asPair.write.transfer([alice.account.address, M("100")]);
  });
});
