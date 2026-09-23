/**
 * Phase 7C pricing/campaign policy (pure logic, no I/O, no `server-only`).
 *
 * Everything here is deterministic and unit-testable without a database:
 * - campaign code normalization / validation
 * - derived campaign status (scheduled / active / ended / disabled)
 * - in-window checks against SERVER time (client time is never trusted)
 * - bigint-safe percentage discount math (basis points, round down)
 * - admin payload validation (BNB decimal strings -> exact wei, caps)
 *
 * Money rules: no Number()/parseFloat anywhere; percentages are integer
 * basis points (10000 = 100.00%); discountWei = subtotal * bp / 10000n with
 * truncating integer division (the house never over-discounts by a wei).
 */

import { calculatePlatformFee } from "../calculate";
import { PAID_FEATURES } from "../features";
import { parseBnbToWei } from "../money";
import type { PaidFeatureId, PricingConfig, PricingResult } from "../types";

/** Denominator for integer percentage math: 10000 = 100.00%. */
export const BASIS_POINTS_DENOMINATOR = 10_000;

/** Maximum discount: 90.00% (9000 bp). 100% is deliberately NOT permitted:
 * an accidental configuration must never make a future paid deployment
 * completely free. A true 100% promotion can be introduced deliberately later
 * if required. Minimum remains > 0. */
export const MAX_DISCOUNT_BASIS_POINTS = 9000;

/**
 * Maximum single fee field an admin may publish, in BNB.
 *
 * Rationale: commercial token-creation fees are fractions of a BNB. A per-
 * field cap of 1 BNB stops a fat-fingered "10 BNB base fee" from ever going
 * live; any legitimate increase beyond this ships as a reviewed constant
 * change, not a silent form submit.
 */
export const MAX_SINGLE_FEE_BNB = "1";

/**
 * Maximum publishable quote subtotal (base + all features), in BNB.
 *
 * A second, total-level guard so individually-plausible fields cannot combine
 * into an absurd headline price.
 */
export const MAX_QUOTE_SUBTOTAL_BNB = "5";

/** Maximum campaign lifetime (366 days): campaigns have real ends, never "until 2099". */
export const MAX_CAMPAIGN_DURATION_MS = 366 * 24 * 60 * 60 * 1000;

export const CAMPAIGN_NAME_MIN = 3;
export const CAMPAIGN_NAME_MAX = 80;
export const CAMPAIGN_CODE_MIN = 4;
export const CAMPAIGN_CODE_MAX = 32;

const CAMPAIGN_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,30}[A-Z0-9]$/;

const MAX_SINGLE_FEE_WEI = parseBnbToWei(MAX_SINGLE_FEE_BNB);
const MAX_QUOTE_SUBTOTAL_WEI = parseBnbToWei(MAX_QUOTE_SUBTOTAL_BNB);

export type CampaignWindow = {
  enabled: boolean;
  startsAt: Date;
  endsAt: Date;
};

export type DerivedCampaignStatus =
  | "scheduled"
  | "active"
  | "ended"
  | "disabled";

/**
 * Derives the public campaign status from stored fields + server time.
 * Never stored, never client-supplied.
 */
export function deriveCampaignStatus(
  campaign: CampaignWindow,
  now: Date = new Date()
): DerivedCampaignStatus {
  const nowMs = now.getTime();
  if (!campaign.enabled) return "disabled";
  if (nowMs < campaign.startsAt.getTime()) return "scheduled";
  if (nowMs >= campaign.endsAt.getTime()) return "ended";
  return "active";
}

/** True only when the campaign may reduce a quote right now. */
export function isCampaignUsableNow(
  campaign: CampaignWindow,
  now: Date = new Date()
): boolean {
  return deriveCampaignStatus(campaign, now) === "active";
}

/**
 * Normalizes a raw promo code (trim + uppercase). Returns null for absent
 * input (undefined/null/""). Throws a descriptive Error for malformed codes
 * so callers can map to a sanitized 400 without leaking internals.
 */
export function normalizeCampaignCode(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== "string") {
    throw new Error("campaign code must be a string");
  }
  const code = input.trim().toUpperCase();
  if (code.length === 0) return null;
  if (
    code.length < CAMPAIGN_CODE_MIN ||
    code.length > CAMPAIGN_CODE_MAX ||
    !CAMPAIGN_CODE_PATTERN.test(code)
  ) {
    throw new Error(
      `campaign code must be ${CAMPAIGN_CODE_MIN}..${CAMPAIGN_CODE_MAX} characters of A-Z 0-9 - _`
    );
  }
  return code;
}

/**
 * Exact percentage discount for a subtotal. Deterministic round-DOWN
 * (truncation): the discount never exceeds the mathematical percentage.
 */
