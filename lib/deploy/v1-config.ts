/**
 * Phase 7D-E2 V1 form boundary (pure, fully unit-tested).
 *
 * Converts human Create-form state into the canonical authorize input
 * (base-unit decimal strings), validates it against the frozen on-chain
 * rules for instant UX feedback, and builds the exact factory calldata
 * from an authorized (server-validated, signed) package — never by
 * reconstructing it. The server authorization remains authoritative; this
 * layer fails fast with readable per-field errors before any request.
 *
 * Bigint-safe throughout: no floating point for money or supply math.
 */

import { encodeFunctionData, type Abi } from "viem";

import { factoryAbi } from "../token/factory";
import type { AuthorizeTokenInput } from "./authorize";

/** Human V1 form state (all strings/numbers as edited, raw). */
export type V1FormState = {
  name: string;
  symbol: string;
  decimals: string;
  supplyHuman: string;
  burnable: boolean;
  mintable: boolean;
  /** "capped" (default) or "unlimited"; only meaningful when mintable. */
  mintMode: "capped" | "unlimited";
  maxSupplyHuman: string;
  pausable: boolean;
  maxTxOn: boolean;
  maxTxPercent: string;
  maxWalletOn: boolean;
  maxWalletPercent: string;
  blacklist: boolean;
  whitelist: boolean;
  trading: boolean;
  buyTaxBps: string;
  sellTaxBps: string;
  marketingWallet: string;
  antiBot: boolean;
  snipeBlocks: string;
  autoLiquidity: boolean;
};

export const V1_FORM_DEFAULTS: V1FormState = {
  name: "",
  symbol: "",
  decimals: "18",
  supplyHuman: "",
  burnable: false,
  mintable: false,
  mintMode: "capped",
  maxSupplyHuman: "",
  pausable: false,
  maxTxOn: false,
  maxTxPercent: "1",
  maxWalletOn: false,
  maxWalletPercent: "2",
  blacklist: false,
  whitelist: false,
  trading: false,
  buyTaxBps: "4",
  sellTaxBps: "6",
  marketingWallet: "",
  antiBot: false,
  snipeBlocks: "5",
  autoLiquidity: false,
};

/**
 * Exact human-decimal → base-unit conversion. Returns null for malformed
 * input or excess fractional precision (fail closed, never rounds).
 */
export function parseHumanToBaseUnits(human: string, decimals: number): bigint | null {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) return null;
  const compact = (human ?? "").replace(/[\s,]/g, "");
  const match = /^(\d+)(?:\.(\d+))?$/.exec(compact);
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  if (fraction.length > decimals) return null;
  const digits = whole + fraction.padEnd(decimals, "0");
  const normalized = digits.replace(/^0+(?=\d)/, "");
  if (normalized === "") return null;
  try {
    return BigInt(normalized);
  } catch {
    return null;
  }
}

/** Percent string (e.g. "2.5") → base units of `supplyBase`. Null when invalid. */
export function percentToBaseUnits(percent: string, supplyBase: bigint): bigint | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec((percent ?? "").trim());
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  if (fraction.length > 4) return null;
  // Exact: value = supply * percent / 100 with up-to-4-decimal percent precision.
  const scaled = BigInt(whole) * 10000n + BigInt((fraction + "0000").slice(0, 4));
  if (scaled <= 0n || scaled > 100n * 10000n) return null;
  return (supplyBase * scaled) / (100n * 10000n);
}

export type V1FieldError = {
  field: keyof V1FormState | "form";
  message: string;
};

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test((value ?? "").trim());
}

function bpsInRange(raw: string, max = 1000): number | null {
  if (!/^\d+$/.test((raw ?? "").trim())) return null;
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 0 || n > max) return null;
  return n;
}

/**
 * Validate V1 form state for UX gating (mirrors frozen rules). Returns the
 * canonical authorize input when valid, or field errors when not.
 */
