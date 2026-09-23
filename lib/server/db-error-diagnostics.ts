/**
 * TEMPORARY Phase 7A production diagnostic (secret-safe).
 *
 * Context: production `POST /api/admin/login` returns sanitized 503
 * "unavailable" while the same Neon DATABASE_URL works locally. The
 * cPanel/Passenger runtime gives us no shell, so the ONLY signal is a
 * server-side log line. This helper builds that line from an allowlist of
 * SAFE fields — it never reads error.message, stack traces, connection
 * strings, hostnames, credentials, cookies, tokens, or request bodies.
 *
 * Removal: once the production failure is classified (dns / tcp-timeout /
 * tls-certificate / postgres-auth / ...), remove the `logAdminLoginDbError`
 * call in `app/api/admin/login/route.ts` and delete this module + its test.
 *
 * Pure functions (no `server-only` import) so the sanitizer stays unit-
 * testable in the tsx runtime — same precedent as lib/server/rate-limit.ts.
 */

export type DbErrorCategory =
  | "env-missing"
  | "dns"
  | "tcp-timeout"
  | "connection-refused"
  | "tls-certificate"
  | "postgres-auth"
  | "postgres-database"
  | "postgres-query"
  | "unknown";

export type SanitizedDbDiagnostic = {
  context: "admin-login";
  errorName: string;
  errorCode?: string;
  syscall?: string;
  /** Fixed allowlisted TLS reason (never free text). */
  tlsReason?: string;
  /** Boolean ONLY — never the connection string or any part of it. */
  databaseConfigured: boolean;
  nodeEnv: string;
  category: DbErrorCategory;
};

/** Node `errnoException` codes that are safe to log verbatim. */
const SAFE_CODE_PATTERN = /^[A-Z0-9_]{2,40}$/;

/** Node `syscall` values are short lowercase tokens (`getaddrinfo`). */
const SAFE_SYSCALL_PATTERN = /^[a-z_]{1,32}$/;

/** Error `name` values are short class names; anything else is normalized. */
const SAFE_NAME_PATTERN = /^[A-Za-z0-9_$-]{1,64}$/;

const DNS_CODES = new Set(["ENOTFOUND", "EAI_AGAIN", "ENODATA"]);
const TIMEOUT_CODES = new Set(["ETIMEDOUT", "ESOCKETTIMEDOUT"]);
const REFUSED_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
]);
const TLS_CODES = new Set([
  "CERT_HAS_EXPIRED",
  "CERT_NOT_YET_VALID",
  "CERT_UNTRUSTED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "ERR_TLS_CERT_ALTNAME_FORMAT",
  "CERTIFICATE_VERIFY_FAILED",
]);

/** Fixed, operator-readable TLS reasons — keyed by safe code, never free text. */
const TLS_REASON_BY_CODE: Record<string, string> = {
  CERT_HAS_EXPIRED: "certificate-expired",
  CERT_NOT_YET_VALID: "certificate-not-yet-valid",
  CERT_UNTRUSTED: "certificate-untrusted",
  DEPTH_ZERO_SELF_SIGNED_CERT: "self-signed-certificate",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "unable-to-verify-leaf",
  ERR_TLS_CERT_ALTNAME_INVALID: "cert-altname-invalid",
  ERR_TLS_CERT_ALTNAME_FORMAT: "cert-altname-format",
  CERTIFICATE_VERIFY_FAILED: "certificate-verify-failed",
};

function safeErrorName(value: unknown): string {
  if (typeof value === "string" && SAFE_NAME_PATTERN.test(value)) return value;
  return "Error";
}

function safeErrorCode(value: unknown): string | undefined {
  if (typeof value === "string" && SAFE_CODE_PATTERN.test(value)) return value;
  return undefined;
}

function safeSyscall(value: unknown): string | undefined {
  if (typeof value === "string" && SAFE_SYSCALL_PATTERN.test(value)) {
    return value;
  }
  return undefined;
}

