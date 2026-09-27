import { expect } from "chai";
import hre from "hardhat";
import {
  encodeAbiParameters,
  keccak256,
  parseEther,
  parseUnits,
  stringToHex,
  zeroAddress,
} from "viem";
import { accounts, baseConfig, deployFactory, expectRevert } from "./helpers";

const M = (v: string) => parseUnits(v, 18);
const MAX_FEE = parseEther("5");

const TOKEN_TUPLE = {
  type: "tuple",
  components: [
    { type: "string", name: "name" },
    { type: "string", name: "symbol" },
    { type: "uint8", name: "decimals" },
    { type: "uint256", name: "initialSupply" },
    { type: "address", name: "owner" },
    { type: "bool", name: "burnable" },
    { type: "bool", name: "mintable" },
    { type: "bool", name: "pausable" },
    { type: "uint256", name: "maxTxAmount" },
    { type: "uint256", name: "maxWalletAmount" },
    { type: "bool", name: "blacklistEnabled" },
    { type: "bool", name: "whitelistEnabled" },
    { type: "uint256", name: "buyTaxBps" },
    { type: "uint256", name: "sellTaxBps" },
    { type: "address", name: "marketingWallet" },
    { type: "uint256", name: "marketingShareBps" },
    { type: "uint256", name: "liquidityShareBps" },
    { type: "bool", name: "autoLiquidityEnabled" },
    { type: "uint256", name: "swapThreshold" },
    { type: "bool", name: "antiBotEnabled" },
    { type: "uint256", name: "snipeBlocks" },
    { type: "uint256", name: "maxSupply" },
  ],
} as const;

const PARAMS_TUPLE = {
  type: "tuple",
  components: [{ ...TOKEN_TUPLE, name: "token" }],
} as const;

type Factory = Awaited<ReturnType<typeof deployFactory>>;
type Wallet = { account: { address: `0x${string}` }; signTypedData: (args: never) => Promise<`0x${string}`> };

async function quoteFixture() {
  const { clients, owner, alice } = await accounts();
  const factory = await deployFactory(
    alice.account.address,
    owner.account.address,
    MAX_FEE
  );
  const publicClient = await hre.viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  return { clients, owner, alice, factory, publicClient, chainId };
}

async function signQuote(
  signer: Wallet,
  factory: Factory,
  chainId: number,
  token: Record<string, unknown>,
  overrides: Record<string, unknown> = {}
) {
  const configHash = keccak256(encodeAbiParameters([PARAMS_TUPLE], [{ token }] as never));
  const quote = {
    configHash,
    feeWei: parseEther("0.05"),
    chainId: BigInt(chainId),
    factory: factory.address,
    nonce: keccak256(stringToHex(`quote-${Date.now()}-${Math.random()}`)),
    expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
    pricingVersion: keccak256(stringToHex("v1")),
    ...overrides,
  };
  const signature = await signer.signTypedData({
    domain: { name: "BNBTokenMaker", version: "1", chainId, verifyingContract: factory.address },
    types: {
      DeployQuote: [
        { name: "configHash", type: "bytes32" },
        { name: "feeWei", type: "uint256" },
        { name: "chainId", type: "uint256" },
        { name: "factory", type: "address" },
        { name: "nonce", type: "bytes32" },
        { name: "expiry", type: "uint256" },
        { name: "pricingVersion", type: "bytes32" },
      ],
    },
    primaryType: "DeployQuote",
    message: quote,
  } as never);
  return { token, quote, signature };
}

