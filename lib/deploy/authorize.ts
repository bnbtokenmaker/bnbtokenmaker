/**
 * Phase 7D-E1 server-side deployment authorization.
 *
 * Turns a strictly-validated V1 TokenConfig + server-authoritative pricing
 * snapshot into the canonical deployment package the frontend needs for the
 * value-bearing `createToken(params, quote, signature)` transaction:
 * validated config, pricing breakdown, configHash, feeWei, nonce, expiry,
 * EIP-712 signature, expected factory and chain.
 *
 * Validation mirrors the frozen on-chain rules (SwapLib + token); the chain
 * remains the final authority and fails closed on anything invalid. Amounts
 * arrive as canonical base-unit decimal strings (JSON-safe); all money math
 * is bigint-only, never floating point.
 */

import { keccak256, stringToHex, type Hex } from "viem";

import { quoteFromSnapshot } from "../pricing/server/quote";
import type { AuthoritativeSnapshot } from "../pricing/server/store";
import type { PaidFeatureId } from "../pricing/types";
import {
  buildDeployQuote,
  signDeployQuote,
  type DeployQuoteMessage,
  type QuoteServerConfig,
  type TypedDataSigner,
  type V1TokenConfig,
} from "./quote-signer";

export type AuthorizeErrorCode =
  | "invalid-config"
  | "chain-mismatch"
  | "pricing-unavailable"
  | "signer-unavailable"
  | "factory-unavailable";

export class AuthorizeError extends Error {
  readonly code: AuthorizeErrorCode;
  constructor(code: AuthorizeErrorCode, message: string) {
    super(message);
    this.name = "AuthorizeError";
    this.code = code;
  }
}

/** JSON-safe token input: base-unit amounts are decimal strings. */
export type AuthorizeTokenInput = {
  name: string;
  symbol: string;
  decimals: number;
  initialSupplyBase: string;
  owner: string;
  burnable: boolean;
  mintable: boolean;
  pausable: boolean;
  maxTxAmountBase: string;
  maxWalletAmountBase: string;
  blacklistEnabled: boolean;
  whitelistEnabled: boolean;
  buyTaxBps: number;
  sellTaxBps: number;
  marketingWallet: string;
  marketingShareBps: number;
  liquidityShareBps: number;
  autoLiquidityEnabled: boolean;
  swapThresholdBase: string;
  antiBotEnabled: boolean;
  snipeBlocks: number;
  maxSupplyBase: string;
};

export type AuthorizeRequest = AuthorizeTokenInput & {
  chainId: number;
  campaignCode?: string | null;
};

function fail(message: string): never {
  throw new AuthorizeError("invalid-config", message);
}

function isAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function baseUnits(value: unknown, field: string): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    fail(`${field} must be a canonical base-unit decimal string`);
  }
  return BigInt(value as string);
}

function bps(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    fail(`${field} must be a non-negative integer`);
  }
  return value as number;
}

function flag(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") fail(`${field} must be a boolean`);
  return value as boolean;
}

/**
 * Strict-parse an authorize token input into the canonical V1TokenConfig.
 * Every rule mirrors the frozen on-chain validation (identity, supply,
 * limits, lifetime cap, tax policy, liquidity coherence, launch bounds).
 */
