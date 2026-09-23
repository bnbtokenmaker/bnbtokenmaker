import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyDbError,
  formatSanitizedDbDiagnostic,
  logAdminLoginDbError,
  sanitizeDbErrorForLog,
} from "../db-error-diagnostics";

const SECRET_PASSWORD = "s3cr3t-pw-9f8e7d6c5b4a";
const SECRET_HOST = "ep-secret-host-12345.eu-central-1.aws.neon.tech";
const SECRET_URL = `postgresql://admin:${SECRET_PASSWORD}@${SECRET_HOST}:5432/app?sslmode=require`;
const QUICKNODE_URL = "https://secret-quicksample.quiknode.pro/abcdef1234567890/";
const SESSION_TOKEN =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function hostileError(extra: Record<string, unknown> = {}): Error {
  const error = new Error(
    `connect failed to ${SECRET_HOST} as admin with ${SECRET_PASSWORD} url ${SECRET_URL} quicknode ${QUICKNODE_URL} cookie btm_admin=${SESSION_TOKEN}`
  ) as Error & Record<string, unknown>;
  Object.assign(error, extra);
  return error;
}

function withEnv(name: string, value: string | undefined, fn: () => void): void {
  const previous = process.env[name];
  try {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
    fn();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

describe("server — secret-safe admin-login DB diagnostics (TEMPORARY)", () => {
  it("classifies standard Node/Postgres codes without reading messages", () => {
    withEnv("DATABASE_URL", "placeholder-configured", () => {
      const cases: Array<[Record<string, unknown>, string]> = [
        [{ code: "ENOTFOUND" }, "dns"],
        [{ code: "EAI_AGAIN" }, "dns"],
        [{ code: "ETIMEDOUT" }, "tcp-timeout"],
        [{ code: "ESOCKETTIMEDOUT" }, "tcp-timeout"],
        [{ code: "ECONNREFUSED" }, "connection-refused"],
        [{ code: "CERT_HAS_EXPIRED" }, "tls-certificate"],
        [
          { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" },
          "tls-certificate",
        ],
        [{ code: "28P01" }, "postgres-auth"],
        [{ code: "3D000" }, "postgres-database"],
        [{ code: "42P01" }, "postgres-query"],
        [{ code: "23505" }, "postgres-query"],
        [{ code: "SOME_UNKNOWN_CODE" }, "unknown"],
        [{}, "unknown"],
      ];
      for (const [fields, expected] of cases) {
        assert.equal(classifyDbError(hostileError(fields)), expected);
      }
    });
  });

  it("reports env-missing when DATABASE_URL is absent", () => {
    withEnv("DATABASE_URL", undefined, () => {
      const diagnostic = sanitizeDbErrorForLog(hostileError({ code: "ENOTFOUND" }));
      assert.equal(diagnostic.category, "env-missing");
      assert.equal(diagnostic.databaseConfigured, false);
    });
  });

  it("unwraps AuthError-style cause chains to the root DB error", () => {
    withEnv("DATABASE_URL", "placeholder-configured", () => {
      const root = hostileError({ code: "CERT_HAS_EXPIRED", name: "Error" });
      const outer = new Error("unavailable") as Error & { cause?: unknown };
      outer.name = "AuthError";
      outer.cause = root;
      const diagnostic = sanitizeDbErrorForLog(outer);
      assert.equal(diagnostic.category, "tls-certificate");
      assert.equal(diagnostic.errorCode, "CERT_HAS_EXPIRED");
      assert.equal(diagnostic.tlsReason, "certificate-expired");
    });
  });

  it("never emits secret-looking strings from hostile messages", () => {
    withEnv("DATABASE_URL", "placeholder-configured", () => {
      const originalError = console.error;
      const lines: string[] = [];
      console.error = (...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      };
      try {
        const diagnostic = logAdminLoginDbError(
          hostileError({
            code: "ENOTFOUND",
            syscall: "getaddrinfo",
            stack: `Error: boom at ${SECRET_HOST} ${SECRET_URL}`,
          })
        );
        assert.equal(diagnostic.category, "dns");
        const line = formatSanitizedDbDiagnostic(diagnostic);
        lines.push(line);
      } finally {
        console.error = originalError;
      }
      const combined = lines.join("\n");
      for (const secret of [
        SECRET_PASSWORD,
        SECRET_HOST,
        SECRET_URL,
        QUICKNODE_URL,
        SESSION_TOKEN,
        "btm_admin",
      ]) {
        assert.ok(
          !combined.includes(secret),
          `SAFE log must not contain secret fragment: ${secret.slice(0, 12)}…`
        );
      }
      // Safe allowlisted fields ARE present.
      assert.ok(combined.includes('"context":"admin-login"'));
      assert.ok(combined.includes('"category":"dns"'));
      assert.ok(combined.includes('"errorCode":"ENOTFOUND"'));
      assert.ok(combined.includes('"syscall":"getaddrinfo"'));
      assert.ok(combined.includes('"databaseConfigured":true'));
    });
  });

  it("rejects message-shaped codes and syscalls (allowlist only)", () => {
    withEnv("DATABASE_URL", "placeholder-configured", () => {
      const diagnostic = sanitizeDbErrorForLog(
        hostileError({
          code: `ENOTFOUND ${SECRET_HOST}`,
          syscall: `connect ${SECRET_HOST}`,
        })
      );
      assert.equal(diagnostic.errorCode, undefined);
      assert.equal(diagnostic.syscall, undefined);
      assert.equal(diagnostic.category, "unknown");
      const line = formatSanitizedDbDiagnostic(diagnostic);
      assert.ok(!line.includes(SECRET_HOST));
    });
  });
});
