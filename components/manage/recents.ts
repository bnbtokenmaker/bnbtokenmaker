/**
 * Phase 7D-E3 manager discovery recents (tab-local, no server).
 *
 * Remembers recently inspected token addresses per chain so a connected
 * wallet can jump back to previous BNBTokenMaker deployments. Storage is a
 * convenience only: on-chain owner() always determines privileges, and
 * manual address entry always remains available.
 */

const KEY_PREFIX = "btm-manage-recent-v1-";
const MAX_RECENTS = 8;

export type RecentTokens = string[];

function isAddressString(value: unknown): value is string {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/i.test(value);
}

export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function storage(): StorageLike | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseRecents(raw: string | null): RecentTokens {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAddressString).map((a) => a.toLowerCase()).slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

/** Load recents for a chain (empty when storage is unavailable). */
export function loadRecents(chainId: number, store?: StorageLike | null): RecentTokens {
  const s = store ?? storage();
  if (!s) return [];
  return parseRecents(s.getItem(`${KEY_PREFIX}${chainId}`));
}

/** Remember an address for a chain (most-recent first, deduplicated). */
export function saveRecent(
  chainId: number,
  address: string,
  store?: StorageLike | null
): RecentTokens {
  const normalized = address.toLowerCase();
  if (!isAddressString(address)) return loadRecents(chainId, store);
  const next = [normalized, ...loadRecents(chainId, store).filter((a) => a !== normalized)].slice(
    0,
    MAX_RECENTS
  );
  try {
    (store ?? storage())?.setItem(`${KEY_PREFIX}${chainId}`, JSON.stringify(next));
  } catch {
    /* storage unavailable — recents are a convenience only */
  }
  return next;
}
