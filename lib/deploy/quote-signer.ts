/**
 * Phase 7D-E1 server-side EIP-712 deployment-quote signer.
 *
 * Implements the frozen factory schema (contracts/freeze/V1-SPEC.md §3):
 * domain BNBTokenMaker/1, DeployQuote message, configHash binding. The
 * signing core takes an INJECTED typed-data signer so unit tests stay
 * deterministic without private keys; the env wrapper (`serverAccountFromEnv`)
 * is the only place a real key is read.
 *
 * SECRET HANDLING (critical):
 * - The key is read ONLY from `DEPLOY_QUOTE_SIGNER_KEY` inside
 *   `serverAccountFromEnv`, never at import time.
 * - It is never logged, never returned from APIs, never persisted, never
 *   bundled client-side (this module has no "use client" importers; the key
 *   never crosses the network boundary — only address/signature/quote do).
 * - `DEPLOY_QUOTE_SIGNER_ADDRESS` cross-checks key→address on load:
 *   mismatch fails closed (catches typos AND provider issues before any
 *   signature is issued).
 * - Tests use injected stub/Hardhat signers or the frozen vectors (which
 *   need no key at all). Never commit a real key.
 *
 * Deliberately NO `import "server-only"` (same precedent as
 * lib/pricing/server/store.ts): route handlers must stay importable from
 * the tsx unit-test runtime.
 */

import { randomBytes } from "node:crypto";
import {
  encodeAbiParameters,
  encodePacked,
  hashTypedData,
  isAddress,
  keccak256,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const QUOTE_DOMAIN_NAME = "BNBTokenMaker";
export const QUOTE_DOMAIN_VERSION = "1";
export const QUOTE_TYPE_STRING =
  "DeployQuote(bytes32 configHash,uint256 feeWei,uint256 chainId,address factory,bytes32 nonce,uint256 expiry,bytes32 pricingVersion)";

/** Canonical TokenConfig field order (ABI-significant, frozen). */
export const TOKEN_TUPLE_COMPONENTS = [
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

export const QUOTE_MESSAGE_COMPONENTS = [
  { name: "configHash", type: "bytes32" },
  { name: "feeWei", type: "uint256" },
  { name: "chainId", type: "uint256" },
  { name: "factory", type: "address" },
  { name: "nonce", type: "bytes32" },
  { name: "expiry", type: "uint256" },
  { name: "pricingVersion", type: "bytes32" },
] as const;

/** Canonical bigint-carrying token config (server-side shape). */
export type V1TokenConfig = {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: bigint;
  owner: `0x${string}`;
  burnable: boolean;
  mintable: boolean;
  pausable: boolean;
  maxTxAmount: bigint;
  maxWalletAmount: bigint;
  blacklistEnabled: boolean;
  whitelistEnabled: boolean;
  buyTaxBps: number;
  sellTaxBps: number;
  marketingWallet: `0x${string}`;
  marketingShareBps: number;
  liquidityShareBps: number;
  autoLiquidityEnabled: boolean;
  swapThreshold: bigint;
  antiBotEnabled: boolean;
  snipeBlocks: bigint;
  maxSupply: bigint;
};

export type DeployQuoteMessage = {
  configHash: Hex;
  feeWei: bigint;
  chainId: bigint;
  factory: `0x${string}`;
  nonce: Hex;
  expiry: bigint;
  pricingVersion: Hex;
};

export type QuoteDomain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: `0x${string}`;
};

/** Minimal injected signer: anything that can sign EIP-712 payloads. */
export type TypedDataSigner = {
  address: `0x${string}`;
  signTypedData: (args: {
    domain: QuoteDomain;
    types: { DeployQuote: readonly { name: string; type: string }[] };
    primaryType: "DeployQuote";
    message: DeployQuoteMessage;
  }) => Promise<Hex>;
};

export type QuoteSignerErrorCode =
  | "signer-unavailable"
  | "factory-unavailable"
  | "chain-unavailable"
  | "signer-mismatch";

export class QuoteSignerError extends Error {
  readonly code: QuoteSignerErrorCode;
  constructor(code: QuoteSignerErrorCode, message: string) {
    super(message);
    this.name = "QuoteSignerError";
    this.code = code;
  }
}

/**
 * configHash = keccak256(abi.encode(TokenParams)) with the canonical
 * single-key wrapper — byte-identical to the factory's
 * `keccak256(abi.encode(params))` check.
 */
export function tokenConfigHash(token: V1TokenConfig): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { type: "tuple", components: [...TOKEN_TUPLE_COMPONENTS], name: "token" },
          ],
        },
      ],
      [{ token }] as never
    )
  );
}

export function quoteDomain(chainId: number, factory: `0x${string}`): QuoteDomain {
  return {
    name: QUOTE_DOMAIN_NAME,
    version: QUOTE_DOMAIN_VERSION,
    chainId,
    verifyingContract: factory,
  };
}

/** EIP-712 digest for a quote (matches OZ `_hashTypedDataV4` + typehash). */
export function quoteDigest(
  chainId: number,
  factory: `0x${string}`,
  message: DeployQuoteMessage
): Hex {
  return hashTypedData({
    domain: { ...quoteDomain(chainId, factory), chainId },
    types: {
      DeployQuote: [...QUOTE_MESSAGE_COMPONENTS],
    },
    primaryType: "DeployQuote",
    message: { ...message, chainId: BigInt(chainId) },
  } as never);
}

export type NonceInput = {
  chainId: bigint;
  factory: `0x${string}`;
  payer: `0x${string}`;
  configHash: Hex;
  feeWei: bigint;
  expiry: bigint;
  randomness?: Hex;
};