export function parseAuthorizeToken(input: unknown): V1TokenConfig {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    fail("token config must be a JSON object");
  }
  const r = input as Record<string, unknown>;
  const ALLOWED = new Set([
    "name", "symbol", "decimals", "initialSupplyBase", "owner",
    "burnable", "mintable", "pausable",
    "maxTxAmountBase", "maxWalletAmountBase",
    "blacklistEnabled", "whitelistEnabled",
    "buyTaxBps", "sellTaxBps", "marketingWallet",
    "marketingShareBps", "liquidityShareBps",
    "autoLiquidityEnabled", "swapThresholdBase",
    "antiBotEnabled", "snipeBlocks", "maxSupplyBase",
  ]);
  for (const key of Object.keys(r)) {
    if (!ALLOWED.has(key)) fail(`unexpected token field "${key}"`);
  }
  if (typeof r.name !== "string" || r.name.length === 0) fail("name is required");
  const nameBytes = Buffer.byteLength(r.name as string, "utf8");
  if (nameBytes > 64) fail("name exceeds 64 bytes");
  if (typeof r.symbol !== "string" || !/^[0-9A-Z]{1,11}$/.test(r.symbol as string)) {
    fail("symbol must match [0-9A-Z]{1,11}");
  }
  if (
    typeof r.decimals !== "number" ||
    !Number.isInteger(r.decimals) ||
    (r.decimals as number) < 0 ||
    (r.decimals as number) > 18
  ) {
    fail("decimals must be an integer 0..18");
  }
  const initialSupply = baseUnits(r.initialSupplyBase, "initialSupplyBase");
  if (initialSupply === 0n) fail("initialSupplyBase must be positive");
  if (!isAddress(r.owner)) fail("owner must be an address");
  const maxTxAmount = baseUnits(r.maxTxAmountBase, "maxTxAmountBase");
  const maxWalletAmount = baseUnits(r.maxWalletAmountBase, "maxWalletAmountBase");
  if (maxWalletAmount > 0n && maxTxAmount > 0n && maxWalletAmount < maxTxAmount) {
    fail("maxWalletAmount must be >= maxTxAmount when both are set");
  }
  const buyTaxBps = bps(r.buyTaxBps, "buyTaxBps");
  const sellTaxBps = bps(r.sellTaxBps, "sellTaxBps");
  if (buyTaxBps > 1000 || sellTaxBps > 1000) fail("tax is capped at 1000 bps per side");
  const taxOn = buyTaxBps > 0 || sellTaxBps > 0;
  if (taxOn) {
    if (!isAddress(r.marketingWallet) || r.marketingWallet === "0x0000000000000000000000000000000000000000") {
      fail("marketingWallet is required when tax is on");
    }
  }
  const marketingShareBps = bps(r.marketingShareBps, "marketingShareBps");
  const liquidityShareBps = bps(r.liquidityShareBps, "liquidityShareBps");
  if (taxOn && marketingShareBps + liquidityShareBps !== 10000) {
    fail("marketing/liquidity shares must sum to 10000 when tax is on");
  }
  const autoLiquidityEnabled = flag(r.autoLiquidityEnabled, "autoLiquidityEnabled");
  if (autoLiquidityEnabled !== liquidityShareBps > 0) {
    fail("autoLiquidityEnabled must match a nonzero liquidity share");
  }
  const swapThreshold = baseUnits(r.swapThresholdBase, "swapThresholdBase");
  if (autoLiquidityEnabled) {
    if (!taxOn) fail("auto-liquidity requires tax");
    if (swapThreshold < initialSupply / 1_000_000n || swapThreshold > initialSupply / 100n) {
      fail("swapThreshold out of bounds");
    }
  }
  const snipeBlocks = bps(r.snipeBlocks, "snipeBlocks");
  if (snipeBlocks > 50) fail("snipeBlocks capped at 50");
  const mintable = flag(r.mintable, "mintable");
  const maxSupply = baseUnits(r.maxSupplyBase, "maxSupplyBase");
  if (maxSupply > 0n) {
    if (!mintable) fail("maxSupply requires mintable");
    if (initialSupply > maxSupply) fail("initialSupply exceeds maxSupply");
  }
  return {
    name: r.name as string,
    symbol: r.symbol as string,
    decimals: r.decimals as number,
    initialSupply,
    owner: r.owner as `0x${string}`,
    burnable: flag(r.burnable, "burnable"),
    mintable,
    pausable: flag(r.pausable, "pausable"),
    maxTxAmount,
    maxWalletAmount,
    blacklistEnabled: flag(r.blacklistEnabled, "blacklistEnabled"),
    whitelistEnabled: flag(r.whitelistEnabled, "whitelistEnabled"),
    buyTaxBps,
    sellTaxBps,
    marketingWallet: (taxOn ? r.marketingWallet : "0x0000000000000000000000000000000000000000") as `0x${string}`,
    marketingShareBps,
    liquidityShareBps,
    autoLiquidityEnabled,
    swapThreshold,
    antiBotEnabled: flag(r.antiBotEnabled, "antiBotEnabled"),
    snipeBlocks: BigInt(snipeBlocks),
    maxSupply,
  };
}

