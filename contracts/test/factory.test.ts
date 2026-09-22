import { expect } from "chai";
import hre from "hardhat";
import { parseEther, parseUnits, zeroAddress } from "viem";
import { accounts, baseConfig, expectRevert } from "./helpers";

const M = (v: string) => parseUnits(v, 18);

describe("TokenFactory", () => {
  async function deployFactory() {
    return hre.viem.deployContract("TokenFactory");
  }

  function params(owner: `0x${string}`, overrides: Record<string, unknown> = {}) {
    return { token: baseConfig(owner, overrides) };
  }

  it("creates a token owned by the deployer (never the factory)", async () => {
    const { owner } = await accounts();
    const factory = await deployFactory();
    const hash = await factory.write.createToken([params(owner.account.address)]);
    const publicClient = await hre.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).to.equal("success");

    // Parse the TokenCreated event from the receipt.
    const logs = await publicClient.getContractEvents({
      address: factory.address,
      abi: factory.abi,
      eventName: "TokenCreated",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });
    expect(logs.length).to.equal(1);
    const event = logs[0];
    const tokenAddress = (event.args.token ?? zeroAddress) as `0x${string}`;
    expect(tokenAddress).to.not.equal(zeroAddress);
    expect((event.args.creator ?? "").toLowerCase()).to.equal(
      owner.account.address.toLowerCase()
    );
    expect((event.args.owner ?? "").toLowerCase()).to.equal(
      owner.account.address.toLowerCase()
    );
    expect(event.args.name).to.equal("Test Token");
    expect(event.args.symbol).to.equal("TST");
    expect(event.args.decimals).to.equal(18);
    expect(event.args.initialSupply).to.equal(1000000n * 10n ** 18n);

    const token = await hre.viem.getContractAt(
      "BNBTokenMakerToken",
      tokenAddress
    );
    expect((await token.read.owner()).toLowerCase()).to.equal(
      owner.account.address.toLowerCase()
    );
    expect(tokenAddress.toLowerCase()).to.not.equal(factory.address.toLowerCase());
    expect(await token.read.balanceOf([owner.account.address])).to.equal(
      1000000n * 10n ** 18n
    );
  });

  it("createToken return value equals the deployed token address", async () => {
    const { owner } = await accounts();
    const factory = await deployFactory();
    const tokenAddress = (
      await factory.simulate.createToken([params(owner.account.address)])
    ).result as `0x${string}`;
    expect(tokenAddress).to.match(/^0x[a-fA-F0-9]{40}$/);
    await factory.write.createToken([params(owner.account.address)]);
    const token = await hre.viem.getContractAt(
      "BNBTokenMakerToken",
      tokenAddress
    );
    expect(await token.read.symbol()).to.equal("TST");
  });

  it("rejects owner != sender (ownership can never be diverted)", async () => {
    const { owner, alice } = await accounts();
    const factory = await deployFactory();
    await expectRevert(
      factory.write.createToken([params(alice.account.address)], {
        account: owner.account,
      } as never),
      /OwnerMustBeSender/
    );
  });

  it("is fee-free: any attached value reverts (testnet fee = 0)", async () => {
    const { owner } = await accounts();
    const factory = await deployFactory();
    await expectRevert(
      factory.write.createToken([params(owner.account.address)], {
        value: parseEther("0.05"),
      } as never),
      /non-payable|value|revert/i
    );
  });

  it("rejects invalid token input (fail closed)", async () => {
    const { owner } = await accounts();
    const factory = await deployFactory();
    await expectRevert(
      factory.write.createToken([params(owner.account.address, { initialSupply: 0n })]),
      /ZeroInitialSupply|revert/i
    );
    await expectRevert(
      factory.write.createToken([params(owner.account.address, { symbol: "bad!" })]),
      /InvalidSymbol|revert/i
    );
    await expectRevert(
      factory.write.createToken([
        params(owner.account.address, {
          maxTxAmount: M("100"),
          maxWalletAmount: M("99"),
        }),
      ]),
      /MaxWalletBelowMaxTx|revert/i
    );
  });

  it("factory retains no privilege over created tokens", async () => {
    const { owner, alice } = await accounts();
    const factory = await deployFactory();
    const hash = await factory.write.createToken([
      params(owner.account.address, { mintable: true, pausable: true }),
    ]);
    const publicClient = await hre.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const logs = await publicClient.getContractEvents({
      address: factory.address,
      abi: factory.abi,
      eventName: "TokenCreated",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });
    const tokenAddress = logs[0].args.token as `0x${string}`;
    const token = await hre.viem.getContractAt(
      "BNBTokenMakerToken",
      tokenAddress
    );
    // Factory address is not the owner and cannot mint/pause.
    expect((await token.read.owner()).toLowerCase()).to.not.equal(
      factory.address.toLowerCase()
    );
    // The factory contract exposes no token-admin functions at all.
    const writeNames = factory.abi
      .filter((e) => e.type === "function")
      .map((e) => (e as { name: string }).name);
    expect(writeNames).to.deep.equal(["createToken"]);
    // Non-owner (alice) cannot mint the factory-created token.
    const asAlice = await hre.viem.getContractAt(
      "BNBTokenMakerToken",
      tokenAddress,
      { client: { wallet: alice as never } }
    );
    await expectRevert(
      asAlice.write.mint([alice.account.address, M("1")]),
      /OwnableUnauthorized|unauthorized/i
    );
  });

  it("feature bitmap reflects enabled features", async () => {
    const { owner } = await accounts();
    const factory = await deployFactory();
    const hash = await factory.write.createToken([
      params(owner.account.address, {
        burnable: true,
        mintable: true,
        maxTxAmount: M("10"),
        blacklistEnabled: true,
      }),
    ]);
    const publicClient = await hre.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const logs = await publicClient.getContractEvents({
      address: factory.address,
      abi: factory.abi,
      eventName: "TokenCreated",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });
    // burn(1) | mint(2) | maxTx(8) | blacklist(32) = 43
    expect(logs[0].args.features).to.equal(43n);
  });
});
