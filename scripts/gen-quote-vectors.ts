/**
 * Generates deterministic EIP-712 deployment-quote test vectors.
 * Run: npx hardhat run scripts/gen-quote-vectors.ts
 * Writes contracts/freeze/vectors.json
 *
 * Deterministic: fixed sample config/factory/chain/nonce/expiry plus
 * Hardhat's fixed default signer key (TEST ONLY — never a real signer) and
 * RFC-6979 signatures. Backend/frontend tests reuse these vectors to prove
 * their configHash + typed-data encoding never drifts from frozen contracts.
 */
import hre from "hardhat";
import "@nomicfoundation/hardhat-viem"; // type augmentation for hre.viem
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  encodeAbiParameters,
  hashTypedData,
  keccak256,
  parseEther,
  parseUnits,
  recoverTypedDataAddress,
  stringToHex,
} from "viem";

const M = (v: string) => parseUnits(v, 18);
const SAMPLE_FACTORY = "0x1111111111111111111111111111111111111111" as `0x${string}`;
const SAMPLE_OWNER = "0x2222222222222222222222222222222222222222" as `0x${string}`;
const SAMPLE_MARKETING = "0x3333333333333333333333333333333333333333" as `0x${string}`;
const CHAIN_ID = 56;
const EXPIRY = 1893456000; // 2030-01-01T00:00:00Z
const PRICING_VERSION = keccak256(stringToHex("v1-freeze"));

const TOKEN_COMPONENTS = [
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
] as const;

const QUOTE_TYPES = {
  DeployQuote: [
    { name: "configHash", type: "bytes32" },
    { name: "feeWei", type: "uint256" },
    { name: "chainId", type: "uint256" },
    { name: "factory", type: "address" },
    { name: "nonce", type: "bytes32" },
    { name: "expiry", type: "uint256" },
    { name: "pricingVersion", type: "bytes32" },
  ],
} as const;

function baseToken(overrides: Record<string, unknown> = {}) {
  return {
    name: "Vector Token",
    symbol: "VCTR",
    decimals: 18,
    initialSupply: M("1000000"),
    owner: SAMPLE_OWNER,
    burnable: false,
    mintable: false,
    pausable: false,
    maxTxAmount: 0n,
    maxWalletAmount: 0n,
    blacklistEnabled: false,
    whitelistEnabled: false,
    buyTaxBps: 0,
    sellTaxBps: 0,
    marketingWallet: "0x0000000000000000000000000000000000000000",
    marketingShareBps: 0,
    liquidityShareBps: 0,
    autoLiquidityEnabled: false,
    swapThreshold: 0n,
    antiBotEnabled: false,
    snipeBlocks: 0n,
    maxSupply: 0n,
    ...overrides,
  };
}

async function main() {
  const [signer] = await hre.viem.getWalletClients();
  const domain = {
    name: "BNBTokenMaker",
    version: "1",
    chainId: CHAIN_ID,
    verifyingContract: SAMPLE_FACTORY,
  } as const;

  async function vector(label: string, token: Record<string, unknown>, feeWei: bigint, nonceSeed: string) {
    const PARAMS = {
      type: "tuple",
      components: [{ type: "tuple", components: [...TOKEN_COMPONENTS], name: "token" }],
    } as const;
    // Object form (same shape the factory tests prove on-chain)...
    const hashA = keccak256(encodeAbiParameters([PARAMS], [{ token }] as never));
    // ...versus positional form (exercises a different encoder path).
    const ordered = [...TOKEN_COMPONENTS].map((c) => (token as Record<string, unknown>)[c.name]);
    const hashB = keccak256(encodeAbiParameters([PARAMS], [[ordered]] as never));
    if (hashA !== hashB) throw new Error(`encoding drift in ${label}`);
    const configHash = hashA;
    const message = {
      configHash,
      feeWei,
      chainId: BigInt(CHAIN_ID),
      factory: SAMPLE_FACTORY,
      nonce: keccak256(stringToHex(nonceSeed)),
      expiry: BigInt(EXPIRY),
      pricingVersion: PRICING_VERSION,
    };
    const digest = hashTypedData({ domain, types: QUOTE_TYPES, primaryType: "DeployQuote", message });
    const signature = await signer.signTypedData({
      domain,
      types: QUOTE_TYPES,
      primaryType: "DeployQuote",
      message,
    } as never);
    const recovered = await recoverTypedDataAddress({
      domain,
      types: QUOTE_TYPES,
      primaryType: "DeployQuote",
      message,
      signature,
    });
    if (recovered.toLowerCase() !== signer.account.address.toLowerCase()) {
      throw new Error(`self-check failed for ${label}`);
    }
    return { label, token, quote: message, configHash, digest, signature, signer: signer.account.address };
  }

  // The factory test-suite proves the PARAMS_TUPLE wrapping end-to-end
  // on-chain; this file pins the resulting digests for backend/frontend.
  const token = baseToken();
  const check = await vector("base-only", token, parseEther("0.05"), "vector-base-only");

  const fullMonty = await vector(
    "full-monty",
    baseToken({
      burnable: true,
      mintable: true,
      pausable: true,
      maxTxAmount: M("10000"),
      maxWalletAmount: M("20000"),
      blacklistEnabled: true,
      whitelistEnabled: true,
      buyTaxBps: 400,
      sellTaxBps: 600,
      marketingWallet: SAMPLE_MARKETING,
      marketingShareBps: 7000,
      liquidityShareBps: 3000,
      autoLiquidityEnabled: true,
      swapThreshold: M("1000"),
      antiBotEnabled: true,
      snipeBlocks: 10n,
      maxSupply: M("10000000"),
    }),
    parseEther("0.35"),
    "vector-full-monty"
  );

  const replacer = (_: string, v: unknown) =>
    typeof v === "bigint" ? `bigint:${v.toString()}` : (v as unknown);
  const vectors = {
    schema: "bnbtokenmaker-quote-vectors/1",
    note: "Deterministic fixtures. Sample addresses/factory/signer are TEST ONLY and never used on any chain.",
    domain: { ...domain, chainId: `bigint:${CHAIN_ID}` },
    types: QUOTE_TYPES,
    cases: [check, fullMonty],
  };
  mkdirSync(join(process.cwd(), "contracts", "freeze"), { recursive: true });
  writeFileSync(
    join(process.cwd(), "contracts", "freeze", "vectors.json"),
    `${JSON.stringify(vectors, replacer, 2)}\n`
  );
  for (const c of vectors.cases) {
    console.log(`${c.label}: configHash=${c.configHash} digest=${c.digest}`);
  }
  console.log("wrote contracts/freeze/vectors.json (signatures self-verified)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