/** Battery H — EIP-712 quoted deployment, fee safety, rotation, isolation. */
describe("TokenFactory — EIP-712 quotes", () => {
  it("creates a token via correct quote; fee forwarded; events emitted", async () => {
    const { owner, alice, factory, publicClient, chainId } = await quoteFixture();
    const token = baseConfig(owner.account.address, {
      burnable: true,
      mintable: true,
      pausable: true,
      maxTxAmount: M("10"),
      blacklistEnabled: true,
    });
    const { quote, signature } = await signQuote(owner, factory, chainId, token);
    const recipientBefore = await publicClient.getBalance({ address: alice.account.address });
    const hash = await factory.write.createToken([{ token }, quote, signature] as never, {
      value: (quote as { feeWei: bigint }).feeWei,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).to.equal("success");
    const recipientAfter = await publicClient.getBalance({ address: alice.account.address });
    expect(recipientAfter - recipientBefore).to.equal((quote as { feeWei: bigint }).feeWei);

    const created = await publicClient.getContractEvents({
      address: factory.address,
      abi: factory.abi,
      eventName: "TokenCreated",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });
    expect(created.length).to.equal(1);
    // burn(1) | mint(2) | pause(4) | maxTx(8) | blacklist(32) = 47
    expect(created[0].args.features).to.equal(47n);
    const paid = await publicClient.getContractEvents({
      address: factory.address,
      abi: factory.abi,
      eventName: "DeploymentPaid",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });
    expect(paid.length).to.equal(1);

    const tokenAddress = created[0].args.token as `0x${string}`;
    const created_token = await hre.viem.getContractAt("BNBTokenMakerToken", tokenAddress);
    expect((await created_token.read.owner()).toLowerCase()).to.equal(
      owner.account.address.toLowerCase()
    );
    expect(String(await created_token.read.FACTORY()).toLowerCase()).to.equal(
      factory.address.toLowerCase()
    );
    expect(await created_token.read.GENERATOR()).to.equal("BNBTokenMaker.com");
  });

  it("rejects owner != sender (ownership can never be diverted)", async () => {
    const { owner, alice, factory, chainId } = await quoteFixture();
    const token = baseConfig(alice.account.address);
    const { quote, signature } = await signQuote(owner, factory, chainId, token);
    await expectRevert(
      factory.write.createToken([{ token }, quote, signature] as never, {
        value: (quote as { feeWei: bigint }).feeWei,
        account: owner.account,
      } as never),
      /OwnerMustBeSender/
    );
  });

  it("wrong signer reverts; rotation invalidates old and enables new", async () => {
    const { clients, owner, alice, factory, publicClient, chainId } = await quoteFixture();
    const bob = clients[2];
    const token = baseConfig(owner.account.address);
    const bad = await signQuote(alice, factory, chainId, token);
    await expectRevert(
      factory.write.createToken([{ token }, bad.quote, bad.signature] as never, {
        value: (bad.quote as { feeWei: bigint }).feeWei,
      }),
      /BadQuoteSigner/
    );
    // Non-owner cannot rotate.
    const asAlice = await hre.viem.getContractAt("TokenFactory", factory.address, {
      client: { wallet: alice as never },
    });
    await expectRevert(asAlice.write.setSigner([bob.account.address]), /OwnableUnauthorizedAccount/);
    await expectRevert(factory.write.setSigner([zeroAddress]), /ZeroSigner/);
    // Owner rotates to bob: owner-signed quotes now fail, bob-signed pass.
    await factory.write.setSigner([bob.account.address]);
    const stale = await signQuote(owner, factory, chainId, token);
    await expectRevert(
      factory.write.createToken([{ token }, stale.quote, stale.signature] as never, {
        value: (stale.quote as { feeWei: bigint }).feeWei,
      }),
      /BadQuoteSigner/
    );
    const fresh = await signQuote(bob, factory, chainId, token);
    const hash = await factory.write.createToken([{ token }, fresh.quote, fresh.signature] as never, {
      value: (fresh.quote as { feeWei: bigint }).feeWei,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).to.equal("success");
  });

  it("replay of a used nonce reverts", async () => {
    const { owner, factory, chainId } = await quoteFixture();
    const token = baseConfig(owner.account.address);
    const { quote, signature } = await signQuote(owner, factory, chainId, token);
    await factory.write.createToken([{ token }, quote, signature] as never, {
      value: (quote as { feeWei: bigint }).feeWei,
    });
    await expectRevert(
      factory.write.createToken([{ token }, quote, signature] as never, {
        value: (quote as { feeWei: bigint }).feeWei,
      }),
      /QuoteReplayed/
    );
  });

  it("expired quote reverts", async () => {
    const { owner, factory, chainId } = await quoteFixture();
    const token = baseConfig(owner.account.address);
    const { quote, signature } = await signQuote(owner, factory, chainId, token, {
      expiry: BigInt(Math.floor(Date.now() / 1000) - 5),
    });
    await expectRevert(
      factory.write.createToken([{ token }, quote, signature] as never, {
        value: (quote as { feeWei: bigint }).feeWei,
      }),
      /QuoteExpired/
    );
  });

  it("wrong chain and wrong factory revert", async () => {
    const { owner, factory, chainId } = await quoteFixture();
    const token = baseConfig(owner.account.address);
    const wrongChain = await signQuote(owner, factory, chainId, token, {
      chainId: BigInt(chainId + 1),
    });
    await expectRevert(
      factory.write.createToken([{ token }, wrongChain.quote, wrongChain.signature] as never, {
        value: (wrongChain.quote as { feeWei: bigint }).feeWei,
      }),
      /WrongChain/
    );
    const wrongFactory = await signQuote(owner, factory, chainId, token, {
      factory: zeroAddress,
    });
    await expectRevert(
      factory.write.createToken([{ token }, wrongFactory.quote, wrongFactory.signature] as never, {
        value: (wrongFactory.quote as { feeWei: bigint }).feeWei,
      }),
      /WrongFactory/
    );
  });

  it("mutated token config reverts (quote binds exact config)", async () => {
    const { owner, factory, chainId } = await quoteFixture();
    const token = baseConfig(owner.account.address);
    const { quote, signature } = await signQuote(owner, factory, chainId, token);
    const tampered = { ...token, initialSupply: M("2000000") };
    await expectRevert(
      factory.write.createToken([{ token: tampered }, quote, signature] as never, {
        value: (quote as { feeWei: bigint }).feeWei,
      }),
      /ConfigMismatch/
    );
  });

  it("underpay and overpay revert (exact msg.value match)", async () => {
    const { owner, factory, chainId } = await quoteFixture();
    const token = baseConfig(owner.account.address);
    const { quote, signature } = await signQuote(owner, factory, chainId, token);
    const fee = (quote as { feeWei: bigint }).feeWei;
    await expectRevert(
      factory.write.createToken([{ token }, quote, signature] as never, { value: fee - 1n }),
      /FeeMismatch/
    );
    await expectRevert(
      factory.write.createToken([{ token }, quote, signature] as never, { value: fee + 1n }),
      /FeeMismatch/
    );
  });

  it("fee above immutable MAX_FEE_WEI reverts even if paid exactly", async () => {
    const { owner, alice, factory, chainId } = await quoteFixture();
    expect(await factory.read.MAX_FEE_WEI()).to.equal(MAX_FEE);
    expect((await factory.read.feeRecipient()).toLowerCase()).to.equal(
      alice.account.address.toLowerCase()
    );
    const token = baseConfig(owner.account.address);
    const { quote, signature } = await signQuote(owner, factory, chainId, token, {
      feeWei: MAX_FEE + 1n,
    });
    await expectRevert(
      factory.write.createToken([{ token }, quote, signature] as never, {
        value: MAX_FEE + 1n,
      }),
      /FeeExceedsCap/
    );
  });

  it("rejects invalid token input through the factory (fail closed)", async () => {
    const { owner, factory, chainId } = await quoteFixture();
    for (const overrides of [
      { initialSupply: 0n },
      { symbol: "bad!" },
      { maxTxAmount: M("100"), maxWalletAmount: M("99") },
      { buyTaxBps: 1001, marketingWallet: owner.account.address, marketingShareBps: 10000, liquidityShareBps: 0 },
    ]) {
      const token = baseConfig(owner.account.address, overrides);
      const { quote, signature } = await signQuote(owner, factory, chainId, token);
      await expectRevert(
        factory.write.createToken([{ token }, quote, signature] as never, {
          value: (quote as { feeWei: bigint }).feeWei,
        }),
        /ZeroInitialSupply|InvalidSymbol|MaxWalletBelowMaxTx|TaxTooHigh|revert/i
      );
    }
  });

  it("constructor rejects zero recipient and zero signer", async () => {
    const { owner, alice } = await accounts();
    await expectRevert(
      deployFactory(zeroAddress, owner.account.address, MAX_FEE),
      /ZeroRecipient/
    );
    await expectRevert(
      deployFactory(alice.account.address, zeroAddress, MAX_FEE),
      /ZeroSigner/
    );
  });

  it("factory exposes no token authority (write-surface allowlist)", async () => {
    const { factory } = await quoteFixture();
    const writes = factory.abi
      .filter((e) => (e as { type: string }).type === "function")
      .filter((e) => (e as { stateMutability: string }).stateMutability !== "view")
      .map((e) => (e as { name: string }).name)
      .sort();
    expect(writes).to.deep.equal(
      ["createToken", "renounceOwnership", "setSigner", "transferOwnership"].sort()
    );
  });

  it("full-monty creation through quotes sets every money parameter", async () => {
    const { owner, alice, factory, publicClient, chainId } = await quoteFixture();
    const token = baseConfig(owner.account.address, {
      burnable: true,
      mintable: true,
      pausable: true,
      maxTxAmount: M("10000"),
      maxWalletAmount: M("20000"),
      blacklistEnabled: true,
      whitelistEnabled: true,
      buyTaxBps: 400,
      sellTaxBps: 600,
      marketingWallet: alice.account.address,
      marketingShareBps: 7000,
      liquidityShareBps: 3000,
      autoLiquidityEnabled: true,
      swapThreshold: M("1000"),
      antiBotEnabled: true,
      snipeBlocks: 10n,
      maxSupply: M("10000000"),
    });
    const { quote, signature } = await signQuote(owner, factory, chainId, token, {
      feeWei: parseEther("0.35"),
    });
    const hash = await factory.write.createToken([{ token }, quote, signature] as never, {
      value: parseEther("0.35"),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).to.equal("success");
    const created = await publicClient.getContractEvents({
      address: factory.address,
      abi: factory.abi,
      eventName: "TokenCreated",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });
    // all 10 feature bits set = 1023
    expect(created[0].args.features).to.equal(1023n);
    const created_token = await hre.viem.getContractAt(
      "BNBTokenMakerToken",
      created[0].args.token as `0x${string}`
    );
    expect(await created_token.read.buyTaxBps()).to.equal(400n);
    expect(await created_token.read.maxSupply()).to.equal(M("10000000"));
    expect(await created_token.read.snipeBlocks()).to.equal(10n);
  });
});
