/**
 * Phase 7D-D real-PancakeSwap V2 integration (etched verified bytecode).
 *
 * Mainnet-fork RPC endpoints available to this phase cannot serve fork
 * state (`missing trie node` / 403 / key-gated on every attempt, never
 * retried beyond controlled probes). Instead of weakening assertions to
 * mocks, this battery executes the FULL A–T matrix against genuine
 * PancakeSwap V2 mainnet bytecode (Router02 + Factory + WBNB), fetched via
 * eth_getCode and cross-verified identical on two independent endpoints
 * (codehashes pinned in ./fixtures/pancake-mainnet.json with re-fetch
 * instructions). The code is etched at its canonical addresses on the
 * local chain, so frozen SwapLib/Token/Factory interact with the REAL
 * swap/pair/liquidity logic: real reserves, real LP math, real reverts.
 *
 * What this proves (deterministic, no RPC at test time): every DEX-facing
 * behavior of the frozen contracts against genuine PancakeSwap code.
 * What it does NOT replace: a live-fork smoke test (kept env-gated below)
 * for mainnet-state compatibility before mainnet activation.
 *
 * No BNB spent, nothing leaves the local chain. Test-only mocks are used
 * ONLY where noted (BatchBuyer for same-block determinism, RejectBNB as a
 * failing funds sink); the swap/pair/liquidity path is always real code.
 */
import { expect } from "chai";
import hre from "hardhat";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  encodeAbiParameters,
  keccak256,
  parseEther,
  parseUnits,
  stringToHex,
} from "viem";
import { baseConfig, deployToken, linkSwapLib, tokenAs } from "./helpers";

const M = (v: string) => parseUnits(v, 18);
const SUPPLY = M("1000000");
const ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E" as `0x${string}`;
const FACTORY_V2 = "0xca143ce32fe78f1f7019d7d551a6402fc5350c73" as `0x${string}`;
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as `0x${string}`;
const BURN = "0x000000000000000000000000000000000000dEaD" as `0x${string}`;

const ROUTER_ABI = [
  {
    type: "function", name: "getAmountsOut", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "address[]" }], outputs: [{ type: "uint256[]" }],
  },
  {
    type: "function", name: "swapExactETHForTokensSupportingFeeOnTransferTokens", stateMutability: "payable",
    inputs: [{ type: "uint256" }, { type: "address[]" }, { type: "address" }, { type: "uint256" }],
    outputs: [],
  },
  {
    type: "function", name: "swapExactTokensForETHSupportingFeeOnTransferTokens", stateMutability: "nonpayable",
    inputs: [{ type: "uint256" }, { type: "uint256" }, { type: "address[]" }, { type: "address" }, { type: "uint256" }],
    outputs: [],
  },
  {
    type: "function", name: "addLiquidityETH", stateMutability: "payable",
    inputs: [{ type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "address" }, { type: "uint256" }],
    outputs: [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
  },
] as const;

const FACTORY_V2_ABI = [
  {
    type: "function", name: "createPair", stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "address" }],
  },
  {
    type: "function", name: "getPair", stateMutability: "view",
    inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "address" }],
  },
] as const;

