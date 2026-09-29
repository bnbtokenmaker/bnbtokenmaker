import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-viem";
import "@nomicfoundation/hardhat-verify";

/**
 * Phase 6B/7D contract tooling. Deliberately minimal: compile + in-process
 * tests + testnet/mainnet deployment helpers.
 *
 * - Compile:   npx hardhat compile
 * - Test:      npx hardhat test
 * - Testnet deploy: uses BSC_TESTNET_RPC_URL + TESTNET_DEPLOYER_KEY (optional)
 * - Mainnet deploy: uses BSC_MAINNET_RPC_URL + MAINNET_DEPLOYER_KEY (optional)
 * - Verify:    BscScan via BSCSCAN_API_KEY (optional, blank = skip)
 *
 * No mainnet private key is required to run ordinary tests/build.
 * Testnet configuration continues to work unchanged.
 */
const BSC_TESTNET_RPC_URL =
  (process.env.BSC_TESTNET_RPC_URL ?? "").trim() ||
  "https://data-seed-prebsc-1-s1.binance.org:8545/";

const BSC_MAINNET_RPC_URL =
  (process.env.BSC_MAINNET_RPC_URL ?? "").trim();

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
      // 7D-F Stage B: the automated testnet deployment signs locally via
      // Hardhat's own signer stack (independent of viem key handling).
      // The key comes ONLY from TESTNET_DEPLOYER_KEY (server/operator env,
      // never committed); default [] preserves the old no-accounts posture
      // whenever the variable is unset.
      accounts:
        (process.env.TESTNET_DEPLOYER_KEY ?? "").trim() === ""
          ? []
          : [(process.env.TESTNET_DEPLOYER_KEY ?? "").trim()],
    },
    bscMainnet: {
      // Mainnet network: RPC from env, deployer key from env.
      // No key is loaded unless explicitly provided — ordinary tests/build
      // work without any mainnet configuration.
      url: BSC_MAINNET_RPC_URL || "https://bsc-dataseed1.binance.org",
      chainId: 56,
      accounts:
        (process.env.MAINNET_DEPLOYER_KEY ?? "").trim() === ""
          ? []
          : [(process.env.MAINNET_DEPLOYER_KEY ?? "").trim()],
    },
  },
  etherscan: {
    apiKey: {
      bscTestnet: BSCSCAN_API_KEY,
      bsc: BSCSCAN_API_KEY,
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
      {
        network: "bsc",
        chainId: 56,
        urls: {
          apiURL: "https://api.bscscan.com/api",
          browserURL: "https://bscscan.com",
        },
      },
    ],
  },
  sourcify: { enabled: true },
};

export default config;
