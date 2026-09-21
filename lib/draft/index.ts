export type DraftConfig = {
  name: string;
  symbol: string;
  decimals: string;
  supply: string;
};

export const NAME_MAX = 40;
export const SYMBOL_MAX = 11;
export const DECIMALS_MIN = 0;
export const DECIMALS_MAX = 18;
export const SUPPLY_MIN = 1;
export const SUPPLY_MAX = Number.MAX_SAFE_INTEGER;

export const DRAFT_DEFAULTS: DraftConfig = {
  name: "Maker",
  symbol: "MAKER",
  decimals: "18",
  supply: "1,000,000,000",
};

export type DraftQuery = Record<string, string | string[] | undefined>;

export function formatDecimals(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return null;
  const value = Number(digits);
  if (!Number.isInteger(value)) return null;
  if (value < DECIMALS_MIN || value > DECIMALS_MAX) return null;
  return String(value);
}

export function formatSupplyDigits(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return null;
  const value = Number(digits);
  if (!Number.isSafeInteger(value)) return null;
  if (value < SUPPLY_MIN || value > SUPPLY_MAX) return null;
  return digits;
}

export function formatSupplyDisplay(raw: unknown): string | null {
  const digits = formatSupplyDigits(raw);
  if (digits === null) return null;
  const value = Number(digits);
  return value.toLocaleString("en-US");
}

export function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const compact = raw.replace(/\s+/g, " ").trim();
  if (compact === "") return null;
  if (compact.length > NAME_MAX) return null;
  if (/[\u0000-\u001f\u007f]/.test(compact)) return null;
  return compact;
}

export function sanitizeSymbol(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const compact = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (compact === "") return null;
  if (compact.length > SYMBOL_MAX) return null;
  return compact;
}

export function sanitizeDecimals(raw: unknown): string | null {
  const value = formatDecimals(raw);
  if (value === null) return null;
  return value;
}

export function sanitizeSupply(raw: unknown): string {
  const formatted = formatSupplyDisplay(raw);
  return formatted ?? DRAFT_DEFAULTS.supply;
}

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export function resolveDraft(query: DraftQuery): DraftConfig {
  return {
    name: sanitizeName(first(query.name)) ?? DRAFT_DEFAULTS.name,
    symbol: sanitizeSymbol(first(query.symbol)) ?? DRAFT_DEFAULTS.symbol,
    decimals: sanitizeDecimals(first(query.decimals)) ?? DRAFT_DEFAULTS.decimals,
    supply: sanitizeSupply(first(query.supply)),
  };
}

export function draftToQuery(draft: DraftConfig): URLSearchParams {
  const params = new URLSearchParams();
  params.set("name", draft.name.trim() === "" ? DRAFT_DEFAULTS.name : draft.name.trim());
  params.set(
    "symbol",
    draft.symbol === "" ? DRAFT_DEFAULTS.symbol : draft.symbol
  );
  params.set(
    "decimals",
    draft.decimals === "" ? DRAFT_DEFAULTS.decimals : draft.decimals
  );
  const supplyDigits = formatSupplyDigits(
    draft.supply === "" ? DRAFT_DEFAULTS.supply : draft.supply
  );
  params.set("supply", supplyDigits ?? formatSupplyDigits(DRAFT_DEFAULTS.supply)!);
  return params;
}

export function draftToCreatePath(draft: DraftConfig): string {
  return `/create?${draftToQuery(draft).toString()}`;
}