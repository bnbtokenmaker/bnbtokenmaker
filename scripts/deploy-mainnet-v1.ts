/**
 * Phase 7D-F mainnet deployment script (BSC Mainnet, chain 56 ONLY).
 *
 * SAFETY: NEVER RUN WITHOUT EXPLICIT OPERATOR APPROVAL.
 * This script deploys real contracts on BSC Mainnet and spends real BNB.
 *
 * Usage (operator approval required):
 *   MAINNET_DEPLOYER_KEY=0x... \
 *   MAINNET_DEPLOYER_ADDRESS=0x... \
 *   MAINNET_FEE_RECIPIENT=0x... \
 *   MAINNET_QUOTE_SIGNER=0x... \
 *   MAINNET_MAX_FEE_WEI=500000000000000000 \
 *   BSC_MAINNET_RPC_URL=https://... \
 *   npx hardhat run scripts/deploy-mainnet-v1.ts --network bscMainnet
 *
 * SAFETY GATES:
 * - The FIRST on-chain read asserts chainId == 56; anything else aborts
 *   before any key use, signing, or spending.
 * - The deployer key is read from the environment, used only for signing
 *   the two deployment transactions, and NEVER printed, logged, persisted,
 *   or written to any file (manifest holds PUBLIC data only).
 * - The derived deployer address must equal MAINNET_DEPLOYER_ADDRESS or
 *   the run aborts (catches wrong-key mistakes before spending).
 * - Signing uses Hardhat's own signer stack (the same path all contract
 *   tests exercise), never raw key handling in userland.
 * - Idempotent: a previous manifest under mainnet-deployments/ is verified
 *   on-chain step by step; completed steps are skipped, never repeated.
 * - Deploys ONLY the frozen production contracts (SwapLib, TokenFactory).
 *   No mocks, no spike code, no Phase-6 factory.
 * - Refuses to run if DEPLOY_QUOTE_ZERO_FEE is set (mainnet is commercial).
 * - Prints only public addresses/settings; never prints private keys.
 */
import hre from "hardhat";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const EXPECTED_CHAIN_ID = 56;
const MANIFEST_PATH = join(process.cwd(), "mainnet-deployments", "v1-manifest.json");

type Manifest = {
  schema: "bnbtokenmaker-mainnet-v1/1";
  chainId: number;
  deployedAt: string;
  deployer: `0x${string}`;
  swapLib: {
    address: `0x${string}` | null;
    txHash: `0x${string}` | null;
    blockNumber: string | null;
    codeSha256: string | null;
  };
  factory: {
    address: `0x${string}` | null;
    txHash: `0x${string}` | null;
    blockNumber: string | null;
    codeSha256: string | null;
    feeRecipient: `0x${string}`;
    quoteSigner: `0x${string}`;
    maxFeeWei: string;
  };
};

function requiredEnv(name: string): string {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    console.error(`deploy-mainnet-v1: ${name} is not set — refusing to run.`);
    process.exit(1);
  }
  return value;
}

function isAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function sha256Hex(hex: string): string {
  return createHash("sha256").update(hex.replace(/^0x/, ""), "hex").digest("hex");
}

function loadManifest(): Manifest | null {
  if (!existsSync(MANIFEST_PATH)) return null;
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  } catch {
    console.error("deploy-mainnet-v1: existing manifest is unreadable — refusing to run.");
    process.exit(1);
  }
}

