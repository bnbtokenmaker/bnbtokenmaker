import { calculatePlatformFee } from "../calculate";
import type { CampaignDto } from "../dto";
import { PAID_FEATURES, isPaidFeature } from "../features";
import { formatWeiBnbDisplay, weiToString } from "../money";
import { PRESETS, PRESET_IDS, selectedFeatureIds } from "../presets";
import type { PresetId } from "../presets";
import type { CampaignState, FeatureLineItem, PricingResult } from "../types";
import type { QuoteLineItemDto, QuoteResponse, PricingSource } from "./types";
import {
  normalizeCampaignCode,
  quoteWithPercentCampaign,
} from "./campaign-policy";
import type { AuthoritativeSnapshot } from "./store";

const MAX_FEATURES = PAID_FEATURES.length;
const MAX_FEATURE_ID_LENGTH = 64;

export type QuoteSelection =
  | {
      ok: true;
      selection: ReadonlyArray<string>;
      preset: PresetId | null;
      campaignCode: string | null;
    }
  | { ok: false; code: string; message: string };

/**
 * Strictly validates and normalizes a raw quote request body.
 *
 * The API accepts ONLY the selection intent: an optional `preset`, an
 * optional explicit list of `features` (canonical feature ids), and an
 * optional `campaignCode`. Everything else is rejected — including any
 * client-supplied wei values, negative prices, feature objects, partial
 * configs, discount amounts, final prices, or money-shaped fields.
 */
export function parseQuoteRequest(input: unknown): QuoteSelection {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, code: "invalid-request", message: "request body must be a JSON object" };
  }
  const record = input as Record<string, unknown>;
  const keys = Object.keys(record);
  for (const key of keys) {
    if (key !== "preset" && key !== "features" && key !== "campaignCode") {
      return {
        ok: false,
        code: "unknown-field",
        message: `unexpected field "${key}" is not accepted — only "preset", "features" and "campaignCode" are allowed`,
      };
    }
  }

  const hasPreset = keys.includes("preset");
  const hasFeatures = keys.includes("features");
  if (!hasPreset && !hasFeatures) {
    return { ok: false, code: "missing-selection", message: "a preset or feature list is required" };
  }

  let preset: PresetId | null = null;
  if (hasPreset) {
    const raw = record.preset;
    if (typeof raw !== "string") {
      return { ok: false, code: "invalid-preset", message: "preset must be a string" };
    }
    if (!PRESET_IDS.includes(raw as PresetId)) {
      return {
        ok: false,
        code: "unsupported-preset",
        message: `unsupported preset "${raw}"`,
      };
    }
    preset = raw as PresetId;
  }

  let features: ReadonlyArray<string> = [];
  if (hasFeatures) {
    const raw = record.features;
    if (!Array.isArray(raw)) {
      return { ok: false, code: "invalid-features", message: "features must be an array" };
    }
    if (raw.length > MAX_FEATURES) {
      return {
        ok: false,
        code: "too-many-features",
        message: `at most ${MAX_FEATURES} features can be selected`,
      };
    }
    const seen = new Set<string>();
    for (const item of raw) {
      if (typeof item !== "string") {
        return { ok: false, code: "invalid-feature", message: "every feature id must be a string" };
      }
      if (item.length === 0 || item.length > MAX_FEATURE_ID_LENGTH) {
        return {
          ok: false,
          code: "invalid-feature",
          message: "feature id length must be within 1..64 characters",
        };
      }
      if (!isPaidFeature(item)) {
        return { ok: false, code: "unknown-feature", message: `unknown feature "${item}"` };
      }
      if (seen.has(item)) {
        return {
          ok: false,
          code: "duplicate-feature",
          message: `feature "${item}" was selected more than once`,
        };
      }
      seen.add(item);
      features = [...features, item];
    }
  }

  // An explicit feature list, when present, is the authoritative selection;
  // a preset is only used as a convenience when no explicit list is given.
  const selection = hasFeatures
    ? features
    : (selectedFeatureIds(PRESETS[preset as PresetId]) as ReadonlyArray<string>);

  // Optional promo code: normalized server-side (trim + uppercase). Absent
  // means automatic campaigns only; malformed means rejected, never guessed.
  let campaignCode: string | null = null;
  if (keys.includes("campaignCode")) {
    try {
      campaignCode = normalizeCampaignCode(record.campaignCode);
    } catch {
      return {
        ok: false,
        code: "invalid-campaign-code",
        message: "campaign code is malformed",
      };
    }
  }

  return { ok: true, selection, preset, campaignCode };
}

