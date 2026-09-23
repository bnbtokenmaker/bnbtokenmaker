/**
 * Phase 7A admin password hashing (server-only).
 *
 * KDF: scrypt from Node's built-in `node:crypto` — a modern memory-hard
 * password KDF with ZERO new dependencies and zero native binaries
 * (bcrypt/argon2 native bindings were deliberately avoided for the
 * old-glibc cPanel runtime; bcryptjs was avoided as slower and weaker).
 *
 * Stored format (modular, self-describing for future upgrades):
 *   scrypt$<N>$<r>$<p>$<salthex>$<keyhex>
 * Verification is timing-safe (crypto.timingSafeEqual over fixed lengths).
 * Plaintext passwords are never logged, returned, or persisted.
 */


import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// OWASP-aligned interactive-login cost (~logN=14). Pure-JS friendly on the
// small cPanel runtime while remaining memory-hard for offline attacks.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

export const ADMIN_PASSWORD_MIN_LENGTH = 12;
export const ADMIN_PASSWORD_MAX_LENGTH = 256;

export class PasswordHashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordHashError";
  }
}

/** Dummy hash verified against when the identifier is unknown (timing shield). */
const DUMMY_SALT = "00".repeat(SALT_LEN);
const DUMMY_HASH = `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${DUMMY_SALT}$${"00".repeat(KEY_LEN)}`;

export function dummyPasswordHash(): string {
  return DUMMY_HASH;
}

function parseHash(stored: string): {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  key: Buffer;
} | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return null;
  }
  if (N <= 1 || r <= 0 || p <= 0) return null;
  if (!/^[0-9a-f]+$/.test(parts[4]) || !/^[0-9a-f]+$/.test(parts[5])) {
    return null;
  }
  try {
    const salt = Buffer.from(parts[4], "hex");
    const key = Buffer.from(parts[5], "hex");
    if (salt.length === 0 || key.length === 0) return null;
    return { N, r, p, salt, key };
  } catch {
    return null;
  }
}

/** Hash a new password (enforces creation-time strength floor). */
export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string") {
    throw new PasswordHashError("password must be a string");
  }
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    throw new PasswordHashError(
      `password must be at least ${ADMIN_PASSWORD_MIN_LENGTH} characters`
    );
  }
  if (password.length > ADMIN_PASSWORD_MAX_LENGTH) {
    throw new PasswordHashError("password is too long");
  }
  // Synchronous KDF: admin logins are rare operator actions, so blocking
  // ~50ms is irrelevant, and sync keeps typing/dependency surface minimal.
  const salt = randomBytes(SALT_LEN);
  const key = scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${key.toString("hex")}`;
}

/**
 * Verify a candidate against a stored hash. Returns false (never throws)
 * for malformed hashes or mismatches. Comparison is timing-safe.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (typeof password !== "string" || typeof storedHash !== "string") {
    return false;
  }
  const parsed = parseHash(storedHash);
  if (!parsed) return false;
  let derived: Buffer;
  try {
    derived = scryptSync(password, parsed.salt, parsed.key.length, {
      N: parsed.N,
      r: parsed.r,
      p: parsed.p,
      maxmem: 64 * 1024 * 1024,
    });
  } catch {
    return false;
  }
  if (derived.length !== parsed.key.length) return false;
  return timingSafeEqual(derived, parsed.key);
}
