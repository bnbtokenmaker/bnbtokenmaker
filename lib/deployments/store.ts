/**
 * Phase 7A deployment persistence boundary.
 *
 * DeploymentStore is the seam between the verified-record service and the
 * backing database. Production uses PgDeploymentStore (Drizzle over pg);
 * unit tests use InMemoryDeploymentStore — no test ever needs a live DB.
 *
 * Idempotency: upsertDeployment is keyed on (chainId, txHash). A duplicate
 * insert returns the existing row with inserted=false; conflicting facts
 * for the same tx (tampered re-record) are rejected, never overwritten.
 */


import { and, eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { deployments, type DeploymentRow } from "../db/schema";
import type { VerifiedDeploymentRecord } from "./verify";

export type UpsertResult = {
  row: DeploymentRow;
  /** True when this call created the row; false when it already existed. */
  inserted: boolean;
};

export type DeploymentConflictErrorCode = "deployment-conflict";

export class DeploymentConflictError extends Error {
  readonly code: DeploymentConflictErrorCode = "deployment-conflict";
  constructor() {
    super("Conflicting deployment facts for an already-recorded transaction");
    this.name = "DeploymentConflictError";
  }
}

export type DeploymentStore = {
  upsertDeployment: (record: VerifiedDeploymentRecord) => Promise<UpsertResult>;
  findByTx: (chainId: number, txHash: string) => Promise<DeploymentRow | null>;
};

function sameFacts(a: VerifiedDeploymentRecord, row: DeploymentRow): boolean {
  const featureConfig = row.featureConfig as Record<string, unknown>;
  const quoteSnapshot = row.quoteSnapshot as Record<string, unknown>;
  return (
    row.contractAddress === a.contractAddress &&
    row.factoryAddress === a.factoryAddress &&
    row.deployerAddress === a.deployerAddress &&
    row.tokenName === a.tokenName &&
    row.tokenSymbol === a.tokenSymbol &&
    row.decimals === a.decimals &&
    row.initialSupplyBase === a.initialSupplyBase &&
    JSON.stringify(featureConfig) === JSON.stringify(a.featureConfig) &&
    row.platformFeeWei === a.platformFeeWei &&
    (row.blockNumber ?? null) === (a.blockNumber ?? null) &&
    (quoteSnapshot as { pricingVersion?: unknown }).pricingVersion ===
      a.quoteSnapshot.pricingVersion
  );
}

function toInsert(record: VerifiedDeploymentRecord) {
  return {
    chainId: record.chainId,
    txHash: record.txHash,
    contractAddress: record.contractAddress,
    factoryAddress: record.factoryAddress,
    deployerAddress: record.deployerAddress,
    tokenName: record.tokenName,
    tokenSymbol: record.tokenSymbol,
    decimals: record.decimals,
    initialSupplyBase: record.initialSupplyBase,
    featureConfig: record.featureConfig,
    quoteSnapshot: record.quoteSnapshot,
    platformFeeWei: record.platformFeeWei,
    status: "confirmed",
    blockNumber: record.blockNumber,
    confirmedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Production store (Postgres via Drizzle).
// ---------------------------------------------------------------------------

export class PgDeploymentStore implements DeploymentStore {
  async findByTx(chainId: number, txHash: string): Promise<DeploymentRow | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(deployments)
      .where(and(eq(deployments.chainId, chainId), eq(deployments.txHash, txHash)))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertDeployment(record: VerifiedDeploymentRecord): Promise<UpsertResult> {
    const db = getDb();
    const existing = await this.findByTx(record.chainId, record.txHash);
    if (existing) {
      if (!sameFacts(record, existing)) throw new DeploymentConflictError();
      return { row: existing, inserted: false };
    }
    try {
      const rows = await db
        .insert(deployments)
        .values(toInsert(record))
        .onConflictDoNothing({
          target: [deployments.chainId, deployments.txHash],
        })
        .returning();
      if (rows[0]) return { row: rows[0], inserted: true };
      // Lost a race with a concurrent insert: re-read the winner.
      const winner = await this.findByTx(record.chainId, record.txHash);
      if (!winner) throw new Error("deployment insert raced without a winner");
      if (!sameFacts(record, winner)) throw new DeploymentConflictError();
      return { row: winner, inserted: false };
    } catch (error) {
      if (error instanceof DeploymentConflictError) throw error;
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// In-memory store (tests and local development without DATABASE_URL).
// ---------------------------------------------------------------------------

export class InMemoryDeploymentStore implements DeploymentStore {
  private readonly rows = new Map<string, DeploymentRow>();
  private nextId = 1;

  private key(chainId: number, txHash: string): string {
    return `${chainId}:${txHash.toLowerCase()}`;
  }

  async findByTx(chainId: number, txHash: string): Promise<DeploymentRow | null> {
    return this.rows.get(this.key(chainId, txHash)) ?? null;
  }

  async upsertDeployment(record: VerifiedDeploymentRecord): Promise<UpsertResult> {
    const key = this.key(record.chainId, record.txHash);
    const existing = this.rows.get(key);
    if (existing) {
      if (!sameFacts(record, existing)) throw new DeploymentConflictError();
      return { row: existing, inserted: false };
    }
    const now = new Date();
    const row: DeploymentRow = {
      id: this.nextId++,
      chainId: record.chainId,
      txHash: record.txHash,
      contractAddress: record.contractAddress,
      factoryAddress: record.factoryAddress,
      deployerAddress: record.deployerAddress,
      tokenName: record.tokenName,
      tokenSymbol: record.tokenSymbol,
      decimals: record.decimals,
      initialSupplyBase: record.initialSupplyBase,
      featureConfig: record.featureConfig,
      quoteSnapshot: record.quoteSnapshot,
      platformFeeWei: record.platformFeeWei,
      status: "confirmed",
      blockNumber: record.blockNumber,
      confirmedAt: now,
      createdAt: now,
      schemaVersion: 1,
    };
    this.rows.set(key, row);
    return { row, inserted: true };
  }

  /** Test introspection: number of logical deployment rows. */
  size(): number {
    return this.rows.size;
  }
}