const WBNB_ABI = [
  { type: "function", name: "deposit", stateMutability: "payable", inputs: [], outputs: [] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

const PAIR_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

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

function pancakeFixture(): Record<string, { address: `0x${string}`; code: `0x${string}` }> {
  return JSON.parse(
    readFileSync(join(process.cwd(), "contracts", "test", "fixtures", "pancake-mainnet.json"), "utf8")
  ).contracts;
}

async function expectRevert(promise: Promise<unknown>, fragment: string) {
  try {
    await promise;
  } catch (error) {
    const text = error instanceof Error ? `${error.message} ${(error as { shortMessage?: unknown }).shortMessage ?? ""}` : String(error);
    expect(text).to.contain(fragment);
    return;
  }
  expect.fail("expected revert");
}

describe("PancakeSwap V2 real-code integration (7D-D)", function () {
  this.timeout(600000);

  it("A–T: deploy, list, trade, tax, swapBack, LP-burn, failure safety", async () => {
    const clients = await hre.viem.getWalletClients();
    const [owner, alice, bob, carol] = clients;
    const publicClient = await hre.viem.getPublicClient();

    // ---- Real DEX code etched at canonical addresses (verified fixture).
    const dex = pancakeFixture();
    for (const key of ["router", "factory", "wbnb"] as const) {
      await hre.network.provider.send("hardhat_setCode", [
        dex[key].address,
        dex[key].code,
      ]);
    }
    const routerCode = await publicClient.getBytecode({ address: ROUTER });
    expect((routerCode ?? "0x").length).to.be.greaterThan(1000);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    // ---- A. Deploy SwapLib + TokenFactory (library-first, linked).
    const libArtifact = await hre.artifacts.readArtifact("SwapLib");
    const libHash = await clients[0].deployContract({
      abi: libArtifact.abi,
      bytecode: libArtifact.bytecode,
    });
    const libReceipt = await publicClient.waitForTransactionReceipt({ hash: libHash });
    const swapLib = libReceipt.contractAddress as `0x${string}`;
    const factoryArtifact = await hre.artifacts.readArtifact("TokenFactory");
    const factoryDeployHash = await clients[0].deployContract({
      abi: factoryArtifact.abi,
      bytecode: linkSwapLib(factoryArtifact.bytecode, factoryArtifact.linkReferences, swapLib),
      args: [carol.account.address, owner.account.address, parseEther("5")],
    });
    const factoryDeployReceipt = await publicClient.waitForTransactionReceipt({
      hash: factoryDeployHash,
    });
    expect(factoryDeployReceipt.status).to.equal("success");
    console.log(`      factory deployment gas: ${factoryDeployReceipt.gasUsed}`);
    const factory = await hre.viem.getContractAt(
      "TokenFactory",
      factoryDeployReceipt.contractAddress as `0x${string}`
    );

    // ---- A (cont). Create the token through a signed EIP-712 quote.
    const chainId = await publicClient.getChainId();
    const token = baseConfig(owner.account.address, {
      burnable: true,
      mintable: true,
      pausable: true,
      maxTxAmount: (SUPPLY * 5n) / 100n,
      maxWalletAmount: (SUPPLY * 20n) / 100n,
      blacklistEnabled: true,
      whitelistEnabled: false,
      buyTaxBps: 400,
      sellTaxBps: 600,
      marketingWallet: carol.account.address,
      marketingShareBps: 7000,
      liquidityShareBps: 3000,
      autoLiquidityEnabled: true,
      swapThreshold: M("1000"),
      antiBotEnabled: true,
      snipeBlocks: 10n,
      maxSupply: M("10000000"),
    });
    const paramsTuple = {
      type: "tuple",
      components: [{ ...TOKEN_TUPLE, name: "token" }],
    } as const;
    const configHash = keccak256(encodeAbiParameters([paramsTuple], [{ token }] as never));
    const fee = parseEther("0.05");
    const quote = {
      configHash,
      feeWei: fee,
      chainId: BigInt(chainId),
      factory: factory.address,
      nonce: keccak256(stringToHex("dex-battery-1")),
      expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
      pricingVersion: keccak256(stringToHex("dex-1")),
    };
    const signature = await owner.signTypedData({
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
    const createHash = await factory.write.createToken([{ token }, quote, signature] as never, {
      value: fee,
    });
    const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
    expect(createReceipt.status).to.equal("success");
    console.log(`      createToken[full-monty] gas: ${createReceipt.gasUsed}`);
    const created = await publicClient.getContractEvents({
      address: factory.address,
      abi: factory.abi,
      eventName: "TokenCreated",
      fromBlock: createReceipt.blockNumber,
      toBlock: createReceipt.blockNumber,
    });
    expect(created.length).to.equal(1);
    const tokenAddress = created[0].args.token as `0x${string}`;
    const createdToken = await hre.viem.getContractAt("BNBTokenMakerToken", tokenAddress);

    // ---- B/C. Real pair + real liquidity (WBNB wrap, factory pair, router add).
    await clients[0].writeContract({
      address: WBNB,
      abi: WBNB_ABI,
      functionName: "deposit",
      value: parseEther("500"),
    } as never);
    await clients[0].writeContract({
      address: FACTORY_V2,
      abi: FACTORY_V2_ABI,
      functionName: "createPair",
      args: [tokenAddress, WBNB],
    } as never);
    const pair = (await publicClient.readContract({
      address: FACTORY_V2,
      abi: FACTORY_V2_ABI,
      functionName: "getPair",
      args: [tokenAddress, WBNB],
    } as never)) as `0x${string}`;
    expect(pair).to.not.equal("0x0000000000000000000000000000000000000000");
    await createdToken.write.approve([ROUTER, M("100000")]);
    await clients[0].writeContract({
      address: WBNB, abi: WBNB_ABI, functionName: "approve", args: [ROUTER, parseEther("500")],
    } as never);
    await clients[0].writeContract({
      address: ROUTER,
      abi: ROUTER_ABI,
      functionName: "addLiquidityETH",
      args: [tokenAddress, M("100000"), 0n, 0n, owner.account.address, deadline],
      value: parseEther("100"),
    } as never);
    const ownerLp = (await publicClient.readContract({
      address: pair,
      abi: PAIR_ABI,
      functionName: "balanceOf",
      args: [owner.account.address],
    } as never)) as bigint;
    expect(ownerLp > 0n).to.equal(true);

    // ---- D. Register the real pair; fund alice; enable trading.
    const pairHash = await createdToken.write.setAMMPair([pair, true]);
    const pairReceipt = await publicClient.waitForTransactionReceipt({ hash: pairHash });
    console.log(`      setAMMPair gas: ${pairReceipt.gasUsed}`);
    await createdToken.write.transfer([alice.account.address, M("100000")]);
    const enableHash = await createdToken.write.enableTrading();
    const enableReceipt = await publicClient.waitForTransactionReceipt({ hash: enableHash });
    console.log(`      enableTrading gas: ${enableReceipt.gasUsed}`);

    // ---- F. Wallet-to-wallet transfer is untaxed (real chain).
    await createdToken.write.transfer([bob.account.address, M("5000")]);
    const asAlice = await tokenAs(tokenAddress, alice);
    await asAlice.write.transfer([bob.account.address, M("1000")]);
    expect(await createdToken.read.balanceOf([bob.account.address])).to.equal(M("6000"));
    expect(await createdToken.read.balanceOf([tokenAddress])).to.equal(0n);

    // ---- G. Taxed BUY through the real router (pair -> buyer, 4% exact).
    const buyValue = parseEther("10");
    const quotedOut = (await publicClient.readContract({
      address: ROUTER,
      abi: ROUTER_ABI,
      functionName: "getAmountsOut",
      args: [buyValue, [WBNB, tokenAddress]],
    } as never)) as bigint[];
    const buyMin = (quotedOut[1] * 9500n) / 10000n;
    const buyer = clients[6].account.address;
    await createdToken.write.transfer([buyer, M("100")]);
    const buyHash = await clients[6].writeContract({
      address: ROUTER,
      abi: ROUTER_ABI,
      functionName: "swapExactETHForTokensSupportingFeeOnTransferTokens",
      args: [buyMin, [WBNB, tokenAddress], buyer, deadline],
      value: buyValue,
    } as never);
    const buyReceipt = await publicClient.waitForTransactionReceipt({ hash: buyHash });
    expect(buyReceipt.status).to.equal("success");
    console.log(`      buy gas: ${buyReceipt.gasUsed}`);
    const buyTax = (quotedOut[1] * 400n) / 10000n;
    expect(await createdToken.read.balanceOf([buyer])).to.equal(
      M("100") + quotedOut[1] - buyTax
    );

    // ---- J/K. maxTx + maxWallet enforced on the real chain (non-owner legs).
    await expectRevert(
      asAlice.write.transfer([bob.account.address, M("60000")]),
      "MaxTxExceeded"
    );
    const filled = clients[5].account.address;
    await createdToken.write.transfer([filled, M("199999")]);
    await createdToken.write.transfer([bob.account.address, M("199000")]);
    const asBob = await tokenAs(tokenAddress, bob);
    await expectRevert(
      asBob.write.transfer([filled, M("2")]),
      "MaxWalletExceeded"
    );

    // ---- I. Fee exemption removes the sell tax (exact zero delta), then restored.
    await createdToken.write.setFeeExempt([alice.account.address, true]);
    const contractBeforeExempt = await createdToken.read.balanceOf([tokenAddress]);
    const pairBeforeExempt = await createdToken.read.balanceOf([pair]);
    await asAlice.write.transfer([pair, M("1000")]);
    expect(await createdToken.read.balanceOf([tokenAddress])).to.equal(contractBeforeExempt);
    expect(await createdToken.read.balanceOf([pair])).to.equal(
      (pairBeforeExempt as bigint) + M("1000")
    );
    await createdToken.write.setFeeExempt([alice.account.address, false]);

    // ---- H/N–S. Taxed SELL triggering a real swapBack (6% of 20k = 1200
    // plus the ~360 parked buy tax: well above the 1000 threshold).
    const carolBefore = await publicClient.getBalance({ address: carol.account.address });
    const burnLpBefore = (await publicClient.readContract({
      address: pair,
      abi: PAIR_ABI,
      functionName: "balanceOf",
      args: [BURN],
    } as never)) as bigint;
    const pairBeforeSell = await createdToken.read.balanceOf([pair]);
    const contractBeforeSell = await createdToken.read.balanceOf([tokenAddress]);
    const sellHash = await asAlice.write.transfer([pair, M("20000")]);
    const sellReceipt = await publicClient.waitForTransactionReceipt({ hash: sellHash });
    expect(sellReceipt.status).to.equal("success");
    console.log(`      sell(+swapBack) gas: ${sellReceipt.gasUsed}`);
    // Exact sell accounting: the pair nets the 18,800 sell leg PLUS every
    // token the swapBack itself routes through it (marketing input +
    // liquidity input + liquidity deposit = the full swapped balance).
    // Swapped total = parked balance + this leg's 1,200 tax (threshold met).
    const swapped = (contractBeforeSell as bigint) + M("1200");
    const tokenArtifact = await hre.artifacts.readArtifact("BNBTokenMakerToken");
    const swaps = await publicClient.getContractEvents({
      address: tokenAddress,
      abi: tokenArtifact.abi,
      eventName: "SwapBackExecuted",
      fromBlock: sellReceipt.blockNumber,
      toBlock: sellReceipt.blockNumber,
    });
    const mktPaid = await publicClient.getContractEvents({
      address: tokenAddress,
      abi: tokenArtifact.abi,
      eventName: "MarketingPaid",
      fromBlock: sellReceipt.blockNumber,
      toBlock: sellReceipt.blockNumber,
    });
    const liqAdded = await publicClient.getContractEvents({
      address: tokenAddress,
      abi: tokenArtifact.abi,
      eventName: "LiquidityAdded",
      fromBlock: sellReceipt.blockNumber,
      toBlock: sellReceipt.blockNumber,
    });
    console.log(
      `      swapBack legs: swapped=${(swaps[0].args as { tokensSwapped: bigint }).tokensSwapped} ` +
        `marketingBNB=${(mktPaid[0].args as { bnbAmount: bigint }).bnbAmount} ` +
        `liqTokens=${(liqAdded[0].args as { tokenAmount: bigint }).tokenAmount} ` +
        `liqBNB=${(liqAdded[0].args as { bnbAmount: bigint }).bnbAmount} ` +
        `lp=${(liqAdded[0].args as { lpBurned: bigint }).lpBurned} ` +
        `nMkt=${mktPaid.length} nSwap=${swaps.length}`
    );
    const pairAfterSell = await createdToken.read.balanceOf([pair]);
    const contractAfterSell = await createdToken.read.balanceOf([tokenAddress]);
    // CONSERVATION (exact): every swapped token is either in the pair or
    // parked. The real router's addLiquidity optimal-amount math may pull a
    // dust less than `half`; the unpulled dust stays in the token contract
    // and sweeps into the NEXT swapBack — benign, self-healing real-DEX
    // economics, never stuck: assert it stays sub-threshold.
    expect((pairAfterSell as bigint) - (pairBeforeSell as bigint) + contractAfterSell).to.equal(
      M("18800") + swapped
    );
    expect((contractAfterSell as bigint) < M("1000")).to.equal(true);
    console.log(`      post-sell: pair=${pairAfterSell} contract=${contractAfterSell}`);
    // Marketing leg: carol received real BNB.
    const carolAfter = await publicClient.getBalance({ address: carol.account.address });
    expect(carolAfter - carolBefore > 0n).to.equal(true);
    // Liquidity leg: burn address LP increased (burn-only policy on real LP).
    const burnLpAfter = (await publicClient.readContract({
      address: pair,
      abi: PAIR_ABI,
      functionName: "balanceOf",
      args: [BURN],
    } as never)) as bigint;
    expect(burnLpAfter > burnLpBefore).to.equal(true);
    expect(swaps.length).to.equal(1);

    // ---- T. Failure safety: EOA pair skips, transfer succeeds, tax parks.
    const eoaPair = "0x1234567890123456789012345678901234567890" as `0x${string}`;
    await createdToken.write.setAMMPair([eoaPair, true]);
    const parkedBefore = await createdToken.read.balanceOf([tokenAddress]);
    const failHash = await asAlice.write.transfer([eoaPair, M("1000")]);
    const failReceipt = await publicClient.waitForTransactionReceipt({ hash: failHash });
    expect(failReceipt.status).to.equal("success");
    expect(await createdToken.read.balanceOf([tokenAddress])).to.equal(
      (parkedBefore as bigint) + M("60")
    );

    // ---- T (cont). Failing marketing wallet: transfer still succeeds.
    const rejectArtifact = await hre.artifacts.readArtifact("RejectBNB");
    const rejectHash = await clients[0].deployContract({
      abi: rejectArtifact.abi,
      bytecode: rejectArtifact.bytecode,
    });
    const rejectReceipt = await publicClient.waitForTransactionReceipt({ hash: rejectHash });
    const rejector = rejectReceipt.contractAddress as `0x${string}`;
    await createdToken.write.setMarketingWallet([rejector]);
    const bigSell = await asAlice.write.transfer([pair, M("20000")]);
    const bigReceipt = await publicClient.waitForTransactionReceipt({ hash: bigSell });
    expect(bigReceipt.status).to.equal("success");
    expect((await createdToken.read.balanceOf([tokenAddress])) > 0n).to.equal(true);
    await createdToken.write.setMarketingWallet([carol.account.address]);

    // ---- L. Anti-bot cooldown on the DEX chain (fresh token, atomic proof).
    const coolToken = await deployToken(
      baseConfig(owner.account.address, { antiBotEnabled: true, snipeBlocks: 50n })
    );
    const batch = await hre.viem.deployContract("BatchBuyer");
    await coolToken.write.setAMMPair([batch.address, true]);
    await coolToken.write.transfer([batch.address, M("1000")]);
    await coolToken.write.enableTrading();
    await batch.write.singleBuy([coolToken.address, bob.account.address, M("100")]);
    expect(await coolToken.read.balanceOf([bob.account.address])).to.equal(M("100"));
    await expectRevert(
      batch.write.doubleBuy([coolToken.address, bob.account.address, M("100")]),
      "CooldownActive"
    );

    // ---- Security regression on the real DEX path.
    await expectRevert(createdToken.write.setBlacklisted([pair, true]), "PairBlacklisted");
    // No tax setter exists anywhere in the ABI (immutable by design).
    const tokenNames = (tokenArtifact.abi as Array<{ name?: string }>).map((e) => e.name);
    for (const setter of ["setBuyTax", "setSellTax", "setTax", "setMaxSupply", "withdraw", "rescue"]) {
      expect(tokenNames).to.not.include(setter);
    }
    // Non-owners cannot act (factory holds no privilege either).
    const stranger = await hre.viem.getContractAt("BNBTokenMakerToken", tokenAddress, {
      client: { wallet: clients[7] as never },
    });
    await expectRevert(stranger.write.mint([bob.account.address, 1n]), "OwnableUnauthorizedAccount");
    await expectRevert(stranger.write.pause(), "OwnableUnauthorizedAccount");
    expect(((await createdToken.read.owner()) as string).toLowerCase()).to.not.equal(
      factory.address.toLowerCase()
    );

    // ---- Renounce LAST: no hidden platform path appears.
    await createdToken.write.renounceOwnership();
    expect(await createdToken.read.owner()).to.equal(
      "0x0000000000000000000000000000000000000000"
    );
    await expectRevert(
      createdToken.write.mint([bob.account.address, 1n]),
      "OwnableUnauthorizedAccount"
    );
  });
});

const FORK_URL = (process.env.BSC_FORK_URL ?? "").trim();

(FORK_URL ? describe : describe.skip)("PancakeSwap live-fork smoke (archive RPC)", function () {
  this.timeout(120000);

  after(async () => {
    await hre.network.provider.send("hardhat_reset", []);
  });

  it("real pair reserves + real router failure safety on a live fork", async () => {
    await hre.network.provider.send("hardhat_reset", [
      { forking: { jsonRpcUrl: FORK_URL } },
    ]);
    const clients = await hre.viem.getWalletClients();
    const [owner, alice, carol] = clients;
    const publicClient = await hre.viem.getPublicClient();
    expect(await publicClient.getChainId()).to.equal(56);
    const WBNB_BUSD_PAIR = "0x58F876857a02D6762e0101bb5C46A8c1ED4764" as `0x${string}`;
    const libArtifact = await hre.artifacts.readArtifact("SwapLib");
    const libHash = await clients[0].deployContract({
      abi: libArtifact.abi,
      bytecode: libArtifact.bytecode,
    });
    const libReceipt = await publicClient.waitForTransactionReceipt({ hash: libHash });
    const lib = libReceipt.contractAddress as `0x${string}`;
    const libWriter = await hre.viem.getContractAt("SwapLib", lib);
    expect(await libWriter.read.pairHasLiquidity([WBNB_BUSD_PAIR])).to.equal(true);
    const tokenArtifact = await hre.artifacts.readArtifact("BNBTokenMakerToken");
    const config = baseConfig(owner.account.address, {
      buyTaxBps: 400,
      sellTaxBps: 600,
      marketingWallet: carol.account.address,
      marketingShareBps: 10000,
      liquidityShareBps: 0,
    });
    const tokenHash = await clients[0].deployContract({
      abi: tokenArtifact.abi,
      bytecode: linkSwapLib(
        tokenArtifact.bytecode,
        (tokenArtifact as unknown as { linkReferences: never }).linkReferences,
        lib
      ),
      args: [config],
    });
    const tokenReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenHash });
    expect(tokenReceipt.status).to.equal("success");
    const tokenAddress = tokenReceipt.contractAddress as `0x${string}`;
    const token = await hre.viem.getContractAt("BNBTokenMakerToken", tokenAddress);
    await token.write.setAMMPair([WBNB_BUSD_PAIR, true]);
    await token.write.transfer([alice.account.address, M("100000")]);
    const asAlice = await tokenAs(tokenAddress, alice);
    const sellHash = await asAlice.write.transfer([WBNB_BUSD_PAIR, M("1000")]);
    const sellReceipt = await publicClient.waitForTransactionReceipt({ hash: sellHash });
    expect(sellReceipt.status).to.equal("success");
    expect(await token.read.balanceOf([tokenAddress])).to.equal(M("60"));
  });
});