function readField(error: object, field: string): unknown {
  try {
    return (error as Record<string, unknown>)[field];
  } catch {
    return undefined;
  }
}

/** Walk `cause` chains (AuthError now carries the DB error as `cause`). */
function rootCause(error: unknown): object | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth++) {
    if (!current || typeof current !== "object") return null;
    const next = readField(current as object, "cause");
    if (!next || typeof next !== "object") return current as object;
    current = next;
  }
  return typeof current === "object" && current !== null
    ? (current as object)
    : null;
}

function isDatabaseConfigured(): boolean {
  return (process.env.DATABASE_URL ?? "").trim().length > 0;
}

function safeNodeEnv(): string {
  const raw = process.env.NODE_ENV ?? "unknown";
  return raw.slice(0, 32);
}

/**
 * Classify from SAFE fields only (name/code/syscall). `error.message` and
 * `stack` are NEVER read — pg/Node messages embed hostname, port, user,
 * and database name.
 */
export function classifyDbError(error: unknown): DbErrorCategory {
  if (!isDatabaseConfigured()) return "env-missing";
  const root = rootCause(error);
  if (!root) return "unknown";
  const code = safeErrorCode(readField(root, "code"));
  const name = safeErrorName(readField(root, "name"));
  void name;
  if (!code) {
    // Our own pool guard without a code can only mean "not configured",
    // which was already handled above — anything else is unknown.
    return "unknown";
  }
  if (DNS_CODES.has(code)) return "dns";
  if (TIMEOUT_CODES.has(code)) return "tcp-timeout";
  if (REFUSED_CODES.has(code)) return "connection-refused";
  if (TLS_CODES.has(code)) return "tls-certificate";
  // Postgres server error codes (5-char SQLSTATE): 28xxx = auth,
  // 3D000 = unknown database, 42xxx/23xxx/22xxx = query-level.
  if (/^28/.test(code)) return "postgres-auth";
  if (code === "3D000" || code === "3F000") return "postgres-database";
  if (/^(42|23|22)/.test(code)) return "postgres-query";
  return "unknown";
}

/** Build the sanitized diagnostic object (allowlisted fields only). */
export function sanitizeDbErrorForLog(
  error: unknown,
  context: "admin-login" = "admin-login"
): SanitizedDbDiagnostic {
  const root = rootCause(error);
  const errorName = root
    ? safeErrorName(readField(root, "name"))
    : "Error";
  const errorCode = root
    ? safeErrorCode(readField(root, "code"))
    : undefined;
  const syscall = root ? safeSyscall(readField(root, "syscall")) : undefined;
  const category = classifyDbError(error);
  const diagnostic: SanitizedDbDiagnostic = {
    context,
    errorName,
    databaseConfigured: isDatabaseConfigured(),
    nodeEnv: safeNodeEnv(),
    category,
  };
  if (errorCode) diagnostic.errorCode = errorCode;
  if (syscall) diagnostic.syscall = syscall;
  if (category === "tls-certificate" && errorCode) {
    diagnostic.tlsReason =
      TLS_REASON_BY_CODE[errorCode] ?? "certificate-error";
  }
  return diagnostic;
}

/** Single-line cPanel/Passenger-visible log payload (JSON, safe fields only). */
export function formatSanitizedDbDiagnostic(
  diagnostic: SanitizedDbDiagnostic
): string {
  return `[admin-login-db] ${JSON.stringify(diagnostic)}`;
}

/**
 * Sanitize + emit the diagnostic. Never throws: logging must never change
 * the public 503 response.
 */
export function logAdminLoginDbError(error: unknown): SanitizedDbDiagnostic {
  const diagnostic = sanitizeDbErrorForLog(error);
  try {
    console.error(formatSanitizedDbDiagnostic(diagnostic));
  } catch {
    // Logging is best-effort; the request path already has its response.
  }
  return diagnostic;
}