export function discountWeiForSubtotal(
  subtotalWei: bigint,
  basisPoints: number
): bigint {
  if (!Number.isInteger(basisPoints)) {
    throw new Error("basis points must be an integer");
  }
  if (basisPoints < 1 || basisPoints > MAX_DISCOUNT_BASIS_POINTS) {
    throw new Error(
      `basis points must be within 1..${MAX_DISCOUNT_BASIS_POINTS}`
    );
  }
  if (subtotalWei < 0n) {
    throw new Error("subtotal must not be negative");
  }
  return (subtotalWei * BigInt(basisPoints)) / BigInt(BASIS_POINTS_DENOMINATOR);
}

/**
 * Server-authoritative quote with a percentage campaign applied.
 *
 * Reuses the existing pure `calculatePlatformFee` WITHOUT duplicating its
 * logic: first compute the undiscounted subtotal, derive the exact bigint
 * discount, then re-quote through the established reference/effective
 * campaign path (which revalidates discount <= subtotal by construction).
 */
export function quoteWithPercentCampaign(
  config: PricingConfig,
  selection: ReadonlyArray<string>,
  campaign: { basisPoints: number; start?: string; end?: string }
): PricingResult {
  const undiscounted = calculatePlatformFee(config, selection);
  const discountWei = discountWeiForSubtotal(
    undiscounted.subtotalWei,
    campaign.basisPoints
  );
  return calculatePlatformFee(config, selection, {
    status: "active",
    referenceWei: undiscounted.subtotalWei,
    effectiveWei: undiscounted.subtotalWei - discountWei,
    ...(campaign.start !== undefined ? { start: campaign.start } : {}),
    ...(campaign.end !== undefined ? { end: campaign.end } : {}),
  });
}

export type PricingFeeMap = {
  base: bigint;
  burn: bigint;
  mint: bigint;
  pause: bigint;
  maxTx: bigint;
  maxWallet: bigint;
  blacklist: bigint;
  whitelist: bigint;
};

const PRICING_FEE_FIELDS = [
  "base",
  "burn",
  "mint",
  "pause",
  "maxTx",
  "maxWallet",
  "blacklist",
  "whitelist",
] as const;

export function pricingFeeMapToConfig(
  fees: PricingFeeMap,
  version: string
): PricingConfig {
  const featureFees: Partial<Record<PaidFeatureId, bigint>> = {};
  for (const id of PAID_FEATURES) {
    featureFees[id] = fees[id];
  }
  return { version, baseFeeWei: fees.base, featureFees };
}

export type ParsedPricingPublish = {
  fees: PricingFeeMap;
};

/**
 * Validates an admin pricing publish body. Accepts ONLY the eight fee
 * fields as human-readable BNB decimal strings; anything else (wei values,
 * version override, status flags, extra keys) is rejected.
 */
export function parsePricingPublishInput(input: unknown): ParsedPricingPublish {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("pricing body must be a JSON object");
  }
  const record = input as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!(PRICING_FEE_FIELDS as ReadonlyArray<string>).includes(key)) {
      throw new Error(`unexpected field "${key}"`);
    }
  }
  const fees = {} as PricingFeeMap;
  for (const field of PRICING_FEE_FIELDS) {
    const raw = record[field];
    if (typeof raw !== "string" || raw.trim().length === 0) {
      throw new Error(`field "${field}" is required as a BNB decimal string`);
    }
    let wei: bigint;
    try {
      wei = parseBnbToWei(raw.trim());
    } catch {
      throw new Error(`field "${field}" is not a valid BNB amount`);
    }
    if (wei > MAX_SINGLE_FEE_WEI) {
      throw new Error(
        `field "${field}" exceeds the maximum of ${MAX_SINGLE_FEE_BNB} BNB`
      );
    }
    fees[field] = wei;
  }
  const subtotal = (Object.values(fees) as bigint[]).reduce(
    (sum, value) => sum + value,
    0n
  );
  if (subtotal > MAX_QUOTE_SUBTOTAL_WEI) {
    throw new Error(
      `combined price exceeds the maximum of ${MAX_QUOTE_SUBTOTAL_BNB} BNB`
    );
  }
  return { fees };
}

export type ParsedCampaignCreate = {
  name: string;
  code: string | null;
  basisPoints: number;
  startsAt: Date;
  endsAt: Date;
};

function parseCampaignName(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("campaign name is required");
  }
  const name = input.trim().replace(/\s+/g, " ");
  if (
    name.length < CAMPAIGN_NAME_MIN ||
    name.length > CAMPAIGN_NAME_MAX
  ) {
    throw new Error(
      `campaign name must be ${CAMPAIGN_NAME_MIN}..${CAMPAIGN_NAME_MAX} characters`
    );
  }
  return name;
}

