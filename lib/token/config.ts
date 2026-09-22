import type { PaidFeatureId } from "../pricing/types";

/**
 * Phase 6B token-configuration boundary.
 *
 * Converts human builder input (name/symbol/decimals/supply string +
 * feature selection) into validated factory arguments with overflow-safe
 * base-unit math. Mirrors the on-chain validation in BNBTokenMakerToken;
 * the contract remains the final authority — this layer fails fast with
 * readable errors before any transaction is prepared.
 */

// On-chain boundaries (must match BNBTokenMakerToken.sol).
export const TOKEN_NAME_MIN = 1;
export const TOKEN_NAME_MAX = 40;
/** On-chain name limit is bytes (BNBTokenMakerToken NAME_BYTES_MAX). */
export const TOKEN_NAME_BYTES_MAX = 64;
export const TOKEN_SYMBOL_PATTERN = /^[A-Z0-9]{1,11}$/;
export const TOKEN_DECIMALS_MIN = 0;
export const TOKEN_DECIMALS_MAX = 18;
export const TOKEN_SUPPLY_DIGITS_MAX = 15;
export const TOKEN_LIMIT_PERCENT_MIN = 0.1;
export const TOKEN_LIMIT_PERCENT_MAX = 100;

/** uint256 ceiling for base-unit amounts. */
export const UINT256_MAX = (1n << 256n) - 1n;

export type TokenFeatureFlags = {
  burn: boolean;
  mint: boolean;
  pause: boolean;
  maxTx: boolean;
  maxWallet: boolean;
  blacklist: boolean;
  whitelist: boolean;
};

export const EMPTY_FEATURES: TokenFeatureFlags = {
  burn: false,
  mint: false,
  pause: false,
  maxTx: false,
  maxWallet: false,
  blacklist: false,
  whitelist: false,
};

export function flagsFromSelection(
  selected: ReadonlyArray<PaidFeatureId>
): TokenFeatureFlags {
  const flags = { ...EMPTY_FEATURES };
  for (const id of selected) {
    if (id in flags) flags[id as keyof TokenFeatureFlags] = true;
  }
  return flags;
}

export type TokenConfigInput = {
  name: string;
  symbol: string;
  /** Integer string, e.g. "18". */
  decimals: string;
  /** Human whole-token supply, digits with optional commas, e.g. "1,000,000". */
  supplyHuman: string;
  /** Intended owner (deployer) address. */
  owner: string;
  features: TokenFeatureFlags;
  /** Percent of supply, e.g. "1". Required when features.maxTx is true. */
  maxTxPercent?: string;
  /** Percent of supply, e.g. "2". Required when features.maxWallet is true. */
  maxWalletPercent?: string;
};

export type ValidatedTokenConfig = {
  name: string;
  symbol: string;
  decimals: number;
  /** Base units: human supply * 10^decimals. */
  initialSupply: bigint;
  owner: `0x${string}`;
  features: TokenFeatureFlags;
  /** Base units. 0n = disabled. */
  maxTxAmount: bigint;
  /** Base units. 0n = disabled. */
  maxWalletAmount: bigint;
};

export type TokenConfigErrorCode =
  | "invalid-name"
  | "invalid-symbol"
  | "invalid-decimals"
  | "invalid-supply"
  | "invalid-owner"
  | "invalid-max-tx"
  | "invalid-max-wallet"
  | "supply-overflow";

export class TokenConfigError extends Error {
  readonly code: TokenConfigErrorCode;
  constructor(code: TokenConfigErrorCode, message: string) {
    super(message);
    this.name = "TokenConfigError";
    this.code = code;
  }
}

function supplyDigits(raw: string): string {
  return raw.replace(/,/g, "").trim();
}

/**
 * Convert a human whole-token amount to base units.
 * human = "1000000", decimals = 18 -> 1000000 * 10^18.
 * Throws TokenConfigError("supply-overflow") past uint256.
 */
export function toBaseUnits(humanDigits: string, decimals: number): bigint {
  if (!/^\d+$/.test(humanDigits)) {
    throw new TokenConfigError("invalid-supply", "supply must be digits");
  }
  const base = BigInt(humanDigits) * 10n ** BigInt(decimals);
  if (base <= 0n || base > UINT256_MAX) {
    throw new TokenConfigError(
      "supply-overflow",
      "supply does not fit in uint256"
    );
  }
  return base;
}

/**
 * Convert a percent-of-supply limit (0.1–100, up to 1 decimal place, as the
 * builder emits) into base units, rounding DOWN. A result of 0n is rejected
 * so limits can never silently become "disabled".
 */
export function percentToBaseUnits(
  percentRaw: string,
  supplyBase: bigint,
  code: "invalid-max-tx" | "invalid-max-wallet"
): bigint {
  const trimmed = percentRaw.trim();
  if (!/^\d+(\.\d)?$/.test(trimmed)) {
    throw new TokenConfigError(code, "limit must be a percent like 0.1–100");
  }
  const percent = Number(trimmed);
  if (!Number.isFinite(percent) || percent < 0.1 || percent > 100) {
    throw new TokenConfigError(code, "limit must be between 0.1 and 100%");
  }
  const basisPoints = Math.round(percent * 100);
  const amount = (supplyBase * BigInt(basisPoints)) / 10000n;
  if (amount <= 0n) {
    throw new TokenConfigError(code, "limit rounds to zero for this supply");
  }
  return amount;
}

export function validateAddress(value: string): `0x${string}` | null {
  const trimmed = value.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed)
    ? (trimmed as `0x${string}`)
    : null;
}

