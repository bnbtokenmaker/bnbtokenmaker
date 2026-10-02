/**
 * BscScan verification state store (SERVER-ONLY).
 *
 * One row per (chain_id, contract_address): duplicate verification
 * requests reuse the row instead of submitting upstream again. Stores
 * GUID + status + sanitized error codes ONLY — never API keys, source
 * code, constructor arguments, or client-supplied material.
 *
 * Follows the lib/deployments/store.ts seam: the route depends on the
 * VerificationStore interface, production uses Postgres (Neon HTTP),
 * tests inject the in-memory implementation.
 */

import { and, eq } from "drizzle-orm";

import { getDb } from "../db/client";
import {
  contractVerifications,
  type ContractVerificationRow,
  type VerificationStatus,
} from "../db/schema";

export type { ContractVerificationRow, VerificationStatus };

export type VerificationPatch = {
  deploymentTxHash?: string | null;
  guid?: string | null;
  status?: VerificationStatus;
  attempts?: number;
  lastErrorCode?: string | null;
  verifiedAt?: Date | null;
};

export interface VerificationStore {
  findByContract(
    chainId: number,
    contractAddress: string
  ): Promise<ContractVerificationRow | null>;
  getOrCreate(
    chainId: number,
    contractAddress: string,
    deploymentTxHash: string | null
  ): Promise<{ row: ContractVerificationRow; inserted: boolean }>;
  updateState(
    chainId: number,
    contractAddress: string,
    patch: VerificationPatch
  ): Promise<ContractVerificationRow | null>;
}

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

// ---------------------------------------------------------------------------
// Production store (Postgres via the Neon HTTP runtime).
// ---------------------------------------------------------------------------

export class PgVerificationStore implements VerificationStore {
  async findByContract(
    chainId: number,
    contractAddress: string
  ): Promise<ContractVerificationRow | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(contractVerifications)
      .where(
        and(
          eq(contractVerifications.chainId, chainId),
          eq(contractVerifications.contractAddress, normalizeAddress(contractAddress))
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getOrCreate(
    chainId: number,
    contractAddress: string,
    deploymentTxHash: string | null
  ): Promise<{ row: ContractVerificationRow; inserted: boolean }> {
    const db = getDb();
    const existing = await this.findByContract(chainId, contractAddress);
    if (existing) return { row: existing, inserted: false };
    try {
      const rows = await db
        .insert(contractVerifications)
        .values({
          chainId,
          contractAddress: normalizeAddress(contractAddress),
          deploymentTxHash,
          status: "not_started",
          attempts: 0,
        })
        .onConflictDoNothing({
          target: [contractVerifications.chainId, contractVerifications.contractAddress],
        })
        .returning();
      if (rows[0]) return { row: rows[0], inserted: true };
      // Lost a race with a concurrent insert: re-read the winner.
      const winner = await this.findByContract(chainId, contractAddress);
      if (!winner) throw new Error("verification insert raced without a winner");
      return { row: winner, inserted: false };
    } catch (error) {
      throw error;
    }
  }

  async updateState(
    chainId: number,
    contractAddress: string,
    patch: VerificationPatch
  ): Promise<ContractVerificationRow | null> {
    const db = getDb();
    const rows = await db
      .update(contractVerifications)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(contractVerifications.chainId, chainId),
          eq(contractVerifications.contractAddress, normalizeAddress(contractAddress))
        )
      )
      .returning();
    return rows[0] ?? null;
  }
}

// ---------------------------------------------------------------------------
// In-memory store (tests and local development without DATABASE_URL).
// ---------------------------------------------------------------------------

export class InMemoryVerificationStore implements VerificationStore {
  private readonly rows = new Map<string, ContractVerificationRow>();
  private nextId = 1;

  private key(chainId: number, contractAddress: string): string {
    return `${chainId}:${contractAddress.toLowerCase()}`;
  }

  private blank(
    chainId: number,
    contractAddress: string,
    deploymentTxHash: string | null
  ): ContractVerificationRow {
    const now = new Date();
    return {
      id: this.nextId++,
      chainId,
      contractAddress: contractAddress.toLowerCase(),
      deploymentTxHash,
      guid: null,
      status: "not_started",
      attempts: 0,
      lastErrorCode: null,
      verifiedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findByContract(
    chainId: number,
    contractAddress: string
  ): Promise<ContractVerificationRow | null> {
    return this.rows.get(this.key(chainId, contractAddress)) ?? null;
  }

  async getOrCreate(
    chainId: number,
    contractAddress: string,
    deploymentTxHash: string | null
  ): Promise<{ row: ContractVerificationRow; inserted: boolean }> {
    const key = this.key(chainId, contractAddress);
    const existing = this.rows.get(key);
    if (existing) return { row: existing, inserted: false };
    const row = this.blank(chainId, contractAddress, deploymentTxHash);
    this.rows.set(key, row);
    return { row, inserted: true };
  }

  async updateState(
    chainId: number,
    contractAddress: string,
    patch: VerificationPatch
  ): Promise<ContractVerificationRow | null> {
    const key = this.key(chainId, contractAddress);
    const existing = this.rows.get(key);
    if (!existing) return null;
    const updated: ContractVerificationRow = {
      ...existing,
      deploymentTxHash:
        patch.deploymentTxHash !== undefined ? patch.deploymentTxHash : existing.deploymentTxHash,
      guid: patch.guid !== undefined ? patch.guid : existing.guid,
      status: patch.status ?? existing.status,
      attempts: patch.attempts ?? existing.attempts,
      lastErrorCode: patch.lastErrorCode !== undefined ? patch.lastErrorCode : existing.lastErrorCode,
      verifiedAt: patch.verifiedAt !== undefined ? patch.verifiedAt : existing.verifiedAt,
      updatedAt: new Date(),
    };
    this.rows.set(key, updated);
    return updated;
  }
}