/**
 * Server nonce/quote-id: domain-separated keccak over the full authorization
 * context plus 256 bits of server CSPRNG. Practically collision-free;
 * deterministic given explicit randomness (tests).
 */
export function deriveQuoteNonce(input: NonceInput): Hex {
  const randomness =
    input.randomness ?? (`0x${randomBytes(32).toString("hex")}` as Hex);
  return keccak256(
    encodePacked(
      ["string", "uint256", "address", "address", "bytes32", "uint256", "uint256", "bytes32"],
      [
        "BNBTokenMaker-quote-nonce",
        input.chainId,
        input.factory,
        input.payer,
        input.configHash,
        input.feeWei,
        input.expiry,
        randomness,
      ]
    )
  );
}

export type QuoteBuildInput = {
  token: V1TokenConfig;
  feeWei: bigint;
  payer: `0x${string}`;
  chainId: number;
  factory: `0x${string}`;
  pricingVersion: Hex;
  /** Seconds from now (default from env/server config). */
  ttlSeconds: number;
  nowSeconds?: number;
  nonceRandomness?: Hex;
};

/** Assemble the unsigned quote (configHash + fee + bindings + nonce + expiry). */
export function buildDeployQuote(input: QuoteBuildInput): {
  configHash: Hex;
  quote: DeployQuoteMessage;
} {
  const configHash = tokenConfigHash(input.token);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const expiry = BigInt(now + input.ttlSeconds);
  const chainIdBig = BigInt(input.chainId);
  const nonce = deriveQuoteNonce({
    chainId: chainIdBig,
    factory: input.factory,
    payer: input.payer,
    configHash,
    feeWei: input.feeWei,
    expiry,
    randomness: input.nonceRandomness,
  });
  return {
    configHash,
    quote: {
      configHash,
      feeWei: input.feeWei,
      chainId: chainIdBig,
      factory: input.factory,
      nonce,
      expiry,
      pricingVersion: input.pricingVersion,
    },
  };
}

/** Sign an assembled quote with the injected signer. */
export async function signDeployQuote(input: {
  signer: TypedDataSigner;
  chainId: number;
  factory: `0x${string}`;
  quote: DeployQuoteMessage;
}): Promise<Hex> {
  return input.signer.signTypedData({
    domain: quoteDomain(input.chainId, input.factory),
    types: { DeployQuote: [...QUOTE_MESSAGE_COMPONENTS] },
    primaryType: "DeployQuote",
    message: input.quote,
  });
}

export type QuoteServerConfig = {
  chainId: number;
  factory: `0x${string}`;
  signerAddress: `0x${string}`;
  ttlSeconds: number;
  zeroFee: boolean;
};

function readEnv(env: NodeJS.ProcessEnv, name: string): string {
  return (env[name] ?? "").trim();
}

/**
 * Load quote-server configuration, fail-closed. The key itself is NOT
 * returned here — see `serverAccountFromEnv`.
 */
export function getQuoteServerConfig(
  env: NodeJS.ProcessEnv = process.env
): QuoteServerConfig {
  const chainRaw = readEnv(env, "DEPLOY_QUOTE_CHAIN_ID");
  const chainId = Number(chainRaw);
  if (!chainRaw || !Number.isInteger(chainId) || chainId <= 0) {
    throw new QuoteSignerError("chain-unavailable", "DEPLOY_QUOTE_CHAIN_ID is not configured");
  }
  const factory = readEnv(env, "DEPLOY_QUOTE_FACTORY_ADDRESS");
  if (!isAddress(factory)) {
    throw new QuoteSignerError("factory-unavailable", "DEPLOY_QUOTE_FACTORY_ADDRESS is not configured");
  }
  const signerAddress = readEnv(env, "DEPLOY_QUOTE_SIGNER_ADDRESS");
  if (!isAddress(signerAddress)) {
    throw new QuoteSignerError("signer-unavailable", "DEPLOY_QUOTE_SIGNER_ADDRESS is not configured");
  }
  const ttlRaw = readEnv(env, "DEPLOY_QUOTE_TTL_SECONDS");
  const ttlSeconds = ttlRaw === "" ? 900 : Number(ttlRaw);
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0 || ttlSeconds > 86400) {
    throw new QuoteSignerError("signer-unavailable", "DEPLOY_QUOTE_TTL_SECONDS is out of range");
  }
  return {
    chainId,
    factory: factory as `0x${string}`,
    signerAddress: signerAddress as `0x${string}`,
    ttlSeconds,
    zeroFee: readEnv(env, "DEPLOY_QUOTE_ZERO_FEE").toLowerCase() === "true",
  };
}

/**
 * Build the production signer account from the server-only key, verifying
 * key→address against DEPLOY_QUOTE_SIGNER_ADDRESS (fail-closed). The key
 * value never leaves this function except inside the returned account
 * closure — it is never logged, persisted, or returned.
 */
export function serverAccountFromEnv(
  env: NodeJS.ProcessEnv = process.env
): TypedDataSigner {
  const key = readEnv(env, "DEPLOY_QUOTE_SIGNER_KEY");
  if (!/^0x[a-fA-F0-9]{64}$/.test(key)) {
    throw new QuoteSignerError("signer-unavailable", "DEPLOY_QUOTE_SIGNER_KEY is not configured");
  }
  const config = getQuoteServerConfig(env);
  const account = privateKeyToAccount(key as Hex);
  if (account.address.toLowerCase() !== config.signerAddress.toLowerCase()) {
    throw new QuoteSignerError(
      "signer-mismatch",
      "DEPLOY_QUOTE_SIGNER_KEY does not match DEPLOY_QUOTE_SIGNER_ADDRESS"
    );
  }
  const address = account.address;
  return {
    address,
    signTypedData: (args) => account.signTypedData(args as never),
  };
}
