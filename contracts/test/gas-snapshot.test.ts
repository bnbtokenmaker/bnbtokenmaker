/**
 * Gas snapshot (migrated from spike findings): factory deployment + per-shape
 * token creation through signed EIP-712 quotes. Asserts success and generous
 * upper bounds (bloat guardrails, not exact values). In-process only.
 */
import { expect } from "chai";
import hre from "hardhat";
import {
  encodeAbiParameters,
  keccak256,
  parseEther,
  parseUnits,
  stringToHex,
} from "viem";
import { accounts, baseConfig, deployFactory } from "./helpers";

const M = (v: string) => parseUnits(v, 18);

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

describe("Gas snapshot (V1 freeze reference)", () => {
  it("records factory deployment + per-shape creation gas", async () => {
    const { owner, alice } = await accounts();
    const publicClient = await hre.viem.getPublicClient();
    const chainId = await publicClient.getChainId();
    const factory = await deployFactory(
      alice.account.address,
      owner.account.address,
      parseEther("5")
    );

    const shapes: Array<{ label: string; fee: bigint; overrides: Record<string, unknown> }> = [
      { label: "base-only", fee: parseEther("0.05"), overrides: {} },
      {
        label: "classic-full",
        fee: parseEther("0.12"),
        overrides: {
          burnable: true,
          mintable: true,
          pausable: true,
          maxTxAmount: M("10000"),
          maxWalletAmount: M("20000"),
          blacklistEnabled: true,
        },
      },
      {
        label: "trading-only",
        fee: parseEther("0.20"),
        overrides: {
          buyTaxBps: 400,
          sellTaxBps: 600,
          marketingWallet: alice.account.address,
          marketingShareBps: 10000,
          liquidityShareBps: 0,
        },
      },
      {
        label: "full-monty",
        fee: parseEther("0.35"),
        overrides: {
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
        },
      },
    ];

    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];
      const token = baseConfig(owner.account.address, shape.overrides);
      const configHash = keccak256(
        encodeAbiParameters(
          [{ type: "tuple", components: [{ ...TOKEN_TUPLE, name: "token" }] }],
          [{ token }] as never
        )
      );
      const quote = {
        configHash,
        feeWei: shape.fee,
        chainId: BigInt(chainId),
        factory: factory.address,
        nonce: keccak256(stringToHex(`gas-snapshot-${i}`)),
        expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
        pricingVersion: keccak256(stringToHex("v1-freeze")),
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
      const hash = await factory.write.createToken([{ token }, quote, signature] as never, {
        value: shape.fee,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");
      console.log(`      createToken[${shape.label}] gas: ${receipt.gasUsed}`);
      expect(receipt.gasUsed < 3000000n).to.equal(true);
    }
  });
});
