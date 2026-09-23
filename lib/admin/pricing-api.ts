/**
 * Phase 7C admin pricing/campaign HTTP helpers (no `server-only`, so routes
 * stay importable from the tsx test runtime — same precedent as the admin
 * service and the pricing store).
 *
 * - requireAdminForRead / requireAdminForMutation: session auth, same-origin
 *   CSRF check for mutations, and per-IP rate limiting for mutations.
 * - Sanitized public DTOs: wei strings and derived campaign status only.
 *   Never admin password hashes, session tokens, DB URLs, or raw errors.
 */

import { isSameOriginRequest } from "./csrf";
import { AuthError, authenticateAdmin } from "./service";
import { sessionTokenFromCookieHeader } from "./session";
import { getAdminStores } from "./stores";
import {
  checkRateLimit,
  clientIpFromRequest,
} from "../server/rate-limit";
import {
  deriveCampaignStatus,
  type DerivedCampaignStatus,
} from "../pricing/server/campaign-policy";
import type {
  AdminAuditEventRow,
  CampaignRow,
  PricingVersionRow,
} from "../db/schema";

export type AdminRequester = {
  id: number;
  identifier: string;
};

export type AdminGuard =
  | { ok: true; admin: AdminRequester }
  | { ok: false; response: Response };

function jsonError(code: string, status: number): Response {
  return Response.json({ error: { code } }, { status });
}

export async function requireAdminForRead(
  request: Request
): Promise<AdminGuard> {
  const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
  try {
    const admin = await authenticateAdmin(token, getAdminStores());
    return { ok: true, admin: { id: admin.id, identifier: admin.identifier } };
  } catch (error) {
    if (error instanceof AuthError && error.code === "unavailable") {
      return { ok: false, response: jsonError("unavailable", 503) };
    }
    return { ok: false, response: jsonError("unauthenticated", 401) };
  }
}

const ADMIN_MUTATION_LIMIT = 30;
const ADMIN_MUTATION_WINDOW_MS = 10 * 60 * 1000;

export async function requireAdminForMutation(
  request: Request,
  scope: string
): Promise<AdminGuard> {
  if (!isSameOriginRequest(request)) {
    return { ok: false, response: jsonError("forbidden-origin", 403) };
  }
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(
    `admin:${scope}:${ip}`,
    ADMIN_MUTATION_LIMIT,
    ADMIN_MUTATION_WINDOW_MS
  );
  if (!limit.allowed) {
    const response = jsonError("rate-limited", 429);
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return { ok: false, response };
  }
  return requireAdminForRead(request);
}

export type PricingVersionDto = {
  id: number;
  version: string;
  status: "active" | "inactive";
  currency: "BNB";
  baseFeeWei: string;
  featureFees: {
    burn: string;
    mint: string;
    pause: string;
    maxTx: string;
    maxWallet: string;
    blacklist: string;
    whitelist: string;
  };
  createdAt: string;
  activatedAt: string | null;
};

export function toPricingVersionDto(row: PricingVersionRow): PricingVersionDto {
  return {
    id: row.id,
    version: row.version,
    status: row.status === "active" ? "active" : "inactive",
    currency: "BNB",
    baseFeeWei: row.baseFeeWei,
    featureFees: {
      burn: row.burnFeeWei,
      mint: row.mintFeeWei,
      pause: row.pauseFeeWei,
      maxTx: row.maxTxFeeWei,
      maxWallet: row.maxWalletFeeWei,
      blacklist: row.blacklistFeeWei,
      whitelist: row.whitelistFeeWei,
    },
    createdAt: row.createdAt.toISOString(),
    activatedAt: row.activatedAt ? row.activatedAt.toISOString() : null,
  };
}

/** Exact "12.34" percent string from integer basis points (no floats). */
export function basisPointsToPercentLabel(basisPoints: number): string {
  const whole = Math.floor(basisPoints / 100);
  const frac = String(basisPoints % 100).padStart(2, "0");
  return `${whole}.${frac}`;
}

export type CampaignDto = {
  id: number;
  name: string;
  code: string | null;
  discountBasisPoints: number;
  /** Human label, e.g. "10.00" (percent). Derived, never stored. */
  discountPercent: string;
  startsAt: string;
  endsAt: string;
  enabled: boolean;
  /** Derived from enabled + window + server time. */
  status: DerivedCampaignStatus;
};

export function toCampaignDto(
  row: CampaignRow,
  now: Date = new Date()
): CampaignDto {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    discountBasisPoints: row.discountBasisPoints,
    discountPercent: basisPointsToPercentLabel(row.discountBasisPoints),
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    enabled: row.enabled,
    status: deriveCampaignStatus(
      { enabled: row.enabled, startsAt: row.startsAt, endsAt: row.endsAt },
      now
    ),
  };
}

export type AuditEventDto = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
};

export function toAuditEventDto(row: AdminAuditEventRow): AuditEventDto {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}
