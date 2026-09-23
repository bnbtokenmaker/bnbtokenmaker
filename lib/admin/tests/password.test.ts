import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dummyPasswordHash,
  hashPassword,
  PasswordHashError,
  verifyPassword,
} from "../password";

describe("admin — password hashing (scrypt, no native deps)", () => {
  it("hashes and verifies the correct password", async () => {
    const hash = await hashPassword("correct-horse-12");
    assert.match(hash, /^scrypt\$16384\$8\$1\$[0-9a-f]+\$[0-9a-f]+$/);
    assert.equal(await verifyPassword("correct-horse-12", hash), true);
  });

  it("rejects wrong passwords with a plain false (generic at the service layer)", async () => {
    const hash = await hashPassword("correct-horse-12");
    assert.equal(await verifyPassword("wrong-password-99", hash), false);
    assert.equal(await verifyPassword("", hash), false);
  });

  it("stored value is a hash — never the password", async () => {
    const password = "super-secret-admin-1";
    const hash = await hashPassword(password);
    assert.ok(!hash.includes(password));
    // Salts are random: same password → different stored hash.
    const again = await hashPassword(password);
    assert.notEqual(hash, again);
    assert.equal(await verifyPassword(password, again), true);
  });

  it("malformed hashes verify false, never throw", async () => {
    assert.equal(await verifyPassword("x", "not-a-hash"), false);
    assert.equal(await verifyPassword("x", ""), false);
    assert.equal(await verifyPassword("x", dummyPasswordHash()), false);
  });

  it("enforces a creation-time strength floor", async () => {
    await assert.rejects(hashPassword("short-11"), PasswordHashError);
    await assert.rejects(hashPassword(123 as unknown as string), PasswordHashError);
  });
});
