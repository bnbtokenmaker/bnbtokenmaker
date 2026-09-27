/**
 * Phase 7D-F STAGE-B testnet deployment script (BSC Testnet, chain 97 ONLY).
 *
 * STAGE A STATUS: authored and audited, NEVER executed. Do not run without
 * explicit Stage-B approval and a funded testnet deployer.
 *
 * Usage (Stage B only):
 *   TESTNET_DEPLOYER_KEY=0x... \
 *   TESTNET_DEPLOYER_ADDRESS=0x... \
 *   TESTNET_FEE_RECIPIENT=0x... \
 *   TESTNET_QUOTE_SIGNER=0x... \
 *   TESTNET_MAX_FEE_WEI=500000000000000000 \
 *   BSC_TESTNET_RPC_URL=https://... \
 *   npx hardhat run scripts/deploy-testnet-v1.ts --network bscTestnet
 *
 * SAFETY:
 * - The FIRST on-chain read asserts chainId == 97; anything else aborts
 *   before any key use, signing, or spending.
 * - The deployer key is read from the environment, used only for signing
 *   the two deployment transactions, and NEVER printed, logged, persisted,
 *   or written to any file (manifest holds PUBLIC data only).
 * - The derived deployer address must equal TESTNET_DEPLOYER_ADDRESS or
 *   the run aborts (catches wrong-key mistakes before spending).
 * - Signing uses Hardhat's own signer stack (the same path all contract
 *   tests exercise), never raw key handling in userland.
 * - Idempotent: a previous manifest under testnet-deployments/ is verified
 *   on-chain step by step; completed steps are skipped, never repeated.
 * - Deploys ONLY the frozen production contracts (SwapLib, TokenFactory).
 *   No mocks, no spike code, no Phase-6 factory.
 */
import hre from "hardhat";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { keccak256, stringToHex } from "viem";

const EXPECTED_CHAIN_ID = 97;
const MANIFEST_PATH = join(process.cwd(), "testnet-deployments", "v1-manifest.json");

type Manifest = {
  schema: "bnbtokenmaker-testnet-v1/1";
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
    console.error(`deploy-testnet-v1: ${name} is not set — refusing to run.`);
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
    console.error("deploy-testnet-v1: existing manifest is unreadable — refusing to run.");
    process.exit(1);
  }
}

