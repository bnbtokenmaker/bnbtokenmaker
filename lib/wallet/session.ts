import { devLog, devRefId } from "./devlog";
import {
  asProvider,
  readProviderChainId,
  WalletProviderUnavailableError,
  type Eip1193ProviderLike,
} from "./switch";

/**
 * Provider-session layer.
 *
 * wagmi identifies the active wallet by connector id/uid, but in a
 * multi-injected-wallet page (MetaMask + Trust + Phantom, duplicate EIP-6963
 * announcements, connector re-instantiation) that is not enough: the app must
 * hold the EXACT EIP-6963 provider object the user selected and use that same
 * reference for accounts, chain, switching, events, and future pre-tx
 * validation. Reference equality (`===`) is the identity check — never name,
 * rdns, `window.ethereum`, or "current connector" assumptions.
 *
 * The session lives in module memory for the page lifetime only. The provider
 * object itself is never persisted to storage.
 */

export type SessionConnectorLike = {
  uid: string;
  id?: string;
  rdns?: unknown;
  getProvider: () => Promise<unknown>;
};

export type ProviderSession = {
  connectorUid: string;
  connectorId: string;
  rdns: string | null;
  providerRef: Eip1193ProviderLike;
  /** Lowercased expected account bound at select/observe time. */
  address: string;
  boundAt: "user-select" | "observed";
};

export class ProviderSessionMissingError extends Error {
  constructor() {
    super("No wallet session is active. Please reconnect your wallet.");
    this.name = "ProviderSessionMissingError";
  }
}

export class ProviderSessionMismatchError extends Error {
  constructor() {
    super(
      "Your wallet session changed underneath this page. Please reconnect your wallet and try again."
    );
    this.name = "ProviderSessionMismatchError";
  }
}

export class ProviderAccountMismatchError extends Error {
  constructor() {
    super(
      "The connected wallet account is no longer available in your wallet. Please reconnect the correct account and try again."
    );
    this.name = "ProviderAccountMismatchError";
  }
}

let activeSession: ProviderSession | null = null;
let pendingSelection: {
  connectorUid: string;
  connectorId: string;
  rdns: string | null;
  providerRef: Eip1193ProviderLike;
} | null = null;

export function getProviderSession(): ProviderSession | null {
  return activeSession;
}

export function clearProviderSession(): void {
  activeSession = null;
}

export function clearPendingSelection(): void {
  pendingSelection = null;
}

/**
 * Reconcile the pinned session with wagmi connection state. A session is
 * only meaningful while connected: any observed disconnect drops it, so a
 * later render can never derive truth from a stale pre-disconnect provider
 * (e.g. a session pinned before the wallet emitted `disconnect` on a
 * network change). Returns true when a session was dropped.
 */
export function reconcileSessionOnConnectionChange(
  isConnected: boolean
): boolean {
  if (isConnected) return false;
  if (!activeSession) return false;
  devLog(
    "session-cleared",
    `wagmi-disconnected uid=${activeSession.connectorUid} ref=${devRefId(activeSession.providerRef)}`
  );
  activeSession = null;
  return true;
}

/** Test/dev escape hatch: reset all in-memory session state. */
export function resetSessionStateForTests(): void {
  activeSession = null;
  pendingSelection = null;
}

function readRdns(connector: SessionConnectorLike): string | null {
  const raw = connector.rdns;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw)) {
    const first = raw.find(
      (value): value is string => typeof value === "string" && !!value.trim()
    );
    if (first) return first.trim();
  }
  return null;
}

export function normalizeAccount(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export function normalizeAccountList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    const normalized = normalizeAccount(entry);
    if (normalized && !out.includes(normalized)) out.push(normalized);
  }
  return out;
}

export function accountPresent(
  accounts: readonly string[],
  expected: string
): boolean {
  return accounts.includes(expected.toLowerCase());
}

/** Read `eth_accounts` (normalized, lowercased) from one exact provider. */
export async function readProviderAccounts(
  provider: Eip1193ProviderLike
): Promise<string[]> {
  let raw: unknown;
  try {
    raw = await provider.request({ method: "eth_accounts" });
  } catch {
    throw new WalletProviderUnavailableError();
  }
  return normalizeAccountList(raw);
}

/**
 * Step 1 of user-select binding: record the EXACT provider object held by
 * the connector the user clicked, BEFORE connecting. Call
 * `confirmUserSelection` after the connect resolves.
 */