export function validateV1Form(
  form: V1FormState,
  owner: string
): { ok: true; input: AuthorizeTokenInput } | { ok: false; errors: V1FieldError[] } {
  const errors: V1FieldError[] = [];
  const compact = form.name.replace(/\s+/g, " ").trim();
  if (compact.length < 1 || compact.length > 40) {
    errors.push({ field: "name", message: "Token name is required (1–40 characters)." });
  } else {
    try {
      if (new TextEncoder().encode(compact).length > 64) {
        errors.push({ field: "name", message: "Token name exceeds 64 bytes." });
      }
    } catch {
      errors.push({ field: "name", message: "Token name is invalid." });
    }
  }
  if (!/^[A-Z0-9]{1,11}$/.test((form.symbol ?? "").trim().toUpperCase())) {
    errors.push({ field: "symbol", message: "Symbol must match [0-9A-Z]{1,11}." });
  }
  const decimals = /^\d{1,2}$/.test((form.decimals ?? "").trim())
    ? Number(form.decimals.trim())
    : NaN;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    errors.push({ field: "decimals", message: "Decimals must be an integer 0–18." });
  }
  const supplyBase =
    Number.isInteger(decimals) && decimals >= 0 && decimals <= 18
      ? parseHumanToBaseUnits(form.supplyHuman, decimals)
      : null;
  if (supplyBase === null || supplyBase <= 0n) {
    errors.push({ field: "supplyHuman", message: "Initial supply must be greater than zero." });
  }
  if (!isAddress(owner)) {
    errors.push({ field: "form", message: "A connected wallet address is required." });
  }

  let maxTxAmountBase = 0n;
  if (form.maxTxOn) {
    if (supplyBase === null || supplyBase <= 0n) {
      errors.push({ field: "maxTxPercent", message: "Enter a valid supply first." });
    } else {
      const amount = percentToBaseUnits(form.maxTxPercent, supplyBase);
      if (amount === null || amount <= 0n) {
        errors.push({ field: "maxTxPercent", message: "Enter a value between 0.0001 and 100%." });
      } else {
        maxTxAmountBase = amount;
      }
    }
  }
  let maxWalletAmountBase = 0n;
  if (form.maxWalletOn) {
    if (supplyBase === null || supplyBase <= 0n) {
      errors.push({ field: "maxWalletPercent", message: "Enter a valid supply first." });
    } else {
      const amount = percentToBaseUnits(form.maxWalletPercent, supplyBase);
      if (amount === null || amount <= 0n) {
        errors.push({ field: "maxWalletPercent", message: "Enter a value between 0.0001 and 100%." });
      } else {
        maxWalletAmountBase = amount;
      }
    }
  }
  if (maxWalletAmountBase > 0n && maxTxAmountBase > 0n && maxWalletAmountBase < maxTxAmountBase) {
    errors.push({ field: "maxWalletPercent", message: "Max wallet must be ≥ max transaction." });
  }

  const buyTaxBps = form.trading ? bpsInRange(form.buyTaxBps) : 0;
  const sellTaxBps = form.trading ? bpsInRange(form.sellTaxBps) : 0;
  if (form.trading) {
    if (buyTaxBps === null) errors.push({ field: "buyTaxBps", message: "Buy tax must be an integer 0–1000 bps (≤10%)." });
    if (sellTaxBps === null) errors.push({ field: "sellTaxBps", message: "Sell tax must be an integer 0–1000 bps (≤10%)." });
    const wallet = (form.marketingWallet ?? "").trim();
    if (!isAddress(wallet) || wallet === "0x0000000000000000000000000000000000000000") {
      errors.push({ field: "marketingWallet", message: "A marketing wallet address is required when trading is enabled." });
    }
  }

  const snipeBlocks = form.antiBot ? bpsInRange(form.snipeBlocks, 50) : 0;
  if (form.antiBot && snipeBlocks === null) {
    errors.push({ field: "snipeBlocks", message: "Snipe window must be an integer 0–50 blocks." });
  }

  let maxSupplyBase = 0n;
  if (form.mintable) {
    if (form.mintMode === "unlimited") {
      maxSupplyBase = 0n;
    } else {
      const cap =
        Number.isInteger(decimals) && decimals >= 0 && decimals <= 18
          ? parseHumanToBaseUnits(form.maxSupplyHuman, decimals)
          : null;
      if (cap === null || cap <= 0n) {
        errors.push({ field: "maxSupplyHuman", message: "Maximum lifetime supply is required." });
      } else if (supplyBase !== null && supplyBase > 0n && cap < supplyBase) {
        errors.push({ field: "maxSupplyHuman", message: "Maximum lifetime supply must be ≥ initial supply." });
      } else {
        maxSupplyBase = cap;
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  const taxOn = (buyTaxBps ?? 0) > 0 || (sellTaxBps ?? 0) > 0;
  const autoLiq = form.autoLiquidity;
  if (autoLiq && !taxOn) {
    return {
      ok: false,
      errors: [{ field: "autoLiquidity", message: "Auto-liquidity requires a non-zero buy or sell tax." }],
    };
  }
  const threshold =
    autoLiq && supplyBase !== null && supplyBase > 0n ? supplyBase / 1000n : 0n;
  const input: AuthorizeTokenInput = {
    name: compact,
    symbol: (form.symbol ?? "").trim().toUpperCase(),
    decimals: decimals as number,
    initialSupplyBase: (supplyBase as bigint).toString(10),
    owner,
    burnable: form.burnable,
    mintable: form.mintable,
    pausable: form.pausable,
    maxTxAmountBase: maxTxAmountBase.toString(10),
    maxWalletAmountBase: maxWalletAmountBase.toString(10),
    blacklistEnabled: form.blacklist,
    whitelistEnabled: form.whitelist,
    buyTaxBps: buyTaxBps ?? 0,
    sellTaxBps: sellTaxBps ?? 0,
    marketingWallet: form.trading
      ? (form.marketingWallet ?? "").trim()
      : "0x0000000000000000000000000000000000000000",
    marketingShareBps: taxOn ? (autoLiq ? 7000 : 10000) : 0,
    liquidityShareBps: taxOn && autoLiq ? 3000 : 0,
    autoLiquidityEnabled: autoLiq,
    swapThresholdBase: threshold.toString(10),
    antiBotEnabled: form.antiBot,
    snipeBlocks: snipeBlocks ?? 0,
    maxSupplyBase: maxSupplyBase.toString(10),
  };
  return { ok: true, input };
}

export type DeploymentPackageLike = {
  token: Record<string, string | number | boolean>;
  quote: {
    configHash: `0x${string}`;
    feeWei: bigint | string;
    chainId: bigint | number;
    factory: `0x${string}`;
    nonce: `0x${string}`;
    expiry: bigint | string;
    pricingVersion: `0x${string}`;
  };
  signature: `0x${string}`;
};

/**
 * Build the exact `createToken` calldata + value from an authorized package.
 * The token struct is rebuilt ONLY from package fields (server-validated);
 * nothing is recomputed or mutated. Throws on any shape violation.
 */
export function packageToCalldata(pkg: DeploymentPackageLike): {
  data: `0x${string}`;
  valueHex: `0x${string}`;
} {
  const t = pkg.token;
  const str = (key: string): string => {
    const v = t[key];
    if (typeof v !== "string") throw new Error(`package token field "${key}" is not a string`);
    return v;
  };
  const num = (key: string): number => {
    const v = t[key];
    if (typeof v !== "number" || !Number.isInteger(v)) throw new Error(`package token field "${key}" is not an integer`);
    return v;
  };
  const big = (key: string): bigint => {
    const raw = str(key);
    if (!/^(0|[1-9][0-9]*)$/.test(raw)) throw new Error(`package token field "${key}" is not canonical`);
    return BigInt(raw);
  };
  const bool = (key: string): boolean => {
    const v = t[key];
    if (typeof v !== "boolean") throw new Error(`package token field "${key}" is not a boolean`);
    return v;
  };
  const addr = (key: string): `0x${string}` => {
    const v = str(key);
    if (!/^0x[a-fA-F0-9]{40}$/.test(v)) throw new Error(`package token field "${key}" is not an address`);
    return v as `0x${string}`;
  };
  const token = {
    name: str("name"),
    symbol: str("symbol"),
    decimals: num("decimals"),
    initialSupply: big("initialSupplyBase"),
    owner: addr("owner"),
    burnable: bool("burnable"),
    mintable: bool("mintable"),
    pausable: bool("pausable"),
    maxTxAmount: big("maxTxAmountBase"),
    maxWalletAmount: big("maxWalletAmountBase"),
    blacklistEnabled: bool("blacklistEnabled"),
    whitelistEnabled: bool("whitelistEnabled"),
    buyTaxBps: num("buyTaxBps"),
    sellTaxBps: num("sellTaxBps"),
    marketingWallet: addr("marketingWallet"),
    marketingShareBps: num("marketingShareBps"),
    liquidityShareBps: num("liquidityShareBps"),
    autoLiquidityEnabled: bool("autoLiquidityEnabled"),
    swapThreshold: big("swapThresholdBase"),
    antiBotEnabled: bool("antiBotEnabled"),
    snipeBlocks: BigInt(num("snipeBlocks")),
    maxSupply: big("maxSupplyBase"),
  };
  const q = pkg.quote;
  const hex32 = (v: unknown, key: string): `0x${string}` => {
    if (typeof v !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(v)) {
      throw new Error(`package quote field "${key}" is not bytes32`);
    }
    return v as `0x${string}`;
  };
  const feeWei = ((): bigint => {
    if (typeof q.feeWei === "bigint") {
      if (q.feeWei < 0n) throw new Error('package quote field "feeWei" is negative');
      return q.feeWei;
    }
    if (typeof q.feeWei !== "string" || !/^(0|[1-9][0-9]*)$/.test(q.feeWei)) {
      throw new Error('package quote field "feeWei" is not canonical');
    }
    return BigInt(q.feeWei);
  })();
  const quote = {
    configHash: hex32(q.configHash, "configHash"),
    feeWei,
    chainId: typeof q.chainId === "bigint" ? q.chainId : BigInt(Number(q.chainId)),
    factory: (() => {
      if (typeof q.factory !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(q.factory)) {
        throw new Error('package quote field "factory" is not an address');
      }
      return q.factory as `0x${string}`;
    })(),
    nonce: hex32(q.nonce, "nonce"),
    expiry: typeof q.expiry === "bigint" ? q.expiry : BigInt(String(q.expiry)),
    pricingVersion: hex32(q.pricingVersion, "pricingVersion"),
  };
  if (typeof pkg.signature !== "string" || !/^0x[a-fA-F0-9]{130}$/.test(pkg.signature)) {
    throw new Error("package signature is not 65 bytes");
  }
  const data = encodeFunctionData({
    abi: factoryAbi as unknown as Abi,
    functionName: "createToken",
    args: [{ token }, quote, pkg.signature],
  });
  const fee = quote.feeWei;
  return { data, valueHex: `0x${fee.toString(16)}` as `0x${string}` };
}

/**
 * Authorization fingerprint: ANY deployment-affecting change (including the
 * connected account) invalidates a previously issued package.
 */

export function authorizationFingerprint(input: {
  token: AuthorizeTokenInput;
  chainId: number;
  account: string | null;
}): string {
  return JSON.stringify({
    ...input.token,
    chainId: input.chainId,
    account: (input.account ?? "").toLowerCase(),
  });
}

/** True while a package is usable (exists + expiry safely in the future). */
export function isPackageUsable(
  pkg: { expiry: string | bigint } | null,
  nowSeconds: number,
  skewSeconds = 60
): boolean {
  if (!pkg) return false;
  try {
    const expiry = typeof pkg.expiry === "bigint" ? pkg.expiry : BigInt(pkg.expiry);
    return expiry > BigInt(nowSeconds + skewSeconds);
  } catch {
    return false;
  }
}

/**
 * Owner binding check for authorized packages (client-side).
 *
 * Wallet addresses arrive EIP-55 checksummed (mixed case) while stored and
 * signed baselines are lowercase hex: compare normalized so a genuine
 * same-owner package is never rejected. Any genuinely different owner —
 * or a malformed (non-string) owner — still returns false (fail closed).
 */
export function isPackageOwnerMatch(pkgOwner: unknown, walletAddress: string): boolean {
  return (
    typeof pkgOwner === "string" &&
    typeof walletAddress === "string" &&
    pkgOwner.toLowerCase() === walletAddress.toLowerCase()
  );
}

/**
 * Gas-estimate readiness gate (client-side).
 *
 * There is no signed payload to estimate before the user requests (and
 * receives) authorization: the estimator must stay idle then, and must not
 * report the expected absence of a package as an estimation failure.
 * Returns true only when every estimate precondition holds.
 */
export function isGasEstimateReady(input: {
  onTestnet: boolean;
  address: string | null;
  hasQuote: boolean;
  reviewValid: boolean;
  hasPackage: boolean;
}): boolean {
  return (
    input.onTestnet &&
    typeof input.address === "string" &&
    input.address.length > 0 &&
    input.hasQuote &&
    input.reviewValid &&
    input.hasPackage
  );
}

export type ParsedDeploymentPackage = {
  token: Record<string, string | number | boolean>;
  quote: {
    configHash: `0x${string}`;
    feeWei: bigint;
    chainId: bigint;
    factory: `0x${string}`;
    nonce: `0x${string}`;
    expiry: bigint;
    pricingVersion: `0x${string}`;
  };
  signature: `0x${string}`;
  selection: string[];
  pricing: {
    pricingVersion: string;
    totalWei: string;
    discountWei: string;
    campaign: {
      referenceWei: string;
      effectiveWei: string;
      discountWei: string;
    } | null;
  };
  factory: `0x${string}`;
  chainId: number;
  signer: `0x${string}`;
  configHash: `0x${string}`;
  feeWei: bigint;
  nonce: `0x${string}`;
  expiry: bigint;
};

function hexBytes(value: unknown, bytes: number, field: string): `0x${string}` {
  if (typeof value !== "string" || !new RegExp(`^0x[a-fA-F0-9]{${bytes * 2}}$`).test(value)) {
    throw new Error(`package field "${field}" is malformed`);
  }
  return value as `0x${string}`;
}

function uintString(value: unknown, field: string): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`package field "${field}" is malformed`);
  }
  return BigInt(value);
}

