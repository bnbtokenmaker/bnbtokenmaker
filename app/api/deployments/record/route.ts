/**
 * POST /api/deployments/record — Phase 7A verified deployment persistence.
 *
 * Accepts ONLY { chainId, txHash }. The server independently verifies the
 * transaction + receipt + TokenCreated event on BSC Testnet before
 * inserting an idempotent deployment row keyed on (chainId, txHash).
 *
 * No admin authentication is required: a verified on-chain fact is public
 * and the endpoint stores nothing caller-supplied beyond the lookup hint.
 * All failures are sanitized (no RPC/DB text, no secrets).
 */

import { getExpectedFactory, getServerChainReader } from "../../../../lib/deployments/chain";
import { serverQuoteSnapshot } from "../../../../lib/deployments/server-quote";
import {
  RecordDeploymentsError,
  recordDeployment,
  toPublicDto,
} from "../../../../lib/deployments/service";
import { PgDeploymentStore } from "../../../../lib/deployments/store";
import {
  checkRateLimit,
  clientIpFromRequest,
} from "../../../../lib/server/rate-limit";

export const dynamic = "force-dynamic";

const RECORD_LIMIT = 30;
const RECORD_WINDOW_MS = 60_000;

function errorBody(code: string, status: number, retryAfter?: number): Response {
  const response = Response.json({ error: { code } }, { status });
  if (retryAfter !== undefined) {
    response.headers.set("Retry-After", String(retryAfter));
  }
  return response;
}

export async function POST(request: Request): Promise<Response> {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(
    `deployments:record:${ip}`,
    RECORD_LIMIT,
    RECORD_WINDOW_MS
  );
  if (!limit.allowed) {
    return errorBody("rate-limited", 429, limit.retryAfterSeconds);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorBody("invalid-request", 400);
  }

  try {
    const outcome = await recordDeployment(body, {
      store: new PgDeploymentStore(),
      chain: getServerChainReader(),
      expectedFactory: getExpectedFactory(),
      quoteForFeatures: serverQuoteSnapshot,
    });
    const status = outcome.result.inserted ? 201 : 200;
    return Response.json(
      { deployment: toPublicDto(outcome.result.row, outcome.result.inserted) },
      { status }
    );
  } catch (error) {
    if (error instanceof RecordDeploymentsError) {
      return errorBody(error.code, error.httpStatus);
    }
    return errorBody("unavailable", 503);
  }
}
