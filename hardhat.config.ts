import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-viem";
import "@nomicfoundation/hardhat-verify";

/**
 * Phase 6B contract tooling. Deliberately minimal: compile + in-process
 * tests + testnet deployment helpers. No mainnet keys, no custodial signers.
 *
 * - Compile:   npx hardhat compile
 * - Test:      npx hardhat test
 * - Testnet deploy (manual, wallet-signed; see contracts/README): uses
 *   BSC_TESTNET_RPC_URL for reads only. Private keys are NEVER read here.
 * - Verify:    BscScan Testnet via BSCSCAN_API_KEY (optional, blank = skip).
 */
const BSC_TESTNET_RPC_URL =
  (process.env.BSC_TESTNET_RPC_URL ?? "").trim() ||
  "https://data-seed-prebsc-1-s1.binance.org:8545/";

const BSCSCAN_API_KEY = (process.env.BSCSCAN_API_KEY ?? "").trim();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // Paris: safe for BSC mainnet/testnet (no post-Paris opcodes).
      evmVersion: "paris",
      // Reproducible metadata: no per-machine bytecode drift.
      metadata: { bytecodeHash: "ipfs" },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts/test",
    cache: "./contracts/.cache",
    artifacts: "./contracts/.artifacts",
  },
  networks: {
    hardhat: {},
    bscTestnet: {
      url: BSC_TESTNET_RPC_URL,
      chainId: 97,
      // No accounts configured on purpose: Phase 6B performs NO automated
      // signing. Testnet deployment is wallet-signed manually (see README).
    },
  },
  etherscan: {
    apiKey: {
      bscTestnet: BSCSCAN_API_KEY,
    },
    customChains: [
      {
        network: "bscTestnet",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com",
        },
      },
    ],
  },
  sourcify: { enabled: true },
};

export default config;