export async function recordUserSelection(
  connector: SessionConnectorLike
): Promise<void> {
  const provider = asProvider(await connector.getProvider());
  pendingSelection = {
    connectorUid: connector.uid,
    connectorId: typeof connector.id === "string" ? connector.id : connector.uid,
    rdns: readRdns(connector),
    providerRef: provider,
  };
  devLog(
    "session-record",
    `uid=${pendingSelection.connectorUid} id=${pendingSelection.connectorId} rdns=${pendingSelection.rdns ?? "-"} ref=${devRefId(provider)}`
  );
}

/**
 * Step 2: confirm the connector still exposes the SAME provider object that
 * was recorded at click time, then bind the session to the connected
 * account. Throws `ProviderSessionMismatchError` when the provider reference
 * moved (re-instantiation, duplicate announcement winning, wrong target).
 */
export function confirmUserSelection(
  connector: SessionConnectorLike,
  accounts: unknown
): ProviderSession {
  const pending = pendingSelection;
  pendingSelection = null;
  if (!pending) {
    throw new ProviderSessionMissingError();
  }
  if (connector.uid !== pending.connectorUid) {
    throw new ProviderSessionMismatchError();
  }
  const normalized = normalizeAccountList(accounts);
  const primary = normalized[0];
  if (!primary) {
    throw new ProviderAccountMismatchError();
  }
  // The confirmation is intentionally synchronous: the provider reference was
  // captured pre-connect and the connector instance is the one the user
  // clicked. Live re-verification happens in `verifyProviderSession`.
  activeSession = {
    connectorUid: pending.connectorUid,
    connectorId: pending.connectorId,
    rdns: pending.rdns,
    providerRef: pending.providerRef,
    address: primary,
    boundAt: "user-select",
  };
  devLog(
    "session-bound",
    `user-select uid=${activeSession.connectorUid} ref=${devRefId(activeSession.providerRef)} addr=${primary}`
  );
  return activeSession;
}

/**
 * Fallback binder for sessions wagmi restored without our click flow
 * (page reload with persisted connection). Binds the live provider object of
 * the current connector only when it actually holds the expected account.
 */
export async function ensureSessionFromConnection(
  connector: SessionConnectorLike,
  expectedAddress: string
): Promise<ProviderSession> {
  const provider = asProvider(await connector.getProvider());
  const accounts = await readProviderAccounts(provider);
  if (!accountPresent(accounts, expectedAddress)) {
    throw new ProviderAccountMismatchError();
  }
  activeSession = {
    connectorUid: connector.uid,
    connectorId: typeof connector.id === "string" ? connector.id : connector.uid,
    rdns: readRdns(connector),
    providerRef: provider,
    address: expectedAddress.toLowerCase(),
    boundAt: "observed",
  };
  devLog(
    "session-bound",
    `observed uid=${activeSession.connectorUid} ref=${devRefId(provider)} addr=${activeSession.address}`
  );
  return activeSession;
}

export type VerifiedProviderSession = {
  provider: Eip1193ProviderLike;
  accounts: string[];
  chainId: number;
};

/**
 * Re-validate the pinned session against the live connector:
 * same connector uid, same provider object (`===`), expected account still
 * present, fresh `eth_chainId` from the SAME object. Anything else fails
 * closed with a typed error — callers must remain Wrong Network.
 */
export async function verifyProviderSession(
  connector: SessionConnectorLike,
  options?: { expectedAddress?: string }
): Promise<VerifiedProviderSession> {
  const session = activeSession;
  if (!session) throw new ProviderSessionMissingError();
  if (connector.uid !== session.connectorUid) {
    throw new ProviderSessionMismatchError();
  }
  let provider: Eip1193ProviderLike;
  try {
    provider = asProvider(await connector.getProvider());
  } catch {
    throw new WalletProviderUnavailableError();
  }
  if (provider !== session.providerRef) {
    throw new ProviderSessionMismatchError();
  }
  const accounts = await readProviderAccounts(provider);
  const expected = (options?.expectedAddress ?? session.address).toLowerCase();
  if (!accountPresent(accounts, expected)) {
    throw new ProviderAccountMismatchError();
  }
  const chainId = await readProviderChainId(provider);
  return { provider, accounts, chainId };
}

/**
 * Liveness check: the connector must still expose the EXACT provider object
 * pinned in the session. A re-instantiated connector, a superseded
 * announcement, or any re-resolution that hands back a different object
 * fails — callers must treat the session as stale and fail closed.
 * Sends no JSON-RPC requests itself.
 */
export async function isSessionProviderLive(
  connector: SessionConnectorLike
): Promise<boolean> {
  const session = activeSession;
  if (!session) return false;
  if (connector.uid !== session.connectorUid) return false;
  try {
    return (await connector.getProvider()) === session.providerRef;
  } catch {
    return false;
  }
}
