import { expect } from "chai";
import { parseUnits, zeroAddress } from "viem";
import { accounts, baseConfig, deployToken, expectRevert, tokenAs } from "./helpers";


describe("BNBTokenMakerToken — base ERC-20", () => {
  it("sets name/symbol/decimals/supply/owner at construction", async () => {
    const { owner } = await accounts();
    const token = await deployToken(baseConfig(owner.account.address));
    expect(await token.read.name()).to.equal("Test Token");
    expect(await token.read.symbol()).to.equal("TST");
    expect(await token.read.decimals()).to.equal(18);
    expect(await token.read.totalSupply()).to.equal(1000000n * 10n ** 18n);
    expect(await token.read.balanceOf([owner.account.address])).to.equal(
      1000000n * 10n ** 18n
    );
    expect((await token.read.owner()).toLowerCase()).to.equal(
      owner.account.address.toLowerCase()
    );
  });

  it("respects non-18 decimals for supply math", async () => {
    const { owner } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, {
        decimals: 6,
        initialSupply: parseUnits("1000000", 6),
      })
    );
    expect(await token.read.decimals()).to.equal(6);
    expect(await token.read.totalSupply()).to.equal(parseUnits("1000000", 6));
    expect(await token.read.balanceOf([owner.account.address])).to.equal(
      parseUnits("1000000", 6)
    );
  });

  it("supports zero-decimal tokens", async () => {
    const { owner } = await accounts();
    const token = await deployToken(
      baseConfig(owner.account.address, { decimals: 0, initialSupply: 100n })
    );
    expect(await token.read.decimals()).to.equal(0);
    expect(await token.read.totalSupply()).to.equal(100n);
  });

  it("transfer moves balances and emits Transfer", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(baseConfig(owner.account.address));
    const amount = parseUnits("100", 18);
    await token.write.transfer([alice.account.address, amount]);
    expect(await token.read.balanceOf([alice.account.address])).to.equal(amount);
    expect(await token.read.balanceOf([owner.account.address])).to.equal(
      (1000000n * 10n ** 18n) - amount
    );
  });

  it("approve + transferFrom works within allowance", async () => {
    const { owner, alice, bob } = await accounts();
    const token = await deployToken(baseConfig(owner.account.address));
    const amount = parseUnits("50", 18);
    await token.write.approve([alice.account.address, amount]);
    expect(
      await token.read.allowance([owner.account.address, alice.account.address])
    ).to.equal(amount);
    const asAlice = await tokenAs(token.address, alice);
    await asAlice.write.transferFrom([
      owner.account.address,
      bob.account.address,
      amount,
    ]);
    expect(await token.read.balanceOf([bob.account.address])).to.equal(amount);
  });

  it("transferFrom beyond allowance reverts", async () => {
    const { owner, alice, bob } = await accounts();
    const token = await deployToken(baseConfig(owner.account.address));
    const asAlice = await tokenAs(token.address, alice);
    await expectRevert(
      asAlice.write.transferFrom([
        owner.account.address,
        bob.account.address,
        parseUnits("1", 18),
      ]),
      /allowance|insufficient/i
    );
  });

  it("transfer exceeding balance reverts", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(baseConfig(owner.account.address));
    const asAlice = await tokenAs(token.address, alice);
    await expectRevert(
      asAlice.write.transfer([owner.account.address, parseUnits("1", 18)]),
      /balance|insufficient/i
    );
  });

  it("transfer to zero address reverts", async () => {
    const { owner } = await accounts();
    const token = await deployToken(baseConfig(owner.account.address));
    await expectRevert(
      token.write.transfer([zeroAddress, parseUnits("1", 18)]),
      /zero|address/i
    );
  });

  it("owner can transfer and renounce ownership (included base controls)", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(baseConfig(owner.account.address));
    await token.write.transferOwnership([alice.account.address]);
    expect((await token.read.owner()).toLowerCase()).to.equal(
      alice.account.address.toLowerCase()
    );
    const asAlice = await tokenAs(token.address, alice);
    await asAlice.write.renounceOwnership();
    expect(await asAlice.read.owner()).to.equal(zeroAddress);
  });

  it("rejects zero owner", async () => {
    const { owner } = await accounts();
    await expectRevert(
      deployToken(baseConfig(owner.account.address, { owner: zeroAddress })),
      /ZeroAddress|OwnableInvalidOwner|zero|invalid.*owner/i
    );
  });

  it("rejects empty name and overlong name", async () => {
    const { owner } = await accounts();
    const addr = owner.account.address;
    await expectRevert(
      deployToken(baseConfig(addr, { name: "" })),
      /EmptyName|revert/i
    );
    await expectRevert(
      deployToken(baseConfig(addr, { name: "x".repeat(65) })),
      /NameTooLong|revert/i
    );
  });

  it("rejects empty/invalid/overlong symbol", async () => {
    const { owner } = await accounts();
    const addr = owner.account.address;
    await expectRevert(
      deployToken(baseConfig(addr, { symbol: "" })),
      /EmptySymbol|InvalidSymbol|revert/i
    );
    await expectRevert(
      deployToken(baseConfig(addr, { symbol: "TOOLONGSYMBOL" })),
      /InvalidSymbol|revert/i
    );
    await expectRevert(
      deployToken(baseConfig(addr, { symbol: "abc" })),
      /InvalidSymbol|revert/i
    );
    await expectRevert(
      deployToken(baseConfig(addr, { symbol: "A C" })),
      /InvalidSymbol|revert/i
    );
  });

  it("rejects decimals > 18", async () => {
    const { owner } = await accounts();
    await expectRevert(
      deployToken(baseConfig(owner.account.address, { decimals: 19 })),
      /DecimalsOutOfRange|revert/i
    );
  });

  it("rejects zero initial supply", async () => {
    const { owner } = await accounts();
    await expectRevert(
      deployToken(baseConfig(owner.account.address, { initialSupply: 0n })),
      /ZeroInitialSupply|revert/i
    );
  });

  it("feature-gated functions revert when disabled", async () => {
    const { owner, alice } = await accounts();
    const token = await deployToken(baseConfig(owner.account.address));
    await expectRevert(token.write.burn([1n]), /FeatureDisabled/);
    await expectRevert(
      token.write.mint([alice.account.address, 1n]),
      /FeatureDisabled|OwnableUnauthorized/
    );
    await expectRevert(token.write.pause(), /FeatureDisabled/);
    await expectRevert(
      token.write.setBlacklisted([alice.account.address, true]),
      /FeatureDisabled/
    );
    await expectRevert(
      token.write.setWhitelisted([alice.account.address, true]),
      /FeatureDisabled/
    );
  });
});
