/**
 * Phase 7A admin store selector (server-only).
 *
 * Production ALWAYS uses Postgres. A shared in-memory backend is available
 * ONLY outside production when ADMIN_AUTH_STORE=memory, so route handlers
 * stay behaviorally testable without a live database.
 */


import type { AdminStores } from "./service";
import {
  InMemoryAdminSessionStore,
  InMemoryAdminUserStore,
  PgAdminSessionStore,
  PgAdminUserStore,
} from "./store";

let memoryUsers: InMemoryAdminUserStore | null = null;
let memorySessions: InMemoryAdminSessionStore | null = null;

export function getAdminStores(): AdminStores {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ADMIN_AUTH_STORE === "memory"
  ) {
    if (!memoryUsers || !memorySessions) {
      memoryUsers = new InMemoryAdminUserStore();
      memorySessions = new InMemoryAdminSessionStore();
    }
    return { users: memoryUsers, sessions: memorySessions };
  }
  return { users: new PgAdminUserStore(), sessions: new PgAdminSessionStore() };
}

/** Test escape hatch: drop shared in-memory state between isolated runs. */
export function resetAdminStoresForTests(): void {
  memoryUsers = null;
  memorySessions = null;
}
