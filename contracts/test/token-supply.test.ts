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

/** Battery B — supply: fixed/mint-disabled/unlimited/capped/cumulative cap. */
describe("BNBTokenMakerToken — supply and lifetime cap", () => {
  it("fixed supply: mint disabled reverts even for owner", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(baseConfig(owner.account.address));
    await expectRevert(
      token.write.mint([alice.account.address, M("1")]),
      /FeatureDisabled/
    );
    expect(await token.read.totalSupply()).to.equal(M("1000000"));
  });

  it("unlimited mint mode: maxSupply 0 mints freely, totalMinted tracks", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, { mintable: true })
    );
    expect(await token.read.maxSupply()).to.equal(0n);
    await token.write.mint([alice.account.address, M("5000000")]);
    expect(await token.read.totalMinted()).to.equal(M("6000000"));
    expect(await token.read.totalSupply()).to.equal(M("6000000"));
  });

  it("capped mint: within cap succeeds, over cap reverts", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, {
        mintable: true,
        maxSupply: M("1100000"),
      })
    );
    expect(String(await token.read.totalMinted())).to.equal(M("1000000").toString());
    await token.write.mint([alice.account.address, M("50000")]);
    expect(String(await token.read.totalMinted())).to.equal(M("1050000").toString());
    await expectRevert(
      token.write.mint([alice.account.address, M("100000")]),
      /MaxSupplyExceeded/
    );
  });

  it("burn does NOT restore mint capacity (cumulative semantics)", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, {
        burnable: true,
        mintable: true,
        maxSupply: M("1050000"),
      })
    );
    await token.write.mint([alice.account.address, M("50000")]);
    await token.write.transfer([alice.account.address, M("50000")]);
    const asAlice = await tokenAs(token.address, alice);
    await asAlice.write.burn([M("50000")]);
    // Lifetime issuance still 1.05M == cap: no further mint possible.
    expect(String(await token.read.totalMinted())).to.equal(M("1050000").toString());
    expect(await token.read.totalSupply()).to.equal(M("1000000"));
    await expectRevert(token.write.mint([alice.account.address, 1n]), /MaxSupplyExceeded/);
  });

  it("initial == cap: deploys, but any further mint reverts", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, {
        mintable: true,
        maxSupply: M("1000000"),
      })
    );
    await expectRevert(token.write.mint([alice.account.address, 1n]), /MaxSupplyExceeded/);
  });

  it("initial > cap reverts at construction", async () => {
    const { owner } = await accounts();
    await expectRevert(
      deployToken(
        baseConfig(owner.account.address, {
          mintable: true,
          maxSupply: M("999999"),
        })
      ),
      /InitialSupplyExceedsMax/
    );
  });

  it("cap with mint disabled reverts at construction", async () => {
    const { owner } = await accounts();
    await expectRevert(
      deployToken(
        baseConfig(owner.account.address, { maxSupply: M("2000000") })
      ),
      /MaxSupplyWithoutMint/
    );
  });

  it("renounce then mint reverts permanently (no platform recovery)", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, {
        mintable: true,
        maxSupply: M("2000000"),
      })
    );
    await token.write.renounceOwnership();
    expect(await token.read.owner()).to.equal(zeroAddress);
    await expectRevert(
      token.write.mint([alice.account.address, 1n]),
      /OwnableUnauthorizedAccount/
    );
    expect(String(await token.read.totalMinted())).to.equal(M("1000000").toString());
  });

  it("mint still respects maxWallet for non-owner recipients under a cap", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, {
        mintable: true,
        maxSupply: M("10000000"),
        maxWalletAmount: M("100"),
      })
    );
    await token.write.mint([alice.account.address, M("100")]);
    await expectRevert(
      token.write.mint([alice.account.address, M("1")]),
      /MaxWalletExceeded/
    );
  });
});
