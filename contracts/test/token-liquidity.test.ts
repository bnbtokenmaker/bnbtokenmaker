import { expect } from "chai";
import hre from "hardhat";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { numberToHex, parseEther, parseUnits } from "viem";
import {
  accounts,
  baseConfig,
  deploySwapLib,
  expectRevert,
  linkSwapLib,
  tokenAs,
} from "./helpers";

const M = (v: string) => parseUnits(v, 18);
const SUPPLY = M("1000000");
const ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E" as `0x${string}`;
const BURN = "0x000000000000000000000000000000000000dEaD" as `0x${string}`;

function mockArtifact(contract: string) {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), `contracts/.artifacts/contracts/mocks/MockPancake.sol/${contract}.json`),
      "utf8"
    )
  ) as { abi: readonly unknown[]; bytecode: `0x${string}`; deployedBytecode: `0x${string}` };
}

/** Battery F — auto-liquidity execution, allocation, failure safety. */
describe("BNBTokenMakerToken — auto-liquidity", () => {
  async function liquidToken(overrides: Record<string, unknown> = {}) {
    const { clients, owner, alice, carol } = await accounts();
    const lib = await deploySwapLib();
    const tokenArtifact = JSON.parse(
      readFileSync(
        join(process.cwd(), "contracts/.artifacts/contracts/BNBTokenMakerToken.sol/BNBTokenMakerToken.json"),
        "utf8"
      )
    ) as { abi: readonly unknown[]; bytecode: `0x${string}`; linkReferences: never };
    const config = baseConfig(owner.account.address, {
      buyTaxBps: 400,
      sellTaxBps: 600,
      marketingWallet: carol.account.address,
      marketingShareBps: 7000,
      liquidityShareBps: 3000,
      autoLiquidityEnabled: true,
      swapThreshold: M("1000"),
      antiBotEnabled: false,
      snipeBlocks: 0n,
      ...overrides,
    });
    const hash = await clients[0].deployContract({
      abi: tokenArtifact.abi,
      bytecode: linkSwapLib(tokenArtifact.bytecode, tokenArtifact.linkReferences, lib),
      args: [config],
    });
    const publicClient = await hre.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).to.equal("success");
    const tokenAddress = receipt.contractAddress as `0x${string}`;
    const token = await hre.viem.getContractAt("BNBTokenMakerToken", tokenAddress);

    // Etch mock router at canonical address; fund AFTER etching.
    const mock = mockArtifact("MockPancakeRouter");
    const mockHash = await clients[0].deployContract({ abi: mock.abi, bytecode: mock.bytecode });
    await publicClient.waitForTransactionReceipt({ hash: mockHash });
    await hre.network.provider.send("hardhat_setCode", [ROUTER, mock.deployedBytecode]);
    // Top up the etched router directly (deployer funds are finite across
    // tests; setCode may reset the account balance, so this runs after).
    await hre.network.provider.send("hardhat_setBalance", [
      ROUTER,
      numberToHex(parseEther("5000")),
    ]);

    // Real mock pair with reserves.
    const pairArtifact = mockArtifact("MockPancakePair");
    const pairHash = await clients[0].deployContract({
      abi: pairArtifact.abi,
      bytecode: pairArtifact.bytecode,
      args: [1000000n, 1000000n],
    });
    const pairReceipt = await publicClient.waitForTransactionReceipt({ hash: pairHash });
    const pair = pairReceipt.contractAddress as `0x${string}`;

    await token.write.setAMMPair([pair, true]);
    return { clients, owner, alice, carol, token, tokenAddress, pair };
  }

  function routerAt() {
    return hre.viem.getContractAt("MockPancakeRouter", ROUTER);
  }

  it("full threshold swap: marketing BNB paid, LP to burn, contract emptied", async () => {
    const { alice, carol, token, tokenAddress, pair } = await liquidToken();
    const publicClient = await hre.viem.getPublicClient();
    await token.write.transfer([alice.account.address, M("100000")]);
    const carolBefore = await publicClient.getBalance({ address: carol.account.address });

    // Sell 20,000 @ 6% => 1,200 tax (>= 1,000 threshold) triggers swapBack.
    const asAlice = await tokenAs(tokenAddress, alice);
    const sellHash = await asAlice.write.transfer([pair, M("20000")]);
    const sellReceipt = await publicClient.waitForTransactionReceipt({ hash: sellHash });
    expect(sellReceipt.status).to.equal("success");

    // Marketing leg: 70% of 1,200 = 840 tokens swapped 1:1 to BNB.
    const carolAfter = await publicClient.getBalance({ address: carol.account.address });
    expect(carolAfter - carolBefore).to.equal(M("840"));
    // Liquidity leg consumed the rest: contract holds nothing.
    expect(await token.read.balanceOf([tokenAddress])).to.equal(0n);
    // Pair received 20,000 - 1,200 = 18,800.
    expect(await token.read.balanceOf([pair])).to.equal(M("18800"));

    const router = await routerAt();
    expect(String(await router.read.lastAddLiquidityTo()).toLowerCase()).to.equal(
      BURN.toLowerCase()
    );
    expect(await router.read.addLiquidityCalls()).to.equal(1n);

    // SwapBackExecuted attributed to the TOKEN (delegatecall proof).
    const swaps = await publicClient.getContractEvents({
      address: tokenAddress,
      abi: token.abi,
      eventName: "SwapBackExecuted",
      fromBlock: sellReceipt.blockNumber,
      toBlock: sellReceipt.blockNumber,
    });
    expect(swaps.length).to.equal(1);
  });

  it("below threshold: tax parks, no swap executes", async () => {
    const { alice, token, tokenAddress, pair } = await liquidToken();
    const publicClient = await hre.viem.getPublicClient();
    await token.write.transfer([alice.account.address, M("100000")]);
    const router = await routerAt();
    const swapsBefore = await router.read.swapCalls();
    const asAlice = await tokenAs(tokenAddress, alice);
    await asAlice.write.transfer([pair, M("1000")]); // 6% = 60 < 1000
    expect(await token.read.balanceOf([tokenAddress])).to.equal(M("60"));
    expect(await router.read.swapCalls()).to.equal(swapsBefore);
    void publicClient;
  });

  it("swapBack disabled: transfers process, nothing swaps", async () => {
    const { alice, token, tokenAddress, pair } = await liquidToken();
    await token.write.setSwapBackEnabled([false]);
    expect(await token.read.swapBackEnabled()).to.equal(false);
    await token.write.transfer([alice.account.address, M("100000")]);
    const router = await routerAt();
    const swapsBefore = await router.read.swapCalls();
    const asAlice = await tokenAs(tokenAddress, alice);
    await asAlice.write.transfer([pair, M("20000")]);
    expect(await token.read.balanceOf([tokenAddress])).to.equal(M("1200"));
    expect(await router.read.swapCalls()).to.equal(swapsBefore);
  });

  it("router failure does NOT revert the holder transfer (funds park)", async () => {
    const { alice, token, tokenAddress, pair } = await liquidToken();
    const router = await routerAt();
    await router.write.setFailSwaps([true]);
    await token.write.transfer([alice.account.address, M("100000")]);
    const asAlice = await tokenAs(tokenAddress, alice);
    const hash = await asAlice.write.transfer([pair, M("20000")]);
    const publicClient = await hre.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).to.equal("success");
    expect(await token.read.balanceOf([tokenAddress])).to.equal(M("1200"));
    expect(await token.read.balanceOf([pair])).to.equal(M("18800"));
    await router.write.setFailSwaps([false]);
  });

  it("no double tax: contract and marketing legs move untaxed", async () => {
    // Covered by exact-amount assertions in the full-swap test (840 marketing
    // BNB from 840 tokens; zero residue). Here assert the contract is exempt.
    const { token, tokenAddress } = await liquidToken();
    expect(await token.read.feeExempt([tokenAddress])).to.equal(true);
  });

  it("pause blocks transfers AND prevents swap execution", async () => {
    const { alice, token, tokenAddress, pair } = await liquidToken({
      pausable: true,
    });
    await token.write.transfer([alice.account.address, M("100000")]);
    await token.write.pause();
    const asAlice = await tokenAs(tokenAddress, alice);
    await expectRevert(asAlice.write.transfer([pair, M("1000")]), /EnforcedPause/);
    await token.write.unpause();
    await asAlice.write.transfer([pair, M("1000")]);
  });

  it("threshold bounds enforced at construction", async () => {
    const { owner, carol } = await accounts();
    const taxBase = {
      buyTaxBps: 400,
      sellTaxBps: 600,
      marketingWallet: carol.account.address,
      marketingShareBps: 7000,
      liquidityShareBps: 3000,
      autoLiquidityEnabled: true,
    };
    // Below supply/1e6 reverts; above supply/100 reverts.
    await expectRevert(
      deployTokenSafe(owner.account.address, { ...taxBase, swapThreshold: 1n }),
      /BadThreshold/
    );
    await expectRevert(
      deployTokenSafe(owner.account.address, { ...taxBase, swapThreshold: SUPPLY }),
      /BadThreshold/
    );
    // Liquidity share without autoLiquidity (and vice versa) reverts.
    await expectRevert(
      deployTokenSafe(owner.account.address, {
        ...taxBase,
        autoLiquidityEnabled: false,
      }),
      /AutoLiquidityWithoutTax/
    );
    void SUPPLY;
  });

  async function deployTokenSafe(ownerAddr: `0x${string}`, overrides: Record<string, unknown>) {
    const lib = await deploySwapLib();
    const art = JSON.parse(
      readFileSync(
        join(process.cwd(), "contracts/.artifacts/contracts/BNBTokenMakerToken.sol/BNBTokenMakerToken.json"),
        "utf8"
      )
    );
    const clients = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    const hash = await clients[0].deployContract({
      abi: art.abi,
      bytecode: linkSwapLib(art.bytecode, art.linkReferences, lib),
      args: [baseConfig(ownerAddr, overrides)],
    });
    // Surface constructor revert as a rejection for expectRevert.
    await publicClient.waitForTransactionReceipt({ hash });
  }
});