function parseBasisPoints(input: unknown): number {
  if (typeof input !== "number" || !Number.isInteger(input)) {
    throw new Error("discount basis points must be an integer");
  }
  if (input < 1 || input > MAX_DISCOUNT_BASIS_POINTS) {
    throw new Error(
      `discount must be within 1..${MAX_DISCOUNT_BASIS_POINTS} basis points`
    );
  }
  return input;
}

function parseCampaignDate(input: unknown, field: string): Date {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error(`field "${field}" is required as an ISO date string`);
  }
  const ms = Date.parse(input);
  if (Number.isNaN(ms)) {
    throw new Error(`field "${field}" is not a valid date`);
  }
  return new Date(ms);
}

/**
 * Validates an admin campaign-create body. Strict keys only; dates must form
 * a real future-leaning window (starts < ends, ends in the future, lifetime
 * capped) evaluated against server time.
 */
export function parseCampaignCreateInput(
  input: unknown,
  now: Date = new Date()
): ParsedCampaignCreate {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("campaign body must be a JSON object");
  }
  const record = input as Record<string, unknown>;
  const allowed = new Set(["name", "code", "discountBasisPoints", "startsAt", "endsAt"]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new Error(`unexpected field "${key}"`);
    }
  }
  const name = parseCampaignName(record.name);
  const code = normalizeCampaignCode(record.code ?? null);
  const basisPoints = parseBasisPoints(record.discountBasisPoints);
  const startsAt = parseCampaignDate(record.startsAt, "startsAt");
  const endsAt = parseCampaignDate(record.endsAt, "endsAt");
  if (startsAt.getTime() >= endsAt.getTime()) {
    throw new Error("campaign must start before it ends");
  }
  if (endsAt.getTime() <= now.getTime()) {
    throw new Error("campaign end must be in the future");
  }
  if (endsAt.getTime() - startsAt.getTime() > MAX_CAMPAIGN_DURATION_MS) {
    throw new Error("campaign lifetime must not exceed 366 days");
  }
  return { name, code, basisPoints, startsAt, endsAt };
}

export type ParsedCampaignPatch = {
  name?: string;
  code?: string | null;
  basisPoints?: number;
  startsAt?: Date;
  endsAt?: Date;
  enabled?: boolean;
};

/**
 * Validates an admin campaign-edit body against the campaign's CURRENT state.
 *
 * Auditability rule: once a campaign has STARTED, its economic terms (name,
 * code, discount, window) are frozen — only the `enabled` kill-switch may
 * change. Future campaigns may be edited freely (still validated). Ended
 * campaigns may only be disabled.
 */
export function parseCampaignPatchInput(
  input: unknown,
  current: CampaignWindow,
  now: Date = new Date()
): ParsedCampaignPatch {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("campaign body must be a JSON object");
  }
  const record = input as Record<string, unknown>;
  const allowed = new Set([
    "name",
    "code",
    "discountBasisPoints",
    "startsAt",
    "endsAt",
    "enabled",
  ]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new Error(`unexpected field "${key}"`);
    }
  }
  const status = deriveCampaignStatus(current, now);
  const patch: ParsedCampaignPatch = {};
  const wantsEconomicChange =
    record.name !== undefined ||
    record.code !== undefined ||
    record.discountBasisPoints !== undefined ||
    record.startsAt !== undefined ||
    record.endsAt !== undefined;
  if (wantsEconomicChange && status !== "scheduled") {
    throw new Error(
      "only future campaigns may change economic terms; disable this campaign instead"
    );
  }
  if (record.name !== undefined) patch.name = parseCampaignName(record.name);
  if (record.code !== undefined) {
    patch.code = normalizeCampaignCode(record.code);
  }
  if (record.discountBasisPoints !== undefined) {
    patch.basisPoints = parseBasisPoints(record.discountBasisPoints);
  }
  let startsAt = current.startsAt;
  let endsAt = current.endsAt;
  if (record.startsAt !== undefined) {
    startsAt = parseCampaignDate(record.startsAt, "startsAt");
    patch.startsAt = startsAt;
  }
  if (record.endsAt !== undefined) {
    endsAt = parseCampaignDate(record.endsAt, "endsAt");
    patch.endsAt = endsAt;
  }
  if (patch.startsAt !== undefined || patch.endsAt !== undefined) {
    if (startsAt.getTime() >= endsAt.getTime()) {
      throw new Error("campaign must start before it ends");
    }
    if (endsAt.getTime() <= now.getTime()) {
      throw new Error("campaign end must be in the future");
    }
    if (endsAt.getTime() - startsAt.getTime() > MAX_CAMPAIGN_DURATION_MS) {
      throw new Error("campaign lifetime must not exceed 366 days");
    }
  }
  if (record.enabled !== undefined) {
    if (typeof record.enabled !== "boolean") {
      throw new Error('field "enabled" must be a boolean');
    }
    patch.enabled = record.enabled;
  }
  if (Object.keys(patch).length === 0) {
    throw new Error("no changes supplied");
  }
  return patch;
}
