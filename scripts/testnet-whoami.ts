/**
 * Phase 7D-F testnet preflight (READ-ONLY; sends no transaction).
 *
 * Derives the deployer address from TESTNET_DEPLOYER_KEY via Hardhat's own
 * signer stack, prints address + live chain + balance, and proves the
 * signing path with a local message-signature self-check (no chain use).
 * Use it to confirm B1 outputs (key→address match) and pre-fund status
 * before Stage B3. NEVER prints the key.
 *
 * Usage:
 *   TESTNET_DEPLOYER_KEY=0x... npx hardhat run scripts/testnet-whoami.ts [--network bscTestnet]
 */
import hre from "hardhat";

async function main(): Promise<void> {
  const key = (process.env.TESTNET_DEPLOYER_KEY ?? "").trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(key)) {
    console.error("testnet-whoami: TESTNET_DEPLOYER_KEY is not set or malformed.");
    process.exit(1);
  }
  const clients = await hre.viem.getWalletClients();
  if (clients.length === 0) {
    console.error("testnet-whoami: no signer available (key not picked up by the network config).");
    process.exit(1);
  }
  const address = clients[0].account.address;
  console.log(`testnet-whoami: deployer address ${address}`);

  // Local signing self-check: sign a fixed message, recover, compare.
  // Proves the B3 signing path without touching any chain.
  const message = "BNBTokenMaker testnet preflight";
  const signature = await clients[0].signMessage({ message });
  const { recoverMessageAddress } = await import("viem");
  const recovered = await recoverMessageAddress({ message, signature });
  if (recovered.toLowerCase() !== address.toLowerCase()) {
    console.error("testnet-whoami: signing self-check FAILED.");
    process.exit(1);
  }
  console.log("testnet-whoami: signing self-check OK");

  // Live reads only (balance + chain id); no transaction is ever sent.
  try {
    const publicClient = await hre.viem.getPublicClient();
    const chainId = await publicClient.getChainId();
    const balance = await publicClient.getBalance({ address });
    console.log(`testnet-whoami: live chainId ${chainId}; balance ${balance} wei`);
  } catch (error) {
    console.log(
      `testnet-whoami: live reads unavailable (${error instanceof Error ? error.message.slice(0, 80) : String(error)}).`
    );
  }
}

main().catch((error) => {
  console.error(`testnet-whoami: FAILED — ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
