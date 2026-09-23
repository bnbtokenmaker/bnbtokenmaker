import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  PgAdminSessionStore,
  PgAdminUserStore,
} from "../../admin/store";
import { PgDeploymentStore } from "../../deployments/store";
import {
  DatabaseUnavailableError,
  getDb,
  resetDbForTests,
} from "../client";

const DUMMY_URL = "postgresql://user:pass@localhost:5432/app";

function withDatabaseUrl(value: string | undefined, fn: () => void): void {
  const previous = process.env.DATABASE_URL;
  try {
    if (value === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = value;
    resetDbForTests();
    fn();
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
    resetDbForTests();
  }
}

function methodType(target: unknown, method: string): string {
  return typeof (target as Record<string, unknown>)[method];
}

describe("db — Neon HTTP runtime transport (no raw TCP/5432)", () => {
  it("fails closed when DATABASE_URL is missing", () => {
    withDatabaseUrl(undefined, () => {
      assert.throws(() => getDb(), DatabaseUnavailableError);
    });
  });

  it("initializes a lazy Neon HTTP handle without network I/O", () => {
    withDatabaseUrl(DUMMY_URL, () => {
      // neon() captures the string; no query runs here, so no network.
      const first = getDb();
      for (const method of ["select", "insert", "update", "execute"]) {
        assert.equal(
          methodType(first, method),
          "function",
          `expected drizzle handle to expose ${method}`
        );
      }
      // Lazy singleton: second call reuses the handle.
      assert.equal(getDb(), first);
      resetDbForTests();
      assert.notEqual(getDb(), first);
    });
  });

  it("exposes no pg Pool surface on the runtime client", async () => {
    const client = await import("../client");
    assert.equal(
      "getPool" in client,
      false,
      "runtime client must not export getPool (raw TCP entry point)"
    );
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "client.ts"),
      "utf8"
    );
    assert.ok(
      source.includes("drizzle-orm/neon-http"),
      "runtime client must use drizzle-orm/neon-http"
    );
    assert.ok(
      source.includes("@neondatabase/serverless"),
      "runtime client must use @neondatabase/serverless"
    );
    assert.ok(
      !source.includes('from "pg"') && !source.includes("from 'pg'"),
      "runtime client must not import pg"
    );
    assert.ok(
      !source.includes("new Pool("),
      "runtime client must never instantiate a TCP pool"
    );
  });

  it("production store classes stay lazily wired to getDb (zero semantic change)", () => {
    withDatabaseUrl(DUMMY_URL, () => {
      // Construction must not touch the network; queries resolve getDb lazily.
      const users = new PgAdminUserStore();
      const sessions = new PgAdminSessionStore();
      const deployments = new PgDeploymentStore();
      for (const method of ["findByIdentifier", "findUserById"]) {
        assert.equal(methodType(users, method), "function");
      }
      for (const method of ["create", "findActiveByTokenHash"]) {
        assert.equal(methodType(sessions, method), "function");
      }
      for (const method of ["findByTx", "upsertDeployment"]) {
        assert.equal(methodType(deployments, method), "function");
      }
    });
  });
});
