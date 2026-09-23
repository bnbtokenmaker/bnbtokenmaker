/**
 * Phase 6C client-side quote access.
 *
 * The deployment UI never prices anything itself: it POSTs the bare feature
 * selection to the server-authoritative `/api/pricing/quote` endpoint and
 * renders the returned DTO. The DTO shape is validated at runtime so a
 * malformed response fails closed instead of rendering invented money.
 */

import type { PaidFeatureId } from "../pricing/types";
import { DeployFlowError } from "./errors";

export type QuoteLineItem = {
  feature: PaidFeatureId;
  /** Decimal wei string, digits only. */
  priceWei: string;
};

export type AuthoritativeQuoteCampaign = {
  name: string;
  code: string | null;
  discountBasisPoints: number;
  /** ISO end time of the campaign window (real, server-provided). */
  endsAt: string | null;
};

export type AuthoritativeQuote = {
  pricingVersion: string;
  currency: "BNB";
  basePriceWei: string;
  basePriceBnb: string;
  lineItems: QuoteLineItem[];
  selectedFeatures: string[];
  subtotalWei: string;
  discountWei: string;
  totalWei: string;
  totalBnb: string;
  /** Present only when a real campaign reduced the quote. */
  campaign?: AuthoritativeQuoteCampaign | null;
};

const KNOWN_FEATURES: ReadonlySet<string> = new Set([
  "burn",
  "mint",
  "pause",
  "maxTx",
  "maxWallet",
  "blacklist",
  "whitelist",
]);

function isWeiString(value: unknown): value is string {
  return typeof value === "string" && /^\d+$/.test(value);
}

/** Runtime-validate an unknown payload into an AuthoritativeQuote. */
export function parseQuotePayload(input: unknown): AuthoritativeQuote | null {
  if (!input || typeof input !== "object") return null;
  const record = (input as { quote?: unknown }).quote ?? input;
  if (!record || typeof record !== "object") return null;
  const q = record as Record<string, unknown>;
  if (
    typeof q.pricingVersion !== "string" ||
    q.pricingVersion.length === 0 ||
    q.currency !== "BNB" ||
    !isWeiString(q.basePriceWei) ||
    typeof q.basePriceBnb !== "string" ||
    !isWeiString(q.subtotalWei) ||
    !isWeiString(q.discountWei) ||
    !isWeiString(q.totalWei) ||
    typeof q.totalBnb !== "string" ||
    !Array.isArray(q.lineItems) ||
    !Array.isArray(q.selectedFeatures)
  ) {
    return null;
  }
  const lineItems: QuoteLineItem[] = [];
  for (const item of q.lineItems) {
    if (!item || typeof item !== "object") return null;
    const entry = item as Record<string, unknown>;
    if (
      typeof entry.feature !== "string" ||
      !KNOWN_FEATURES.has(entry.feature) ||
      !isWeiString(entry.priceWei)
    ) {
      return null;
    }
    lineItems.push({
      feature: entry.feature as PaidFeatureId,
      priceWei: entry.priceWei,
    });
  }
  for (const feature of q.selectedFeatures) {
    if (typeof feature !== "string" || !KNOWN_FEATURES.has(feature)) return null;
  }
  // Campaign summary is display-only and tolerant: a malformed campaign block
  // is dropped (showing the full undiscounted price) rather than failing the
  // whole quote or inventing a discount.
  const campaign = parseQuoteCampaign(q.campaign);
  return {
    pricingVersion: q.pricingVersion,
    currency: "BNB",
    basePriceWei: q.basePriceWei,
    basePriceBnb: q.basePriceBnb,
    lineItems,
    selectedFeatures: [...(q.selectedFeatures as string[])],
    subtotalWei: q.subtotalWei,
    discountWei: q.discountWei,
    totalWei: q.totalWei,
    totalBnb: q.totalBnb,
    campaign,
  };
}

function parseQuoteCampaign(input: unknown): AuthoritativeQuoteCampaign | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  if (typeof record.name !== "string" || record.name.length === 0) return null;
  if (
    typeof record.discountBasisPoints !== "number" ||
    !Number.isInteger(record.discountBasisPoints) ||
    record.discountBasisPoints < 1 ||
    record.discountBasisPoints > 9000
  ) {
    return null;
  }
  if (
    record.code !== null &&
    record.code !== undefined &&
    typeof record.code !== "string"
  ) {
    return null;
  }
  let endsAt: string | null = null;
  if (typeof record.end === "string") {
    endsAt = Number.isNaN(Date.parse(record.end)) ? null : record.end;
  }
  return {
    name: record.name,
    code:
      typeof record.code === "string" && record.code.length > 0
        ? record.code
        : null,
    discountBasisPoints: record.discountBasisPoints,
    endsAt,
  };
}

/**
 * Fetch a fresh authoritative quote for a feature selection.
 * Throws DeployFlowError("quote-stale") when the server cannot confirm a
 * price — the transaction must not be sent without one.
 */
export function fetchAuthoritativeQuote(
  features: ReadonlyArray<string>
): Promise<AuthoritativeQuote> {
  const run = async (): Promise<AuthoritativeQuote> => {
    let response: Response;
    try {
      response = await fetch("/api/pricing/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ features: [...features] }),
      });
    } catch {
      throw new DeployFlowError("quote-stale", "quote request unreachable");
    }
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      throw new DeployFlowError("quote-stale", "quote response unreadable");
    }
    if (!response.ok) {
      throw new DeployFlowError("quote-stale", "quote request rejected");
    }
    const parsed = parseQuotePayload(payload);
    if (!parsed) {
      throw new DeployFlowError("quote-stale", "quote shape invalid");
    }
    return parsed;
  };
  return run();
}

/** The testnet deployment itself is fee-free; the quote is shown for transparency. */
export const TESTNET_PLATFORM_FEE_WEI = 0n;
