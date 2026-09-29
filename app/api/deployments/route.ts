/**
 * GET /api/deployments — read-only discovery of verified deployments.
 *
 * Query: ?deployer=0x…&chainId=56|97&limit=8
 *
 * Returns PUBLIC on-chain facts only (chain, tx, contract, token identity —
 * the same data visible on any block explorer). No authentication: there is
 * no private data in these rows. Callers MUST still verify on-chain owner()
 * before assuming privileges — a deployer may have transferred the token.
 *
 * Dual-chain: supports BSC Mainnet (56) and BSC Testnet (97).
 * Unsupported chains are rejected.
 *
 * Fail-closed validation: malformed deployer/chain/limit → 400; DB outage →
 * sanitized 503. Rate-limited per IP.
 */

import { toPublicDto } from "../../../lib/deployments/service";
import { PgDeploymentStore } from "../../../lib/deployments/store";
import { isSupportedV1ChainId } from "../../../lib/deploy/chains";
import {
  checkRateLimit,
  clientIpFromRequest,
} from "../../../lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const LIST_LIMIT = 20;
const LIST_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

function errorBody(code: string, status: number): Response {
  return Response.json({ error: { code } }, { status });
}

export async function GET(request: Request): Promise<Response> {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(
    `deployments:list:${ip}`,
    LIST_LIMIT,
    LIST_WINDOW_MS
  );
  if (!limit.allowed) {
    const response = errorBody("rate-limited", 429);
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  const url = new URL(request.url);
  const deployer = (url.searchParams.get("deployer") ?? "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(deployer)) {
    return errorBody("invalid-request", 400);
  }
  const chainRaw = (url.searchParams.get("chainId") ?? "").trim();
  const chainId = Number(chainRaw);
  if (!isSupportedV1ChainId(chainId)) {
    return errorBody("unsupported-chain", 400);
  }
  const limitRaw = (url.searchParams.get("limit") ?? String(DEFAULT_LIMIT)).trim();
  const limitNum = Number(limitRaw);
  if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > MAX_LIMIT) {
    return errorBody("invalid-request", 400);
  }

  try {
    const store = new PgDeploymentStore();
    const rows = await store.listByDeployer(
      chainId,
      deployer.toLowerCase(),
      limitNum
    );
    return Response.json(
      {
        deployments: rows.map((row) => toPublicDto(row, true)),
      },
      { status: 200 }
    );
  } catch {
    return errorBody("unavailable", 503);
  }
}
