/**
 * DEV-only wallet event log + shared provider reference ids.
 *
 * All functions are safe to call in production: everything no-ops unless the
 * page runs a development build in a browser (`process.env.NODE_ENV` is
 * replaced at build time, so bundlers eliminate the live branch entirely).
 * Production behavior never depends on this module.
 */

export type DevLogEntry = {
  t: string;
  type: string;
  detail: string;
};

const MAX_ENTRIES = 200;
const entries: DevLogEntry[] = [];
const listeners = new Set<() => void>();

let refCounter = 0;
const refIds = new WeakMap<object, string>();

/** Stable short id for a provider object reference (`prov-1`, …). */
export function devRefId(value: unknown): string {
  if (typeof value !== "object" || value === null) return "none";
  const existing = refIds.get(value);
  if (existing) return existing;
  refCounter += 1;
  const id = `prov-${refCounter}`;
  refIds.set(value, id);
  return id;
}

function enabled(): boolean {
  try {
    if (process.env.NODE_ENV === "production") return false;
  } catch {
    return false;
  }
  return typeof window !== "undefined";
}

/** Record a timestamped diagnostics event (dev only, ring buffer). */
export function devLog(type: string, detail: string): void {
  if (!enabled()) return;
  entries.push({ t: new Date().toISOString(), type, detail });
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  try {
    console.debug(`[wallet-dev] ${type} ${detail}`);
  } catch {
    /* ignore */
  }
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}

export function getDevLog(): DevLogEntry[] {
  return [...entries];
}

export function clearDevLog(): void {
  entries.length = 0;
}

export function subscribeDevLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