/** Derive priced capability selections from a validated token config. */
export function selectionsFromToken(token: V1TokenConfig): PaidFeatureId[] {
  const out: PaidFeatureId[] = [];
  if (token.burnable) out.push("burn");
  if (token.mintable) out.push("mint");
  if (token.pausable) out.push("pause");
  if (token.maxTxAmount > 0n) out.push("maxTx");
  if (token.maxWalletAmount > 0n) out.push("maxWallet");
  if (token.blacklistEnabled) out.push("blacklist");
  if (token.whitelistEnabled) out.push("whitelist");
  if (token.buyTaxBps > 0 || token.sellTaxBps > 0) out.push("trading");
  if (token.antiBotEnabled) out.push("antiBot");
  if (token.autoLiquidityEnabled) out.push("autoLiquidity");
  return out;
}

export type DeploymentPackage = {
  token: Record<string, string | number | boolean>;
  selection: PaidFeatureId[];
  pricing: {
    pricingVersion: string;
    baseFeeWei: string;
    lineItems: ReadonlyArray<{ feature: string; priceWei: string }>;
    subtotalWei: string;
    discountWei: string;
    totalWei: string;
    campaign: {
      referenceWei: string;
      effectiveWei: string;
      discountWei: string;
    } | null;
  };
  configHash: Hex;
  feeWei: string;
  nonce: Hex;
  expiry: string;
  signature: Hex;
  factory: `0x${string}`;
  chainId: number;
  /** bytes32 binding of the pricing version (keccak of the version string). */
  pricingVersionBytes: Hex;
  signer: `0x${string}`;
  /**
   * The exact signed EIP-712 message (JSON-safe: bigints as decimal
   * strings). Mirrors the top-level bindings; clients build calldata from
   * this object verbatim and cross-check it against the top level.
   */
  quote: {
    configHash: Hex;
    feeWei: string;
    chainId: string;
    factory: `0x${string}`;
    nonce: Hex;
    expiry: string;
    pricingVersion: Hex;
  };
};

export type AuthorizationDeps = {
  snapshot: AuthoritativeSnapshot;
  signer: TypedDataSigner;
  serverConfig: QuoteServerConfig;
  nowSeconds?: number;
  nonceRandomness?: Hex;
};

/**
 * Authorize a deployment: validate → price → bind → sign. Fail-closed at
 * every step. Pricing/campaign changes never mutate an issued package
 * (the package is an immutable snapshot of one signing instant).
 */
