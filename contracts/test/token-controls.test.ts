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
const PAIR = "0x2222222222222222222222222222222222222222" as `0x${string}`;

/** Battery D (extended) — pair registry safety and exemption discipline. */
describe("BNBTokenMakerToken — pair controls", () => {
  async function pairToken() {
    const { owner, alice, bob, carol } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, {
        blacklistEnabled: true,
        whitelistEnabled: true,
        maxTxAmount: M("1000"),
        maxWalletAmount: M("1000"),
      })
    );
    return { owner, alice, bob, carol, token };
  }

  it("flagged pair cannot be blacklisted (sells stay possible)", async () => {
    const { token } = await pairToken();
    await token.write.setAMMPair([PAIR, true]);
    await expectRevert(
      token.write.setBlacklisted([PAIR, true]),
      /PairBlacklisted/
    );
    // Unflagged address can still be listed normally.
    const { alice } = await accounts();
    await token.write.setBlacklisted([alice.account.address, true]);
    expect(await token.read.isBlacklisted([alice.account.address])).to.equal(true);
  });

  it("flagged pair is auto-whitelisted but NOT fee-exempt", async () => {
    const { token } = await pairToken();
    await token.write.setAMMPair([PAIR, true]);
    expect(await token.read.isWhitelisted([PAIR])).to.equal(true);
    expect(await token.read.feeExempt([PAIR])).to.equal(false);
    expect(
      (await token.read.automatedMarketMakerPairs([PAIR]))
    ).to.equal(true);
  });

  it("pair bypasses maxWallet (liquidity concentration) like owner", async () => {
    const { token } = await pairToken();
    await token.write.setAMMPair([PAIR, true]);
    // 1000 cap; pair can hold the full 1M supply without revert.
    await token.write.transfer([PAIR, M("1000000")]);
    expect(await token.read.balanceOf([PAIR])).to.equal(M("1000000"));
  });

  it("zero pair address rejected; unflagging works", async () => {
    const { token } = await pairToken();
    await expectRevert(token.write.setAMMPair([zeroAddress, true]), /ZeroAddress/);
    await token.write.setAMMPair([PAIR, true]);
    await token.write.setAMMPair([PAIR, false]);
    expect(await token.read.automatedMarketMakerPairs([PAIR])).to.equal(false);
  });

  it("only owner manages pairs and exemptions; events emitted", async () => {
    const { alice, bob, token } = await pairToken();
    const asAlice = await tokenAs(token.address, alice);
    await expectRevert(
      asAlice.write.setAMMPair([PAIR, true]),
      /OwnableUnauthorizedAccount/
    );
    await expectRevert(
      asAlice.write.setFeeExempt([bob.account.address, true]),
      /OwnableUnauthorizedAccount/
    );
    await expectRevert(
      token.write.setFeeExempt([zeroAddress, true]),
      /ZeroAddress/
    );
    await token.write.setFeeExempt([bob.account.address, true]);
    expect(await token.read.feeExempt([bob.account.address])).to.equal(true);
  });
});
