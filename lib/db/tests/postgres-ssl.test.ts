import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizePostgresConnectionString,
  postgresSslPoolConfig,
} from "../postgres-ssl";

describe("db — postgres TLS (verify-full future-safe)", () => {
  it("normalizes legacy sslmode aliases to verify-full", () => {
    for (const mode of ["prefer", "require", "verify-ca"]) {
      const out = normalizePostgresConnectionString(
        `postgresql://user:pass@db.example.com:5432/app?sslmode=${mode}`
      );
      assert.ok(
        out.includes("sslmode=verify-full"),
        `expected verify-full for ${mode}: ${out}`
      );
    }
  });

  it("adds verify-full when a remote URL has no sslmode", () => {
    const out = normalizePostgresConnectionString(
      "postgresql://user:pass@db.example.com:5432/app"
    );
    assert.ok(out.includes("sslmode=verify-full"));
  });

  it("leaves loopback hosts untouched (local plain-TCP ergonomics)", () => {
    for (const url of [
      "postgresql://user:pass@localhost:5432/app",
      "postgresql://user:pass@127.0.0.1:5432/app",
    ]) {
      assert.equal(normalizePostgresConnectionString(url), url);
      assert.deepEqual(postgresSslPoolConfig(url), {
        connectionString: url,
      });
    }
  });

  it("returns an explicit rejectUnauthorized guard for remote hosts", () => {
    const config = postgresSslPoolConfig(
      "postgresql://user:pass@db.example.com:5432/app?sslmode=require"
    );
    assert.ok(String(config.connectionString).includes("sslmode=verify-full"));
    assert.deepEqual(config.ssl, { rejectUnauthorized: true });
  });
});
