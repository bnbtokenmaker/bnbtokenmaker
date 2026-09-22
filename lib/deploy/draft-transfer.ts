/**
 * /create → /deploy draft transport (client state carriage only).
 *
 * sessionStorage carries the NON-SECRET token configuration the user just
 * edited so the dedicated /deploy route can review it. The stored draft is
 * TRANSPORT ONLY — never authorization:
 *
 * - No wallet secrets, private keys, seed phrases, or provider objects.
 * - No authoritative pricing (only the feature selection; /deploy re-quotes).
 * - No network/chain/account claims (/deploy re-verifies everything live).
 * - Versioned (`version: 1`); unknown versions fail closed.
 *
 * /deploy MUST parse this with `loadDeployDraft` and revalidate through
 * `validateTokenConfig` before displaying anything deployable. Absent,
 * malformed, version-mismatched, or shape-invalid drafts return null and the
 * page must render "No token configuration found" without attempting any
 * transaction.
 */

import type { PaidFeatureId } from "../pricing/types";
import { validateTokenConfig } from "../token/config";

export const DEPLOY_DRAFT_VERSION = 1 as const;
export const DEPLOY_DRAFT_KEY = "btm-deploy-draft-v1";

const KNOWN_FEATURES: ReadonlySet<string> = new Set([
  "burn",
  "mint",
  "pause",
  "maxTx",
  "maxWallet",
  "blacklist",
  "whitelist",
]);

export type DeployDraftFeatures = Record<PaidFeatureId, boolean>;

export type DeployDraftV1 = {
  version: typeof DEPLOY_DRAFT_VERSION;
  name: string;
  symbol: string;
  /** Integer string, e.g. "18". */
  decimals: string;
  /** Human supply, digits with optional commas, e.g. "1,000,000". */
  supply: string;
  feats: DeployDraftFeatures;
  maxTxPercent: string;
  maxWalletPercent: string;
  savedAt: number;
};

function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Strict shape check: known fields with the right primitive types only. */
export function parseDeployDraft(input: unknown): DeployDraftV1 | null {
  if (!isRecord(input)) return null;
  if (input.version !== DEPLOY_DRAFT_VERSION) return null;
  const { name, symbol, decimals, supply, feats, maxTxPercent, maxWalletPercent, savedAt } = input;
  if (
    typeof name !== "string" ||
    typeof symbol !== "string" ||
    typeof decimals !== "string" ||
    typeof supply !== "string" ||
    typeof maxTxPercent !== "string" ||
    typeof maxWalletPercent !== "string" ||
    typeof savedAt !== "number" ||
    !Number.isFinite(savedAt)
  ) {
    return null;
  }
  if (!isRecord(feats)) return null;
  const keys = Object.keys(feats);
  if (keys.length !== KNOWN_FEATURES.size) return null;
  for (const key of keys) {
    if (!KNOWN_FEATURES.has(key) || typeof feats[key] !== "boolean") return null;
  }
  return {
    version: DEPLOY_DRAFT_VERSION,
    name,
    symbol,
    decimals,
    supply,
    feats: feats as unknown as DeployDraftFeatures,
    maxTxPercent,
    maxWalletPercent,
    savedAt,
  };
}

/** Keys that must never appear in a stored draft (defense in depth). */
const FORBIDDEN_KEYS = [
  "privateKey",
  "privatekey",
  "mnemonic",
  "seed",
  "seedPhrase",
  "secret",
  "provider",
  "signer",
];

export function draftContainsSecrets(input: unknown): boolean {
  if (!isRecord(input)) return false;
  const haystack = JSON.stringify(input).toLowerCase();
  return FORBIDDEN_KEYS.some((key) => {
    const pattern = new RegExp(`"${key.toLowerCase()}"\\s*:`, "u");
    return pattern.test(haystack);
  });
}

export function saveDeployDraft(draft: DeployDraftV1): void {
  try {
    storage()?.setItem(
      DEPLOY_DRAFT_KEY,
      JSON.stringify({ ...draft, version: DEPLOY_DRAFT_VERSION, savedAt: Date.now() })
    );
  } catch {
    /* storage unavailable — navigation still occurs, /deploy fails closed */
  }
}

export function loadDeployDraft(): DeployDraftV1 | null {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(DEPLOY_DRAFT_KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return parseDeployDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearDeployDraft(): void {
  try {
    storage()?.removeItem(DEPLOY_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Placeholder owner for shape-level domain checks (the live deployer is
 * bound pre-transaction; this only proves the draft is deployable). */
const DRAFT_CHECK_OWNER = "0x0000000000000000000000000000000000000001" as const;

/**
 * Revalidate a parsed draft through the token domain rules. /deploy must
 * call this after `loadDeployDraft`: a shape-valid but domain-invalid draft
 * (tampered supply, bad symbol, both lists on) fails closed.
 */
export function draftDomainValid(draft: DeployDraftV1): boolean {
  try {
    validateTokenConfig({
      name: draft.name,
      symbol: draft.symbol,
      decimals: draft.decimals,
      supplyHuman: draft.supply,
      owner: DRAFT_CHECK_OWNER,
      features: { ...draft.feats },
      maxTxPercent: draft.feats.maxTx ? draft.maxTxPercent : undefined,
      maxWalletPercent: draft.feats.maxWallet ? draft.maxWalletPercent : undefined,
    });
    return !(draft.feats.blacklist && draft.feats.whitelist);
  } catch {
    return false;
  }
}