export async function authorizeDeployment(input: {
  token: V1TokenConfig;
  chainId: number;
  deps: AuthorizationDeps;
}): Promise<DeploymentPackage> {
  const { token, chainId, deps } = input;
  const { snapshot, signer, serverConfig } = deps;
  if (!Number.isInteger(chainId) || chainId !== serverConfig.chainId) {
    throw new AuthorizeError("chain-mismatch", "request chain does not match the configured quote chain");
  }
  let priced;
  try {
    priced = quoteFromSnapshot(snapshot, selectionsFromToken(token));
  } catch (error) {
    throw new AuthorizeError(
      "pricing-unavailable",
      error instanceof Error ? error.message : "pricing failed"
    );
  }
  // Testnet zero-fee path: same signed architecture, fee forced to zero —
  // the testnet deployment never carries a commercial charge.
  const feeWei = serverConfig.zeroFee ? 0n : priced.totalPlatformFeeWei;
  const pricingVersionBytes = keccak256(stringToHex(priced.pricingVersion));
  const ttl = serverConfig.ttlSeconds;
  const now = deps.nowSeconds ?? Math.floor(Date.now() / 1000);
  const { configHash, quote } = buildDeployQuote({
    token,
    feeWei,
    payer: token.owner,
    chainId,
    factory: serverConfig.factory,
    pricingVersion: pricingVersionBytes,
    ttlSeconds: ttl,
    nowSeconds: now,
    nonceRandomness: deps.nonceRandomness,
  });
  const signature = await signDeployQuote({
    signer,
    chainId,
    factory: serverConfig.factory,
    quote,
  });
  if (signer.address.toLowerCase() !== serverConfig.signerAddress.toLowerCase()) {
    throw new AuthorizeError("signer-unavailable", "quote signer does not match configuration");
  }
  const str = (v: bigint) => v.toString(10);
  return {
    token: {      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      initialSupplyBase: str(token.initialSupply),
      owner: token.owner,
      burnable: token.burnable,
      mintable: token.mintable,
      pausable: token.pausable,
      maxTxAmountBase: str(token.maxTxAmount),
      maxWalletAmountBase: str(token.maxWalletAmount),
      blacklistEnabled: token.blacklistEnabled,
      whitelistEnabled: token.whitelistEnabled,
      buyTaxBps: token.buyTaxBps,
      sellTaxBps: token.sellTaxBps,
      marketingWallet: token.marketingWallet,
      marketingShareBps: token.marketingShareBps,
      liquidityShareBps: token.liquidityShareBps,
      autoLiquidityEnabled: token.autoLiquidityEnabled,
      swapThresholdBase: str(token.swapThreshold),
      antiBotEnabled: token.antiBotEnabled,
      snipeBlocks: Number(token.snipeBlocks),
      maxSupplyBase: str(token.maxSupply),
    },
    selection: selectionsFromToken(token),
    pricing: {
      pricingVersion: priced.pricingVersion,
      baseFeeWei: str(priced.baseFeeWei),
      lineItems: priced.lineItems.map((item) => ({
        feature: item.feature,
        priceWei: str(item.priceWei),
      })),
      subtotalWei: str(priced.subtotalWei),
      discountWei: str(priced.discountWei),
      totalWei: str(priced.totalPlatformFeeWei),
      campaign: priced.campaign
        ? {
            referenceWei: str(priced.campaign.referenceWei),
            effectiveWei: str(priced.campaign.effectiveWei),
            discountWei: str(priced.campaign.discountWei),
          }
        : null,
    },
    configHash,
    feeWei: str(feeWei),
    nonce: quote.nonce,
    expiry: str(quote.expiry),
    signature,
    factory: serverConfig.factory,
    chainId,
    pricingVersionBytes,
    signer: signer.address,
    quote: {
      configHash: quote.configHash,
      feeWei: str(quote.feeWei),
      chainId: quote.chainId.toString(10),
      factory: quote.factory,
      nonce: quote.nonce,
      expiry: str(quote.expiry),
      pricingVersion: quote.pricingVersion,
    },
  };
}

export type AuthorizeRequestShape = {
  token: unknown;
  chainId: unknown;
  campaignCode?: unknown;
};

/** Strict-parse an authorize API body (unknown fields rejected). */
export function parseAuthorizeRequest(body: unknown): {
  token: V1TokenConfig;
  chainId: number;
  campaignCode: string | null;
} {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new AuthorizeError("invalid-config", "request body must be a JSON object");
  }
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== "token" && key !== "chainId" && key !== "campaignCode") {
      throw new AuthorizeError("invalid-config", `unexpected field "${key}"`);
    }
  }
  if (typeof record.chainId !== "number" || !Number.isInteger(record.chainId)) {
    throw new AuthorizeError("chain-mismatch", "chainId must be an integer");
  }
  let campaignCode: string | null = null;
  if (record.campaignCode !== undefined) {
    if (typeof record.campaignCode !== "string") {
      throw new AuthorizeError("invalid-config", "campaignCode must be a string");
    }
    campaignCode = record.campaignCode;
  }
  return { token: parseAuthorizeToken(record.token), chainId: record.chainId, campaignCode };
}

export function authorizeErrorStatus(error: unknown): number {
  if (error instanceof AuthorizeError) {
    switch (error.code) {
      case "invalid-config":
      case "chain-mismatch":
        return 400;
      case "pricing-unavailable":
      case "signer-unavailable":
      case "factory-unavailable":
        return 503;
    }
  }
  return 500;
}

export type { DeployQuoteMessage, QuoteServerConfig, TypedDataSigner, V1TokenConfig };
export { getQuoteServerConfig, serverAccountFromEnv } from "./quote-signer";