/**
 * Resolves whether a campaign reduces the price at the given instant.
 *
 * The domain `calculatePlatformFee` deliberately only checks the abstract
 * `status` field. Real start/end/status semantics live HERE, in the
 * server-owned layer: a campaign that is currently inactive, has not started
 * yet, or has already expired must NOT reduce the price.
 *
 * `now` is optional. When omitted, the campaign window is UNRESOLVED and no
 * discount is granted (nothing is ever offered without a confirmed, in-window
 * campaign). This keeps static Server Components free of a wall clock while
 * the authoritative quote endpoint always passes a real `now`.
 */
export function resolveCampaignForTime(
  campaign: CampaignState | null,
  now?: Date
): CampaignState | undefined {
  if (campaign === null || campaign.status !== "active") {
    return undefined;
  }
  if (now === undefined) {
    return undefined;
  }
  if (typeof campaign.start === "string") {
    const start = Date.parse(campaign.start);
    if (Number.isNaN(start) || now.getTime() < start) {
      return undefined;
    }
  }
  if (typeof campaign.end === "string") {
    const end = Date.parse(campaign.end);
    if (Number.isNaN(end) || now.getTime() > end) {
      return undefined;
    }
  }
  return campaign;
}

/**
 * Server-authoritative platform fee quote.
 *
 * Uses the configuration (and campaign) owned by the provided PricingSource —
 * never anything supplied by the client. Deterministic: the same source and
 * selection always produce the same result.
 */
export function quotePlatformFee(
  source: PricingSource,
  selection: ReadonlyArray<string>,
  now?: Date
): PricingResult {
  const snapshot = source.getPricingSnapshot();
  const campaign = resolveCampaignForTime(snapshot.campaign, now);
  return calculatePlatformFee(snapshot.config, selection, campaign);
}

export function isKnownPricingVersion(source: PricingSource, version: string): boolean {
  return typeof version === "string" && source.getPricingConfigByVersion(version) !== null;
}

/**
 * Phase 7C snapshot quote: prices a selection against an authoritative
 * DB-backed snapshot (active pricing version + pre-resolved campaign).
 *
 * The campaign is applied as an exact integer-basis-points discount through
 * the shared `quoteWithPercentCampaign` path — no duplicated math. With no
 * campaign, this is identical to the legacy static-source quote.
 */
export function quoteFromSnapshot(
  snapshot: AuthoritativeSnapshot,
  selection: ReadonlyArray<string>
): PricingResult {
  if (!snapshot.campaign) {
    return calculatePlatformFee(snapshot.config, selection);
  }
  return quoteWithPercentCampaign(snapshot.config, selection, {
    basisPoints: snapshot.campaign.basisPoints,
    start: snapshot.campaign.startsAt.toISOString(),
    end: snapshot.campaign.endsAt.toISOString(),
  });
}

export type QuoteCampaignMeta = {
  id: number;
  name: string;
  code: string | null;
  discountBasisPoints: number;
};

const toLineItemDto = (item: FeatureLineItem): QuoteLineItemDto => ({
  feature: item.feature,
  priceWei: weiToString(item.priceWei),
});

const toCampaignDto = (
  result: PricingResult,
  meta?: QuoteCampaignMeta
): CampaignDto | null => {
  const campaign = result.campaign;
  if (campaign === null) {
    return null;
  }
  return {
    referenceWei: weiToString(campaign.referenceWei),
    effectiveWei: weiToString(campaign.effectiveWei),
    discountWei: weiToString(campaign.discountWei),
    ...(campaign.start !== undefined ? { start: campaign.start } : {}),
    ...(campaign.end !== undefined ? { end: campaign.end } : {}),
    // Public metadata only when a real campaign reduced the quote.
    ...(meta !== undefined
      ? {
          id: meta.id,
          name: meta.name,
          code: meta.code,
          discountBasisPoints: meta.discountBasisPoints,
        }
      : {}),
  };
};

export function toQuoteDto(
  result: PricingResult,
  campaignMeta?: QuoteCampaignMeta
): QuoteResponse {
  return {
    pricingVersion: result.pricingVersion,
    currency: "BNB",
    basePriceWei: weiToString(result.baseFeeWei),
    basePriceBnb: formatWeiBnbDisplay(result.baseFeeWei),
    lineItems: result.lineItems.map(toLineItemDto),
    selectedFeatures: result.selectedFeatures as ReadonlyArray<string>,
    subtotalWei: weiToString(result.subtotalWei),
    discountWei: weiToString(result.discountWei),
    totalWei: weiToString(result.totalPlatformFeeWei),
    totalBnb: formatWeiBnbDisplay(result.totalPlatformFeeWei),
    campaign: toCampaignDto(result, campaignMeta),
  };
}