/**
 * Phase 7A deployment-record service (server-only orchestration).
 *
 * Flow: parse client hint → verify on-chain → idempotent upsert.
 * No step trusts client claims; every recorded fact is receipt-derived.
 * Failures map to sanitized public codes — raw RPC/DB text never leaves
 * the server (details stay in server logs only).
 */


import type { DeploymentRow } from "../db/schema";
import {
  RecordHintError,
  featureIdsFromConfig,
  parseFeatureConfig,
  parseRecordHint,
  type FeatureConfigV1,
} from "./validate";
import {
  VerificationError,
  verifyDeployment,
  type ChainReader,
  type QuoteSnapshotInput,
  type VerifiedDeploymentRecord,
} from "./verify";
import {
  DeploymentConflictError,
  type DeploymentStore,
  type UpsertResult,
} from "./store";

export type RecordDeploymentsErrorCode =
  | "invalid-request"
  | "unsupported-chain"
  | "invalid-tx-hash"
  | "not-found"
  | "not-confirmed"
  | "unverifiable"
  | "conflict"
  | "unavailable"
  | "rate-limited";

export class RecordDeploymentsError extends Error {
  readonly code: RecordDeploymentsErrorCode;
  readonly httpStatus: number;
  constructor(code: RecordDeploymentsErrorCode, httpStatus: number) {
    super(code);
    this.name = "RecordDeploymentsError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export type RecordDependencies = {
  store: DeploymentStore;
  chain: ChainReader;
  expectedFactory: `0x${string}` | null;
  /**
   * Price snapshot for receipt-derived feature ids. Production passes
   * serverQuoteSnapshot (server-owned pricing source); tests inject a stub.
   * Injected (not imported) so this module stays free of `server-only`
   * wiring and unit-testable — see ./server-quote.ts.
   */
  quoteForFeatures: (
    featureIds: string[]
  ) => QuoteSnapshotInput | Promise<QuoteSnapshotInput>;
};

function verificationToPublicCode(code: string): RecordDeploymentsErrorCode {
  switch (code) {
    case "tx-missing":
    case "receipt-missing":
      return "not-found";
    case "tx-reverted":
      return "not-confirmed";
    case "factory-mismatch":
    case "nonzero-value":
    case "event-missing":
      return "unverifiable";
    case "factory-unavailable":
    case "rpc-unavailable":
    default:
      return "unavailable";
  }
}

export type RecordOutcome = {
  result: UpsertResult;
  /** Feature ids derived from the on-chain bitmap (for response parity). */
  selectedFeatures: string[];
};

export async function recordDeployment(
  body: unknown,
  deps: RecordDependencies
): Promise<RecordOutcome> {
  let hint;
  try {
    hint = parseRecordHint(body);
  } catch (error) {
    if (error instanceof RecordHintError) {
      const status = error.code === "invalid-request" ? 400 : 400;
      throw new RecordDeploymentsError(
        error.code as RecordDeploymentsErrorCode,
        status
      );
    }
    throw new RecordDeploymentsError("invalid-request", 400);
  }

  let verified: VerifiedDeploymentRecord;
  try {
    verified = await verifyDeployment({
      hint,
      chain: deps.chain,
      expectedFactory: deps.expectedFactory,
      quoteForFeatures: deps.quoteForFeatures,
    });
  } catch (error) {
    if (error instanceof VerificationError) {
      const code = verificationToPublicCode(error.code);
      const status =
        code === "not-found" ? 404 : code === "unavailable" ? 503 : 422;
      throw new RecordDeploymentsError(code, status);
    }
    throw new RecordDeploymentsError("unavailable", 503);
  }

  try {
    const result = await deps.store.upsertDeployment(verified);
    const config = parseFeatureConfig(result.row.featureConfig) as FeatureConfigV1;
    return {
      result,
      selectedFeatures: featureIdsFromConfig(config),
    };
  } catch (error) {
    if (error instanceof DeploymentConflictError) {
      throw new RecordDeploymentsError("conflict", 409);
    }
    throw new RecordDeploymentsError("unavailable", 503);
  }
}

export type PublicDeploymentDto = {
  chainId: number;
  txHash: string;
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  recorded: boolean;
};

/** Minimal public DTO: proof-of-record only, no internals. */
export function toPublicDto(row: DeploymentRow, inserted: boolean): PublicDeploymentDto {
  return {
    chainId: row.chainId,
    txHash: row.txHash,
    contractAddress: row.contractAddress,
    tokenName: row.tokenName,
    tokenSymbol: row.tokenSymbol,
    recorded: inserted,
  };
}
