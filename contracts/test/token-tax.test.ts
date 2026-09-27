import { expect } from "chai";
import hre from "hardhat";
import { parseUnits, zeroAddress } from "viem";
import {
  accounts,
  baseConfig,
  deployToken,
  expectRevert,
  tokenAs,
} from "./helpers";

const M = (v: string) => parseUnits(v, 18);
const PAIR = "0x1111111111111111111111111111111111111111" as `0x${string}`;

/** Battery C — buy/sell tax policy, caps, dust, exemptions. */
describe("BNBTokenMakerToken — tax", () => {
  async function taxedToken() {
    const { clients, owner, alice, bob, carol } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, {
        buyTaxBps: 400, // 4%
        sellTaxBps: 600, // 6%
        marketingWallet: carol.account.address,
        marketingShareBps: 10000,
        liquidityShareBps: 0,
      })
    );
    await token.write.setAMMPair([PAIR, true]);
    return { clients, owner, alice, bob, carol, token };
  }

  it("buy taxed (pair -> holder), contract accrues tax", async () => {
    const { clients, alice, token } = await taxedToken();
    // Wallet-backed pair: fund it, then pair -> holder pays 4% buy tax.
    const pairWallet = clients[5];
    const pairAddr = pairWallet.account.address;
    await token.write.setAMMPair([pairAddr, true]);
    await token.write.transfer([pairAddr, M("100000")]);
    const asPair = await tokenAs(token.address, pairWallet);
    await asPair.write.transfer([alice.account.address, M("1000")]);
    // 4% of 1000 = 40 tax: alice nets 960, contract holds 40.
    expect(await token.read.balanceOf([alice.account.address])).to.equal(M("960"));
    expect(await token.read.balanceOf([token.address])).to.equal(M("40"));
  });

  it("sell taxed at 6%: seller 1000 -> pair 940, contract holds 60", async () => {
    const { alice, token } = await taxedToken();
    await token.write.transfer([alice.account.address, M("100000")]);
    const asAlice = await tokenAs(token.address, alice);
    await asAlice.write.transfer([PAIR, M("1000")]);
    expect(await token.read.balanceOf([PAIR])).to.equal(M("940"));
    expect(await token.read.balanceOf([token.address])).to.equal(M("60"));
  });

  it("wallet-to-wallet transfers are untaxed", async () => {
    const { alice, bob, token } = await taxedToken();
    await token.write.transfer([alice.account.address, M("1000")]);
    const asAlice = await tokenAs(token.address, alice);
    await asAlice.write.transfer([bob.account.address, M("1000")]);
    expect(await token.read.balanceOf([bob.account.address])).to.equal(M("1000"));
    expect(await token.read.balanceOf([token.address])).to.equal(0n);
  });

  it("0% tax: pair transfers settle in full", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(baseConfig(owner.account.address));
    await token.write.setAMMPair([PAIR, true]);
    await token.write.transfer([alice.account.address, M("1000")]);
    const asAlice = await tokenAs(token.address, alice);
    await asAlice.write.transfer([PAIR, M("1000")]);
    expect(await token.read.balanceOf([PAIR])).to.equal(M("1000"));
  });

  it("max 10% each side accepted; above reverts at construction", async () => {
    const { owner, carol } = await accounts();
    const ok = await deployToken(
      baseConfig(owner.account.address, {
        buyTaxBps: 1000,
        sellTaxBps: 1000,
        marketingWallet: carol.account.address,
        marketingShareBps: 10000,
        liquidityShareBps: 0,
      })
    );
    expect(await ok.read.buyTaxBps()).to.equal(1000n);
    await expectRevert(
      deployToken(
        baseConfig(owner.account.address, {
          buyTaxBps: 1001,
          sellTaxBps: 0,
          marketingWallet: carol.account.address,
          marketingShareBps: 10000,
          liquidityShareBps: 0,
        })
      ),
      /TaxTooHigh/
    );
    await expectRevert(
      deployToken(
        baseConfig(owner.account.address, {
          buyTaxBps: 0,
          sellTaxBps: 1001,
          marketingWallet: carol.account.address,
          marketingShareBps: 10000,
          liquidityShareBps: 0,
        })
      ),
      /TaxTooHigh/
    );
  });

  it("tax requires marketing wallet and exact 10000bps split", async () => {
    const { owner, carol } = await accounts();
    await expectRevert(
      deployToken(
        baseConfig(owner.account.address, {
          buyTaxBps: 100,
          marketingWallet: zeroAddress,
          marketingShareBps: 10000,
          liquidityShareBps: 0,
        })
      ),
      /MarketingWalletRequired/
    );
    await expectRevert(
      deployToken(
        baseConfig(owner.account.address, {
          buyTaxBps: 100,
          marketingWallet: carol.account.address,
          marketingShareBps: 9000,
          liquidityShareBps: 0,
        })
      ),
      /BadShares/
    );
  });

  it("dust rounds down: sub-wei tax settles in full", async () => {
    const { alice, token } = await taxedToken();
    await token.write.transfer([alice.account.address, M("1000")]);
    const asAlice = await tokenAs(token.address, alice);
    // 16 wei * 600bps / 10000 = 0 (integer division): no tax taken.
    await asAlice.write.transfer([PAIR, 16n]);
    expect(await token.read.balanceOf([token.address])).to.equal(0n);
  });

  it("fee-exempt seller pays no tax; pairs are never exempt", async () => {
    const { alice, carol, token } = await taxedToken();
    expect(await token.read.feeExempt([PAIR])).to.equal(false);
    await token.write.setFeeExempt([alice.account.address, true]);
    await token.write.transfer([alice.account.address, M("1000")]);
    const asAlice = await tokenAs(token.address, alice);
    await asAlice.write.transfer([PAIR, M("1000")]);
    expect(await token.read.balanceOf([token.address])).to.equal(0n);
    void carol;
  });

  it("exempt-leg maxTx bypass is explicit (owner seeding never deadlocks)", async () => {
    const { owner, alice, token } = await taxedToken();
    await token.write.transfer([alice.account.address, M("500000")]);
    expect(await token.read.balanceOf([alice.account.address])).to.equal(
      M("500000")
    );
    void owner;
  });

  it("marketing wallet rotation emits event and takes effect", async () => {
    const { bob, token } = await taxedToken();
    await token.write.setMarketingWallet([bob.account.address]);
    expect((await token.read.marketingWallet()).toLowerCase()).to.equal(
      bob.account.address.toLowerCase()
    );
    const publicClient = await hre.viem.getPublicClient();
    const logs = await publicClient.getContractEvents({
      address: token.address,
      abi: token.abi,
      eventName: "MarketingWalletSet",
    });
    expect(logs.length).to.be.greaterThan(0);
  });
});
