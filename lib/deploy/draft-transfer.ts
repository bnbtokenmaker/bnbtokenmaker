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

import { EMPTY_FEATURES, validateTokenConfig } from "../token/config";

export const DEPLOY_DRAFT_VERSION = 1 as const;
export const DEPLOY_DRAFT_KEY = "btm-deploy-draft-v1";

const DRAFT_FEATURE_IDS = [
  "burn",
  "mint",
  "pause",
  "maxTx",
  "maxWallet",
  "blacklist",
  "whitelist",
] as const;

/** Pre-V1 draft feature ids (frozen transport shape, version 1). */
export type DeployDraftFeatureId = (typeof DRAFT_FEATURE_IDS)[number];

const KNOWN_FEATURES: ReadonlySet<string> = new Set(DRAFT_FEATURE_IDS);

/** Pre-V1 draft feature map. V1 capabilities join the draft shape in 7D-E2. */
export type DeployDraftFeatures = Record<DeployDraftFeatureId, boolean>;

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
  // --- V1 additions (all optional: pre-V1 drafts parse without them) ---
  /** Only meaningful when the mint flag is on; defaults to "capped". */
  mintMode?: "capped" | "unlimited";
  /** Human token units for a capped lifetime supply. */
  maxSupplyHuman?: string;
  /** Priced V1 capabilities (mirrors the builder toggles). */
  trading?: boolean;
  /** Basis-point integers as strings (trading section). */
  buyTaxBps?: string;
  sellTaxBps?: string;
  marketingWallet?: string;
  antiBot?: boolean;
  snipeBlocks?: string;
  autoLiquidity?: boolean;
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
  // V1 extras are optional; when present they must have the right shape.
  const v1: Pick<
    DeployDraftV1,
    | "mintMode" | "maxSupplyHuman" | "trading" | "buyTaxBps" | "sellTaxBps"
    | "marketingWallet" | "antiBot" | "snipeBlocks" | "autoLiquidity"
  > = {};
  const optString = (key: string): string | undefined | "invalid" => {
    const v = input[key];
    if (v === undefined) return undefined;
    if (typeof v !== "string") return "invalid";
    return v;
  };
  const mintMode = input.mintMode;
  if (mintMode !== undefined) {
    if (mintMode !== "capped" && mintMode !== "unlimited") return null;
    v1.mintMode = mintMode;
  }
  for (const key of ["maxSupplyHuman", "buyTaxBps", "sellTaxBps", "marketingWallet", "snipeBlocks"] as const) {
    const v = optString(key);
    if (v === "invalid") return null;
    if (v !== undefined) v1[key] = v;
  }
  if (input.antiBot !== undefined) {
    if (typeof input.antiBot !== "boolean") return null;
    v1.antiBot = input.antiBot;
  }
  if (input.trading !== undefined) {
    if (typeof input.trading !== "boolean") return null;
    v1.trading = input.trading;
  }
  if (input.autoLiquidity !== undefined) {
    if (typeof input.autoLiquidity !== "boolean") return null;
    v1.autoLiquidity = input.autoLiquidity;
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
    ...v1,
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
      // Pre-V1 drafts carry the 7 paid-feature flags; V1 capabilities
      // default off at this bridge (7D-E adds them to the draft shape).
      features: { ...EMPTY_FEATURES, ...draft.feats },
      maxTxPercent: draft.feats.maxTx ? draft.maxTxPercent : undefined,
      maxWalletPercent: draft.feats.maxWallet ? draft.maxWalletPercent : undefined,
    });
    return !(draft.feats.blacklist && draft.feats.whitelist);
  } catch {
    return false;
  }
}
