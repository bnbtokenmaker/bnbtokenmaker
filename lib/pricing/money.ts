import { PricingError } from "./errors";

export const WEI_PER_BNB = 10n ** 18n;

export const MAX_BNB_DECIMALS = 18;

const DECIMAL = /^(\d+)(?:\.(\d*))?$/;

export function parseBnbToWei(input: string): bigint {
  if (typeof input !== "string" || input.length === 0) {
    throw new PricingError("invalid-bnb-amount", "expected a non-empty string", input);
  }
  if (input.startsWith("-")) {
    throw new PricingError("negative-bnb-amount", "amount must not be negative", input);
  }
  if (input.startsWith("+")) {
    throw new PricingError("invalid-bnb-amount", "amount must carry no sign prefix", input);
  }
  if (/[eE]/u.test(input)) {
    throw new PricingError("invalid-bnb-amount", "scientific notation is not allowed", input);
  }
  const match = DECIMAL.exec(input);
  if (match === null) {
    throw new PricingError("invalid-bnb-amount", "malformed BNB amount", input);
  }
  const [, intPart, fracPart] = match;
  const frac = fracPart ?? "";
  if (frac.length > MAX_BNB_DECIMALS) {
    throw new PricingError(
      "too-many-decimals",
      `at most ${MAX_BNB_DECIMALS} decimal places are allowed`,
      input
    );
  }
  if (frac === "" && input.includes(".")) {
    throw new PricingError("invalid-bnb-amount", "decimal point must be followed by digits", input);
  }
  const wholeWei = BigInt(intPart) * WEI_PER_BNB;
  const fracWei = frac.length === 0 ? 0n : BigInt(frac.padEnd(MAX_BNB_DECIMALS, "0"));
  return wholeWei + fracWei;
}

export function formatWeiBnb(wei: bigint): string {
  if (wei < 0n) {
    throw new PricingError("negative-bnb-amount", "cannot format a negative wei amount");
  }
  const whole = wei / WEI_PER_BNB;
  const frac = wei % WEI_PER_BNB;
  if (frac === 0n) {
    return whole.toString();
  }
  const fracDigits = frac.toString().padStart(MAX_BNB_DECIMALS, "0").replace(/0+$/u, "");
  return `${whole.toString()}.${fracDigits}`;
}

export function formatWeiBnbDisplay(wei: bigint): string {
  if (wei < 0n) {
    throw new PricingError("negative-bnb-amount", "cannot format a negative wei amount");
  }
  const whole = wei / WEI_PER_BNB;
  const frac = wei % WEI_PER_BNB;
  const fracDigits = frac.toString().padStart(MAX_BNB_DECIMALS, "0").slice(0, 3).padEnd(3, "0");
  return `${whole.toString()}.${fracDigits}`;
}

export function weiToString(wei: bigint): string {
  return wei.toString();
}

/**
 * Compact display formatting for small network-fee amounts (formatting
 * only — bigint/wei stays authoritative everywhere else).
 *
 * Renders up to `maxDecimals` decimal places (default 6, round half up),
 * trimming trailing zeros so dust amounts stay readable:
 * 140088300000000 wei -> "0.00014", 50000000000000000 wei -> "0.05".
 */
export function formatWeiBnbCompact(wei: bigint, maxDecimals = 6): string {
  if (wei < 0n) {
    throw new PricingError("negative-bnb-amount", "cannot format a negative wei amount");
  }
  if (!Number.isInteger(maxDecimals) || maxDecimals < 0 || maxDecimals > MAX_BNB_DECIMALS) {
    throw new PricingError(
      "invalid-bnb-amount",
      `maxDecimals must be an integer within 0..${MAX_BNB_DECIMALS}`
    );
  }
  const scale = 10n ** BigInt(MAX_BNB_DECIMALS - maxDecimals);
  const rounded = (wei + scale / 2n) / scale;
  const unit = 10n ** BigInt(maxDecimals);
  const whole = rounded / unit;
  const frac = rounded % unit;
  if (frac === 0n) return whole.toString();
  const fracDigits = frac
    .toString()
    .padStart(maxDecimals, "0")
    .replace(/0+$/u, "");
  return `${whole.toString()}.${fracDigits}`;
}

export function parseWeiStringToBigint(input: string): bigint {
  if (typeof input !== "string" || input.length === 0) {
    throw new PricingError("invalid-config", "wei string must be a non-empty integer string");
  }
  if (!/^\d+$/u.test(input)) {
    throw new PricingError("invalid-config", "wei string must be a non-negative integer", input);
  }
  return BigInt(input);
}

export function isWei(value: unknown): value is bigint {
  return typeof value === "bigint";
}