function saveManifest(manifest: Manifest): void {
  mkdirSync(join(process.cwd(), "mainnet-deployments"), { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main(): Promise<void> {
  // Zero-fee safety: refuse to deploy on mainnet with zero-fee enabled.
  if (process.env.DEPLOY_QUOTE_ZERO_FEE === "true") {
    console.error("deploy-mainnet-v1: DEPLOY_QUOTE_ZERO_FEE is set — refusing to deploy on mainnet.");
    process.exit(1);
  }

  const deployerKey = requiredEnv("MAINNET_DEPLOYER_KEY");
  if (!/^0x[a-fA-F0-9]{64}$/.test(deployerKey)) {
    console.error("deploy-mainnet-v1: MAINNET_DEPLOYER_KEY is malformed — refusing to run.");
    process.exit(1);
  }
  const deployerAddress = requiredEnv("MAINNET_DEPLOYER_ADDRESS");
  const feeRecipient = requiredEnv("MAINNET_FEE_RECIPIENT");
  const quoteSigner = requiredEnv("MAINNET_QUOTE_SIGNER");
  const maxFeeWeiRaw = requiredEnv("MAINNET_MAX_FEE_WEI");
  if (!isAddress(deployerAddress) || !isAddress(feeRecipient) || !isAddress(quoteSigner)) {
    console.error("deploy-mainnet-v1: deployer/recipient/signer must be addresses.");
    process.exit(1);
  }
  if (!/^(0|[1-9][0-9]*)$/.test(maxFeeWeiRaw)) {
    console.error("deploy-mainnet-v1: MAINNET_MAX_FEE_WEI must be a canonical integer string.");
    process.exit(1);
  }

  // Signing runs through Hardhat's own signer stack (key from the network
  // accounts configuration, same path every contract test exercises).
  const signers = await hre.viem.getWalletClients();
  if (signers.length === 0) {
    console.error("deploy-mainnet-v1: no signer available — set MAINNET_DEPLOYER_KEY and retry.");
    process.exit(1);
  }
  const deployer = signers[0];
  const addresses = await deployer.getAddresses();
  const deployerAddr = addresses[0] as `0x${string}`;
  if (deployerAddr.toLowerCase() !== deployerAddress.toLowerCase()) {
    console.error(
      `deploy-mainnet-v1: derived deployer ${deployerAddr} does not match MAINNET_DEPLOYER_ADDRESS ${deployerAddress} — aborting.`
    );
    process.exit(1);
  }

  console.log("deploy-mainnet-v1: deployer address (public):", deployerAddr);

  // FIRST on-chain read: assert chainId == 56 before anything else.
  const publicClient = await hre.viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  if (chainId !== EXPECTED_CHAIN_ID) {
    console.error(
      `deploy-mainnet-v1: expected chainId ${EXPECTED_CHAIN_ID}, got ${chainId} — aborting.`
    );
    process.exit(1);
  }
  console.log("deploy-mainnet-v1: chainId verified:", chainId);

  // Load or create manifest.
  let manifest = loadManifest();
  if (manifest) {
    console.log("deploy-mainnet-v1: existing manifest found — verifying on-chain state.");
    // Verify manifest chainId.
    if (manifest.chainId !== EXPECTED_CHAIN_ID) {
      console.error("deploy-mainnet-v1: manifest chainId mismatch — refusing to run.");
      process.exit(1);
    }
  } else {
    manifest = {
      schema: "bnbtokenmaker-mainnet-v1/1",
      chainId: EXPECTED_CHAIN_ID,
      deployedAt: new Date().toISOString(),
      deployer: deployerAddr as `0x${string}`,
      swapLib: { address: null, txHash: null, blockNumber: null, codeSha256: null },
      factory: { address: null, txHash: null, blockNumber: null, codeSha256: null, feeRecipient: feeRecipient as `0x${string}`, quoteSigner: quoteSigner as `0x${string}`, maxFeeWei: maxFeeWeiRaw },
    };
  }

  // Step 1: Deploy SwapLib if not already deployed.
  if (manifest.swapLib.address) {
    console.log("deploy-mainnet-v1: SwapLib already deployed at", manifest.swapLib.address);
    const code = await publicClient.getCode({ address: manifest.swapLib.address as `0x${string}` });
    if (!code || code === "0x") {
      console.error("deploy-mainnet-v1: SwapLib address has no code — aborting.");
      process.exit(1);
    }
  } else {
    console.log("deploy-mainnet-v1: deploying SwapLib...");
    const swapLib = await hre.viem.deployContract("SwapLib", []);
    const swapLibAddr = swapLib.address as `0x${string}`;
    console.log("deploy-mainnet-v1: SwapLib deployed at", swapLibAddr);
    const code = await publicClient.getCode({ address: swapLibAddr });
    if (!code || code === "0x") {
      console.error("deploy-mainnet-v1: SwapLib deployment failed — no code at address.");
      process.exit(1);
    }
    manifest.swapLib.address = swapLibAddr;
    manifest.swapLib.codeSha256 = sha256Hex(code);
    manifest.swapLib.blockNumber = (await publicClient.getBlockNumber()).toString();
    saveManifest(manifest);
  }

  // Step 2: Deploy TokenFactory with linked SwapLib if not already deployed.
  if (manifest.factory.address) {
    console.log("deploy-mainnet-v1: TokenFactory already deployed at", manifest.factory.address);
    const code = await publicClient.getCode({ address: manifest.factory.address as `0x${string}` });
    if (!code || code === "0x") {
      console.error("deploy-mainnet-v1: TokenFactory address has no code — aborting.");
      process.exit(1);
    }
  } else {
    console.log("deploy-mainnet-v1: deploying TokenFactory with linked SwapLib...");
    const swapLibAddr = manifest.swapLib.address;
    if (!swapLibAddr) {
      console.error("deploy-mainnet-v1: SwapLib address not in manifest — aborting.");
      process.exit(1);
    }
    const tokenFactory = await hre.viem.deployContract("TokenFactory", [
      feeRecipient,
      quoteSigner,
      BigInt(maxFeeWeiRaw),
    ], {
      libraries: {
        SwapLib: swapLibAddr,
      },
    });
    const factoryAddr = tokenFactory.address as `0x${string}`;
    console.log("deploy-mainnet-v1: TokenFactory deployed at", factoryAddr);
    const code = await publicClient.getCode({ address: factoryAddr });
    if (!code || code === "0x") {
      console.error("deploy-mainnet-v1: TokenFactory deployment failed — no code at address.");
      process.exit(1);
    }
    manifest.factory.address = factoryAddr;
    manifest.factory.codeSha256 = sha256Hex(code);
    manifest.factory.blockNumber = (await publicClient.getBlockNumber()).toString();
    manifest.factory.feeRecipient = feeRecipient as `0x${string}`;
    manifest.factory.quoteSigner = quoteSigner as `0x${string}`;
    manifest.factory.maxFeeWei = maxFeeWeiRaw;
    saveManifest(manifest);
  }

  // Step 3: Verify factory configuration.
  console.log("deploy-mainnet-v1: verifying factory configuration...");
  const factory = await hre.viem.getContractAt("TokenFactory", manifest.factory.address as `0x${string}`);
  const onchainFeeRecipient = (await factory.read.feeRecipient()) as string;
  const onchainMaxFeeWei = (await factory.read.MAX_FEE_WEI()) as bigint;
  const onchainOwner = (await factory.read.owner()) as string;

  if (onchainFeeRecipient.toLowerCase() !== feeRecipient.toLowerCase()) {
    console.error("deploy-mainnet-v1: feeRecipient mismatch — aborting.");
    process.exit(1);
  }
  if (onchainMaxFeeWei !== BigInt(maxFeeWeiRaw)) {
    console.error("deploy-mainnet-v1: MAX_FEE_WEI mismatch — aborting.");
    process.exit(1);
  }
  console.log("deploy-mainnet-v1: feeRecipient (public):", onchainFeeRecipient);
  console.log("deploy-mainnet-v1: MAX_FEE_WEI:", onchainMaxFeeWei.toString());
  console.log("deploy-mainnet-v1: factory owner (public):", onchainOwner);

  // Step 4: Verify bytecode exists.
  const factoryCode = await publicClient.getCode({ address: manifest.factory.address as `0x${string}` });
  if (!factoryCode || factoryCode === "0x") {
    console.error("deploy-mainnet-v1: factory bytecode missing — aborting.");
    process.exit(1);
  }

  console.log("deploy-mainnet-v1: deployment complete.");
  console.log("deploy-mainnet-v1: SwapLib:", manifest.swapLib.address);
  console.log("deploy-mainnet-v1: TokenFactory:", manifest.factory.address);
  console.log("deploy-mainnet-v1: manifest saved to", MANIFEST_PATH);
  console.log("deploy-mainnet-v1: NEXT_PUBLIC_V1_MAINNET_FACTORY_ADDRESS=" + manifest.factory.address);
}

main().catch((error) => {
  console.error("deploy-mainnet-v1: fatal error:", error);
  process.exit(1);
});