/**
 * Strict-parse an authorize API response package (unknown JSON). Every
 * field is shape-checked; anything malformed throws. Never trusts nesting:
 * top-level fee/chain/factory/signer are cross-checked against the quote.
 */
export function parseDeploymentPackage(input: unknown): ParsedDeploymentPackage {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("package is not an object");
  }
  const r = input as Record<string, unknown>;
  if (r.token === null || typeof r.token !== "object" || Array.isArray(r.token)) {
    throw new Error('package field "token" is malformed');
  }
  const token = r.token as Record<string, string | number | boolean>;
  const q = r.quote;
  if (q === null || typeof q !== "object" || Array.isArray(q)) {
    throw new Error('package field "quote" is malformed');
  }
  const qr = q as Record<string, unknown>;
  const quote = {
    configHash: hexBytes(qr.configHash, 32, "quote.configHash"),
    feeWei: uintString(qr.feeWei, "quote.feeWei"),
    chainId: uintString(qr.chainId, "quote.chainId"),
    factory: hexBytes(qr.factory, 20, "quote.factory"),
    nonce: hexBytes(qr.nonce, 32, "quote.nonce"),
    expiry: uintString(qr.expiry, "quote.expiry"),
    pricingVersion: hexBytes(qr.pricingVersion, 32, "quote.pricingVersion"),
  };
  const signature = hexBytes(r.signature, 65, "signature");
  if (!Array.isArray(r.selection) || r.selection.some((s) => typeof s !== "string")) {
    throw new Error('package field "selection" is malformed');
  }
  const p = r.pricing;
  if (p === null || typeof p !== "object" || Array.isArray(p)) {
    throw new Error('package field "pricing" is malformed');
  }
  const pr = p as Record<string, unknown>;
  if (typeof pr.pricingVersion !== "string" || pr.pricingVersion.length === 0) {
    throw new Error('package field "pricing.pricingVersion" is malformed');
  }
  let campaign: ParsedDeploymentPackage["pricing"]["campaign"] = null;
  if (pr.campaign !== null && pr.campaign !== undefined) {
    const c = pr.campaign as Record<string, unknown>;
    if (
      typeof c.referenceWei !== "string" ||
      typeof c.effectiveWei !== "string" ||
      typeof c.discountWei !== "string"
    ) {
      throw new Error('package field "pricing.campaign" is malformed');
    }
    campaign = { referenceWei: c.referenceWei, effectiveWei: c.effectiveWei, discountWei: c.discountWei };
  }
  const pricing = {
    pricingVersion: pr.pricingVersion as string,
    totalWei: uintString(pr.totalWei, "pricing.totalWei").toString(10),
    discountWei: uintString(pr.discountWei, "pricing.discountWei").toString(10),
    campaign,
  };
  const factory = hexBytes(r.factory, 20, "factory");
  if (typeof r.chainId !== "number" || !Number.isInteger(r.chainId)) {
    throw new Error('package field "chainId" is malformed');
  }
  const signer = hexBytes(r.signer, 20, "signer");
  const configHash = hexBytes(r.configHash, 32, "configHash");
  const feeWei = uintString(r.feeWei, "feeWei");
  const nonce = hexBytes(r.nonce, 32, "nonce");
  const expiry = uintString(r.expiry, "expiry");
  // Cross-checks: top level must agree with the nested quote.
  if (configHash !== quote.configHash) throw new Error("package configHash mismatch");
  if (feeWei !== quote.feeWei) throw new Error("package feeWei mismatch");
  if (nonce !== quote.nonce) throw new Error("package nonce mismatch");
  if (expiry !== quote.expiry) throw new Error("package expiry mismatch");
  if (factory !== quote.factory) throw new Error("package factory mismatch");
  if (BigInt(r.chainId) !== quote.chainId) throw new Error("package chainId mismatch");
  return {
    token,
    quote,
    signature,
    selection: r.selection as string[],
    pricing,
    factory,
    chainId: r.chainId as number,
    signer,
    configHash,
    feeWei,
    nonce,
    expiry,
  };
}