/** Validate builder input; throws TokenConfigError on the first problem. */
export function validateTokenConfig(input: TokenConfigInput): ValidatedTokenConfig {
  const name = input.name.replace(/\s+/g, " ").trim();
  if (name.length < TOKEN_NAME_MIN || name.length > TOKEN_NAME_MAX) {
    throw new TokenConfigError(
      "invalid-name",
      `name must be ${TOKEN_NAME_MIN}–${TOKEN_NAME_MAX} characters`
    );
  }
  // The contract counts bytes, not characters: a 40-emoji name passes the
  // character check but would revert on-chain. Fail here instead.
  if (new TextEncoder().encode(name).length > TOKEN_NAME_BYTES_MAX) {
    throw new TokenConfigError(
      "invalid-name",
      `name must fit in ${TOKEN_NAME_BYTES_MAX} bytes on-chain`
    );
  }
  // The builder uppercases symbols as you type; mirror that here so
  // validation matches product behavior. The contract re-enforces charset.
  const symbol = input.symbol.trim().toUpperCase();
  if (!TOKEN_SYMBOL_PATTERN.test(symbol)) {
    throw new TokenConfigError(
      "invalid-symbol",
      "symbol must be 1–11 uppercase letters/digits"
    );
  }
  if (!/^\d{1,2}$/.test(input.decimals.trim())) {
    throw new TokenConfigError("invalid-decimals", "decimals must be 0–18");
  }
  const decimals = Number(input.decimals.trim());
  if (
    !Number.isInteger(decimals) ||
    decimals < TOKEN_DECIMALS_MIN ||
    decimals > TOKEN_DECIMALS_MAX
  ) {
    throw new TokenConfigError("invalid-decimals", "decimals must be 0–18");
  }
  const digits = supplyDigits(input.supplyHuman).replace(/^0+(?=\d)/, "");
  if (
    !/^\d+$/.test(digits) ||
    digits === "" ||
    digits.length > TOKEN_SUPPLY_DIGITS_MAX
  ) {
    throw new TokenConfigError(
      "invalid-supply",
      `supply must be 1–${TOKEN_SUPPLY_DIGITS_MAX} digits`
    );
  }
  if (BigInt(digits) <= 0n) {
    throw new TokenConfigError("invalid-supply", "supply must be above zero");
  }
  const initialSupply = toBaseUnits(digits, decimals);
  const owner = validateAddress(input.owner);
  if (!owner) {
    throw new TokenConfigError("invalid-owner", "owner must be an address");
  }
  if (owner === "0x0000000000000000000000000000000000000000") {
    throw new TokenConfigError("invalid-owner", "owner must not be zero");
  }

  let maxTxAmount = 0n;
  let maxWalletAmount = 0n;
  if (input.features.maxTx) {
    if (input.maxTxPercent === undefined) {
      throw new TokenConfigError("invalid-max-tx", "maxTx percent required");
    }
    maxTxAmount = percentToBaseUnits(input.maxTxPercent, initialSupply, "invalid-max-tx");
  }
  if (input.features.maxWallet) {
    if (input.maxWalletPercent === undefined) {
      throw new TokenConfigError(
        "invalid-max-wallet",
        "maxWallet percent required"
      );
    }
    maxWalletAmount = percentToBaseUnits(
      input.maxWalletPercent,
      initialSupply,
      "invalid-max-wallet"
    );
  }
  if (maxTxAmount > 0n && maxWalletAmount > 0n && maxWalletAmount < maxTxAmount) {
    throw new TokenConfigError(
      "invalid-max-wallet",
      "maxWallet must be >= maxTx when both are enabled"
    );
  }

  return {
    name,
    symbol,
    decimals,
    initialSupply,
    owner,
    features: { ...input.features },
    maxTxAmount,
    maxWalletAmount,
  };
}

/** Shape of BNBTokenMakerToken.TokenConfig for viem encoding. */
export type TokenContractArgs = {
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
};

/** Shape of TokenFactory.TokenParams for viem encoding. */
export type FactoryCreateArgs = {
  token: TokenContractArgs;
};

export function toContractArgs(validated: ValidatedTokenConfig): TokenContractArgs {
  return {
    name: validated.name,
    symbol: validated.symbol,
    decimals: validated.decimals,
    initialSupply: validated.initialSupply,
    owner: validated.owner,
    burnable: validated.features.burn,
    mintable: validated.features.mint,
    pausable: validated.features.pause,
    maxTxAmount: validated.maxTxAmount,
    maxWalletAmount: validated.maxWalletAmount,
    blacklistEnabled: validated.features.blacklist,
    whitelistEnabled: validated.features.whitelist,
  };
}

export function toFactoryArgs(validated: ValidatedTokenConfig): FactoryCreateArgs {
  return { token: toContractArgs(validated) };
}

// Feature-bit positions, mirroring TokenFactory FLAG_* constants.
export const FEATURE_BITS = {
  burn: 0,
  mint: 1,
  pause: 2,
  maxTx: 3,
  maxWallet: 4,
  blacklist: 5,
  whitelist: 6,
} as const;

export function decodeFeatureBitmap(bitmap: bigint): TokenFeatureFlags {
  const has = (bit: number) => (bitmap & (1n << BigInt(bit))) !== 0n;
  return {
    burn: has(FEATURE_BITS.burn),
    mint: has(FEATURE_BITS.mint),
    pause: has(FEATURE_BITS.pause),
    maxTx: has(FEATURE_BITS.maxTx),
    maxWallet: has(FEATURE_BITS.maxWallet),
    blacklist: has(FEATURE_BITS.blacklist),
    whitelist: has(FEATURE_BITS.whitelist),
  };
}
