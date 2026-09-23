/**
 * Phase 7A admin auth service (server-only orchestration).
 *
 * - login: identifier + password → fresh opaque session token. Failure is a
 *   single generic "invalid-credentials" (no user enumeration); unknown
 *   identifiers still cost one scrypt verification (timing shield).
 *   A successful login ROTATES sessions: older active sessions for the user
 *   are revoked before the new one is issued.
 * - authenticate: cookie token → active admin user (expiry + revocation +
 *   active-flag enforced server-side on EVERY call).
 * - logout: revokes the presented session; unknown tokens still succeed
 *   silently (no existence oracle).
 * - createAdminUser: CLI-bootstrap ONLY, gated on a setup token from env.
 *   No HTTP route may call it — there is intentionally no public endpoint.
 */


import type { AdminUserRow } from "../db/schema";
import {
  dummyPasswordHash,
  hashPassword,
  verifyPassword,
} from "./password";
import {
  generateSessionToken,
  hashSessionToken,
  isSessionTokenShape,
  sessionTtlMs,
  tokenHashEquals,
} from "./session";
import type { AdminSessionStore, AdminUserStore } from "./store";

export type AuthErrorCode =
  | "invalid-request"
  | "invalid-credentials"
  | "unauthenticated"
  | "unavailable"
  | "rate-limited"
  | "forbidden-origin";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly httpStatus: number;
  constructor(code: AuthErrorCode, httpStatus: number) {
    super(code);
    this.name = "AuthError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** Generic login failure message — identical for unknown user / wrong password. */
export const GENERIC_LOGIN_FAILURE = "Invalid credentials.";

export type AdminStores = {
  users: AdminUserStore;
  sessions: AdminSessionStore;
};

function normalizeIdentifier(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 320) return null;
  return trimmed;
}

export function parseLoginInput(body: unknown): {
  identifier: string;
  password: string;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AuthError("invalid-request", 400);
  }
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  for (const key of keys) {
    if (key !== "identifier" && key !== "password") {
      throw new AuthError("invalid-request", 400);
    }
  }
  const identifier = normalizeIdentifier(record.identifier);
  const password =
    typeof record.password === "string" ? record.password : null;
  // An empty password is a *wrong* credential (generic 401), not malformed
  // input: the shape is valid, the secret is simply incorrect.
  if (!identifier || password === null || password.length > 256) {
    throw new AuthError("invalid-request", 400);
  }
  return { identifier, password };
}

export type LoginResult = {
  token: string;
  expiresAt: Date;
  identifier: string;
};

export async function loginAdmin(
  body: unknown,
  stores: AdminStores,
  now: Date = new Date()
): Promise<LoginResult> {
  const { identifier, password } = parseLoginInput(body);
  let user: AdminUserRow | null;
  try {
    user = await stores.users.findByIdentifier(identifier);
  } catch {
    throw new AuthError("unavailable", 503);
  }
  // Timing shield: unknown identifiers still cost one scrypt verification
  // so absent-vs-present users are not trivially distinguishable.
  const candidateHash = user ? user.passwordHash : dummyPasswordHash();
  let ok = false;
  try {
    ok = await verifyPassword(password, candidateHash);
  } catch {
    ok = false;
  }
  if (!user || !user.isActive || !ok) {
    throw new AuthError("invalid-credentials", 401);
  }
  const ttlMs = sessionTtlMs();
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(now.getTime() + ttlMs);
  try {
    // Rotation: a fresh login invalidates older sessions for this user.
    await stores.sessions.revokeActiveForUser(user.id, now);
    await stores.sessions.create({
      adminUserId: user.id,
      tokenHash,
      expiresAt,
    });
    await stores.users.updateLoginSuccess(user.id, now);
  } catch {
    throw new AuthError("unavailable", 503);
  }
  return { token, expiresAt, identifier: user.identifier };
}

export type AuthenticatedAdmin = {
  id: number;
  identifier: string;
};

export async function authenticateAdmin(
  token: string | null | undefined,
  stores: AdminStores,
  now: Date = new Date()
): Promise<AuthenticatedAdmin> {
  if (!isSessionTokenShape(token)) {
    throw new AuthError("unauthenticated", 401);
  }
  const presentedHash = hashSessionToken(token);
  let session;
  try {
    session = await stores.sessions.findActiveByTokenHash(presentedHash);
  } catch {
    throw new AuthError("unavailable", 503);
  }
  if (!session) throw new AuthError("unauthenticated", 401);
  if (!tokenHashEquals(session.tokenHash, presentedHash)) {
    throw new AuthError("unauthenticated", 401);
  }
  if (session.expiresAt.getTime() <= now.getTime()) {
    throw new AuthError("unauthenticated", 401);
  }
  // The owning user is re-resolved on EVERY call so deactivation takes
  // effect immediately (no stale "still logged in" after disable).
  let user: AdminUserRow | null;
  try {
    user = await stores.users.findUserById(session.adminUserId);
  } catch {
    throw new AuthError("unavailable", 503);
  }
  if (!user || !user.isActive) {
    throw new AuthError("unauthenticated", 401);
  }
  try {
    await stores.sessions.touch(session.id, now);
  } catch {
    // last-used bookkeeping must never fail authentication.
  }
  return { id: user.id, identifier: user.identifier };
}

export async function logoutAdmin(
  token: string | null | undefined,
  stores: AdminStores,
  now: Date = new Date()
): Promise<void> {
  // Unknown/malformed tokens still "succeed": logout must not become a
  // session-existence oracle.
  if (!isSessionTokenShape(token)) return;
  try {
    await stores.sessions.revokeByTokenHash(hashSessionToken(token), now);
  } catch {
    // Revocation best-effort; the client clears its cookie regardless.
  }
}

// ---------------------------------------------------------------------------
// CLI bootstrap (scripts/create-admin.ts ONLY).
// ---------------------------------------------------------------------------

/**
 * Create the initial admin user. Gated on a setup token that must match
 * ADMIN_SETUP_TOKEN from the server environment; callable ONLY from the
 * CLI script (no HTTP route imports this function).
 */
export async function createAdminUser(
  input: { identifier: string; password: string; setupToken: string },
  stores: AdminStores
): Promise<AdminUserRow> {
  const expected = (process.env.ADMIN_SETUP_TOKEN ?? "").trim();
  if (!expected || input.setupToken !== expected) {
    throw new AuthError("invalid-credentials", 401);
  }
  const identifier = normalizeIdentifier(input.identifier);
  if (!identifier) {
    throw new AuthError("invalid-request", 400);
  }
  let passwordHash: string;
  try {
    passwordHash = await hashPassword(input.password);
  } catch {
    throw new AuthError("invalid-request", 400);
  }
  try {
    const existing = await stores.users.findByIdentifier(identifier);
    if (existing) throw new AuthError("invalid-request", 409);
    return await stores.users.insertUser({ identifier, passwordHash });
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("unavailable", 503);
  }
}