function saveManifest(manifest: Manifest): void {
  mkdirSync(join(process.cwd(), "testnet-deployments"), { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main(): Promise<void> {
  const deployerKey = requiredEnv("TESTNET_DEPLOYER_KEY");
  if (!/^0x[a-fA-F0-9]{64}$/.test(deployerKey)) {
    console.error("deploy-testnet-v1: TESTNET_DEPLOYER_KEY is malformed — refusing to run.");
    process.exit(1);
  }
  const deployerAddress = requiredEnv("TESTNET_DEPLOYER_ADDRESS");
  const feeRecipient = requiredEnv("TESTNET_FEE_RECIPIENT");
  const quoteSigner = requiredEnv("TESTNET_QUOTE_SIGNER");
  const maxFeeWeiRaw = requiredEnv("TESTNET_MAX_FEE_WEI");
  if (!isAddress(deployerAddress) || !isAddress(feeRecipient) || !isAddress(quoteSigner)) {
    console.error("deploy-testnet-v1: deployer/recipient/signer must be addresses.");
    process.exit(1);
  }
  if (!/^(0|[1-9][0-9]*)$/.test(maxFeeWeiRaw)) {
    console.error("deploy-testnet-v1: TESTNET_MAX_FEE_WEI must be a canonical integer string.");
    process.exit(1);
  }

  // Signing runs through Hardhat's own signer stack (key from the network
  // accounts configuration, same path every contract test exercises).
  const signers = await hre.viem.getWalletClients();
  if (signers.length === 0) {
    console.error("deploy-testnet-v1: no signer available — set TESTNET_DEPLOYER_KEY and retry.");
    process.exit(1);
  }
  const deployer = signers[0];
  const account = deployer.account;
  if (account.address.toLowerCase() !== deployerAddress.toLowerCase()) {
    console.error(
      "deploy-testnet-v1: derived deployer address does not match TESTNET_DEPLOYER_ADDRESS — wrong key. Refusing to run."
    );
    process.exit(1);
  }
  const publicClient = await hre.viem.getPublicClient();

  // GATE 1: live chain must be BSC Testnet. Queried via RAW JSON-RPC against
  // the configured network URL — never via a client that could report its
  // configured (rather than live) chain id.
  const netConfig = hre.network.config as { url?: string };
  if (!netConfig.url) {
    console.error(
      "deploy-testnet-v1: no RPC URL configured for this network — run with --network bscTestnet."
    );
    process.exit(1);
  }
  const chainId = await liveChainId(netConfig.url);
  if (chainId !== EXPECTED_CHAIN_ID) {
    console.error(
      `deploy-testnet-v1: live chain is ${chainId}, expected ${EXPECTED_CHAIN_ID} — refusing to run.`
    );
    process.exit(1);
  }
  console.log(`deploy-testnet-v1: chain ${chainId} OK; deployer ${account.address}`);

  // GATE 2: deployer tBNB balance covers the estimate + buffer.
  const [swapLibArtifact, factoryArtifact] = await Promise.all([
    hre.artifacts.readArtifact("SwapLib"),
    hre.artifacts.readArtifact("TokenFactory"),
  ]);
  const gasPrice = await publicClient.getGasPrice();
  const estimate = 7000000n; // measured ~6.1M total; rounded up with margin
  const required = estimate * gasPrice;
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(
    `deploy-testnet-v1: balance ${balance} wei; estimated need ~${required} wei at current gas price`
  );
  if (balance < required) {
    console.error(
      "deploy-testnet-v1: deployer tBNB balance is below the estimated requirement — fund via a testnet faucet and retry."
    );
    process.exit(1);
  }

  const manifest: Manifest = loadManifest() ?? {
    schema: "bnbtokenmaker-testnet-v1/1",
    chainId: EXPECTED_CHAIN_ID,
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    swapLib: { address: null, txHash: null, blockNumber: null, codeSha256: null },
    factory: {
      address: null,
      txHash: null,
      blockNumber: null,
      codeSha256: null,
      feeRecipient: feeRecipient.toLowerCase() as `0x${string}`,
      quoteSigner: quoteSigner.toLowerCase() as `0x${string}`,
      maxFeeWei: maxFeeWeiRaw,
    },
  };
  if (
    manifest.factory.feeRecipient.toLowerCase() !== feeRecipient.toLowerCase() ||
    manifest.factory.quoteSigner.toLowerCase() !== quoteSigner.toLowerCase() ||
    manifest.factory.maxFeeWei !== maxFeeWeiRaw
  ) {
    console.error(
      "deploy-testnet-v1: existing manifest targets different constructor parameters — refusing to run."
    );
    process.exit(1);
  }

  // STEP 1: SwapLib (skip when the recorded address already carries code).
  if (manifest.swapLib.address) {
    const code = await publicClient.getBytecode({ address: manifest.swapLib.address });
    if (!code || code === "0x") {
      console.error("deploy-testnet-v1: recorded SwapLib has no code — refusing to run.");
      process.exit(1);
    }
    console.log(`deploy-testnet-v1: SwapLib already deployed at ${manifest.swapLib.address} — skipping.`);
  } else {
    console.log("deploy-testnet-v1: deploying SwapLib…");
    const hash = await deployer.deployContract({
      abi: swapLibArtifact.abi,
      bytecode: swapLibArtifact.bytecode as `0x${string}`,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success" || !receipt.contractAddress) {
      console.error("deploy-testnet-v1: SwapLib deployment failed — refusing to continue.");
      process.exit(1);
    }
    const code = (await publicClient.getBytecode({ address: receipt.contractAddress })) ?? "0x";
    manifest.swapLib = {
      address: receipt.contractAddress,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(10),
      codeSha256: sha256Hex(code),
    };
    saveManifest(manifest);
    console.log(`deploy-testnet-v1: SwapLib at ${receipt.contractAddress} (block ${receipt.blockNumber}).`);
  }
  const swapLib = manifest.swapLib.address as `0x${string}`;

  // STEP 2: link + deploy TokenFactory (skip when verified on-chain).
  if (manifest.factory.address) {
    const code = await publicClient.getBytecode({ address: manifest.factory.address });
    if (!code || code === "0x") {
      console.error("deploy-testnet-v1: recorded factory has no code — refusing to run.");
      process.exit(1);
    }
    const reader = { address: manifest.factory.address, abi: factoryArtifact.abi } as const;
    const [onchainRecipient, onchainMaxFee] = await Promise.all([
      publicClient.readContract({ ...reader, functionName: "feeRecipient" } as never),
      publicClient.readContract({ ...reader, functionName: "MAX_FEE_WEI" } as never),
    ]);
    if (
      String(onchainRecipient).toLowerCase() !== feeRecipient.toLowerCase() ||
      String(onchainMaxFee) !== maxFeeWeiRaw
    ) {
      console.error("deploy-testnet-v1: recorded factory parameters mismatch — refusing to run.");
      process.exit(1);
    }
    // Signer has no getter by design: verify via the SignerUpdated event in
    // the recorded deployment transaction receipt.
    const SIGNER_UPDATED = keccak256(stringToHex("SignerUpdated(address)"));
    const oldReceipt = await publicClient.getTransactionReceipt({
      hash: manifest.factory.txHash as `0x${string}`,
    });
    const signerLogged = (oldReceipt?.logs ?? []).some(
      (log) =>
        log.address.toLowerCase() === (manifest.factory.address as string).toLowerCase() &&
        log.topics[0]?.toLowerCase() === SIGNER_UPDATED &&
        (log.topics[1] ?? "").toLowerCase().endsWith(quoteSigner.toLowerCase().slice(2))
    );
    if (!signerLogged) {
      console.error("deploy-testnet-v1: recorded factory signer event mismatch — refusing to run.");
      process.exit(1);
    }
    console.log(`deploy-testnet-v1: factory already deployed at ${manifest.factory.address} — skipping.`);
  } else {
    console.log("deploy-testnet-v1: linking + deploying TokenFactory…");
    const bytecode = linkBytecode(
      factoryArtifact.bytecode as string,
      (factoryArtifact as unknown as { linkReferences: LinkRefs }).linkReferences,
      swapLib
    );
    const hash = await deployer.deployContract({
      abi: factoryArtifact.abi,
      bytecode: bytecode as `0x${string}`,
      args: [feeRecipient, quoteSigner, BigInt(maxFeeWeiRaw)],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success" || !receipt.contractAddress) {
      console.error("deploy-testnet-v1: factory deployment failed — refusing to continue.");
      process.exit(1);
    }
    const code = (await publicClient.getBytecode({ address: receipt.contractAddress })) ?? "0x";
    manifest.factory.address = receipt.contractAddress;
    manifest.factory.txHash = hash;
    manifest.factory.blockNumber = receipt.blockNumber.toString(10);
    manifest.factory.codeSha256 = sha256Hex(code);
    saveManifest(manifest);
    console.log(`deploy-testnet-v1: factory at ${receipt.contractAddress} (block ${receipt.blockNumber}).`);
    console.log(
      "deploy-testnet-v1: verify the quote signer via the SignerUpdated event in the deployment transaction, then proceed to BscScan verification."
    );
  }

  console.log(`deploy-testnet-v1: complete. Manifest: ${MANIFEST_PATH}`);
}

type LinkRefs = Record<string, Record<string, Array<{ start: number; length: number }>>>;

/** Raw eth_chainId fetch (no client caching layers in between). */
async function liveChainId(rpcUrl: string): Promise<number> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
    signal: AbortSignal.timeout(20000),
  });
  const body = (await response.json()) as { result?: string };
  if (typeof body.result !== "string" || !/^0x[0-9a-fA-F]+$/.test(body.result)) {
    throw new Error("unreadable eth_chainId response");
  }
  return parseInt(body.result, 16);
}

function linkBytecode(bytecode: string, linkReferences: LinkRefs, library: string): string {
  let code = bytecode.replace(/^0x/, "");
  const address = library.toLowerCase().replace(/^0x/, "");
  let linked = 0;
  for (const fileRefs of Object.values(linkReferences ?? {})) {
    for (const slots of Object.values(fileRefs)) {
      for (const slot of slots) {
        const at = slot.start * 2;
        const len = slot.length * 2;
        code = code.slice(0, at) + address + code.slice(at + len);
        linked++;
      }
    }
  }
  if (linked === 0) throw new Error("no library slots linked");
  return `0x${code}`;
}

main().catch((error) => {
  console.error(`deploy-testnet-v1: FAILED — ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
