/**
 * Phase 7A admin persistence boundary.
 *
 * AdminUserStore / AdminSessionStore mirror the deployments seam:
 * production Pg* implementations (Drizzle over pg), InMemory* for unit
 * tests. Passwords only ever exist here as scrypt hashes.
 */


import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "../db/client";
import {
  adminSessions,
  adminUsers,
  type AdminSessionRow,
  type AdminUserRow,
} from "../db/schema";

export type AdminUserStore = {
  findByIdentifier: (identifier: string) => Promise<AdminUserRow | null>;
  findUserById: (id: number) => Promise<AdminUserRow | null>;
  updateLoginSuccess: (id: number, at: Date) => Promise<void>;
  /** CLI bootstrap only — no HTTP route may call this (see service.ts). */
  insertUser: (input: {
    identifier: string;
    passwordHash: string;
  }) => Promise<AdminUserRow>;
};

export type AdminSessionRecord = AdminSessionRow;

export type AdminSessionStore = {
  create: (input: {
    adminUserId: number;
    tokenHash: string;
    expiresAt: Date;
  }) => Promise<AdminSessionRow>;
  findActiveByTokenHash: (tokenHash: string) => Promise<AdminSessionRow | null>;
  touch: (id: number, at: Date) => Promise<void>;
  revokeByTokenHash: (tokenHash: string, at: Date) => Promise<void>;
  revokeActiveForUser: (adminUserId: number, at: Date) => Promise<void>;
};

// ---------------------------------------------------------------------------
// Production stores (Postgres via Drizzle).
// ---------------------------------------------------------------------------

export class PgAdminUserStore implements AdminUserStore {
  async findByIdentifier(identifier: string): Promise<AdminUserRow | null> {
    const rows = await getDb()
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.identifier, identifier))
      .limit(1);
    return rows[0] ?? null;
  }

  async findUserById(id: number): Promise<AdminUserRow | null> {
    const rows = await getDb()
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateLoginSuccess(id: number, at: Date): Promise<void> {
    await getDb()
      .update(adminUsers)
      .set({ lastLoginAt: at, updatedAt: at })
      .where(eq(adminUsers.id, id));
  }

  async insertUser(input: {
    identifier: string;
    passwordHash: string;
  }): Promise<AdminUserRow> {
    const rows = await getDb()
      .insert(adminUsers)
      .values({
        identifier: input.identifier,
        passwordHash: input.passwordHash,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("admin user insert returned no row");
    return row;
  }
}

export class PgAdminSessionStore implements AdminSessionStore {
  async create(input: {
    adminUserId: number;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<AdminSessionRow> {
    const rows = await getDb()
      .insert(adminSessions)
      .values({
        adminUserId: input.adminUserId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("admin session insert returned no row");
    return row;
  }

  async findActiveByTokenHash(tokenHash: string): Promise<AdminSessionRow | null> {
    const rows = await getDb()
      .select()
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.tokenHash, tokenHash),
          isNull(adminSessions.revokedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async touch(id: number, at: Date): Promise<void> {
    await getDb()
      .update(adminSessions)
      .set({ lastUsedAt: at })
      .where(eq(adminSessions.id, id));
  }

  async revokeByTokenHash(tokenHash: string, at: Date): Promise<void> {
    await getDb()
      .update(adminSessions)
      .set({ revokedAt: at })
      .where(eq(adminSessions.tokenHash, tokenHash));
  }

  async revokeActiveForUser(adminUserId: number, at: Date): Promise<void> {
    await getDb()
      .update(adminSessions)
      .set({ revokedAt: at })
      .where(
        and(
          eq(adminSessions.adminUserId, adminUserId),
          isNull(adminSessions.revokedAt)
        )
      );
  }
}

// ---------------------------------------------------------------------------
// In-memory stores (unit tests only).
// ---------------------------------------------------------------------------

function cloneUser(row: AdminUserRow): AdminUserRow {
  return { ...row };
}

function cloneSession(row: AdminSessionRow): AdminSessionRow {
  return { ...row };
}

export class InMemoryAdminUserStore implements AdminUserStore {
  private readonly users = new Map<string, AdminUserRow>();
  private nextId = 1;

  async findByIdentifier(identifier: string): Promise<AdminUserRow | null> {
    const row = this.users.get(identifier.toLowerCase());
    return row ? cloneUser(row) : null;
  }

  async findUserById(id: number): Promise<AdminUserRow | null> {
    for (const row of this.users.values()) {
      if (row.id === id) return cloneUser(row);
    }
    return null;
  }

  async updateLoginSuccess(id: number, at: Date): Promise<void> {
    for (const row of this.users.values()) {
      if (row.id === id) {
        row.lastLoginAt = at;
        row.updatedAt = at;
      }
    }
  }

  async insertUser(input: {
    identifier: string;
    passwordHash: string;
  }): Promise<AdminUserRow> {
    const now = new Date();
    const row: AdminUserRow = {
      id: this.nextId++,
      identifier: input.identifier.toLowerCase(),
      passwordHash: input.passwordHash,
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(row.identifier, row);
    return cloneUser(row);
  }

  /** Test helper: deactivate a user. */
  async deactivate(identifier: string): Promise<void> {
    const row = this.users.get(identifier.toLowerCase());
    if (row) row.isActive = false;
  }
}

export class InMemoryAdminSessionStore implements AdminSessionStore {
  private readonly sessions = new Map<string, AdminSessionRow>();
  private nextId = 1;

  async create(input: {
    adminUserId: number;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<AdminSessionRow> {
    const now = new Date();
    const row: AdminSessionRow = {
      id: this.nextId++,
      adminUserId: input.adminUserId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      createdAt: now,
      lastUsedAt: now,
    };
    this.sessions.set(input.tokenHash, row);
    return cloneSession(row);
  }

  async findActiveByTokenHash(
    tokenHash: string
  ): Promise<AdminSessionRow | null> {
    const row = this.sessions.get(tokenHash);
    if (!row || row.revokedAt !== null) return null;
    return cloneSession(row);
  }

  async touch(id: number, at: Date): Promise<void> {
    for (const row of this.sessions.values()) {
      if (row.id === id) row.lastUsedAt = at;
    }
  }

  async revokeByTokenHash(tokenHash: string, at: Date): Promise<void> {
    const row = this.sessions.get(tokenHash);
    if (row && row.revokedAt === null) row.revokedAt = at;
  }

  async revokeActiveForUser(adminUserId: number, at: Date): Promise<void> {
    for (const row of this.sessions.values()) {
      if (row.adminUserId === adminUserId && row.revokedAt === null) {
        row.revokedAt = at;
      }
    }
  }

  /** Test introspection: active (non-revoked) session count for a user. */
  async activeCountForUser(adminUserId: number): Promise<number> {
    let count = 0;
    for (const row of this.sessions.values()) {
      if (row.adminUserId === adminUserId && row.revokedAt === null) count++;
    }
    return count;
  }
}
