/**
 * GET /api/deployments/by-contract — read-only deployment lookup.
 *
 * Query: ?chainId=56|97&contractAddress=0x…
 *
 * Returns ONLY the public deployment txHash for a recorded contract, so
 * the token manager can invoke the existing verification flow (which
 * still requires chainId + txHash and re-proves everything on-chain).
 * Same posture as the discovery route: public on-chain facts only, no
 * authentication, no private data, no signer/quote material.
 *
 * Unknown deployment → 404. Malformed request → 400. Rate-limited per IP.
 */

import { PgDeploymentStore } from "../../../../lib/deployments/store";
import { isSupportedV1ChainId } from "../../../../lib/deploy/chains";
import {
  checkRateLimit,
  clientIpFromRequest,
} from "../../../../lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const LOOKUP_LIMIT = 20;
const LOOKUP_WINDOW_MS = 60_000;

function errorBody(code: string, status: number): Response {
  return Response.json({ error: { code } }, { status });
}

export async function GET(request: Request): Promise<Response> {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(
    `deployments:by-contract:${ip}`,
    LOOKUP_LIMIT,
    LOOKUP_WINDOW_MS
  );
  if (!limit.allowed) {
    const response = errorBody("rate-limited", 429);
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return errorBody("invalid-request", 400);
  }
  const chainRaw = (url.searchParams.get("chainId") ?? "").trim();
  const chainId = Number(chainRaw);
  if (!isSupportedV1ChainId(chainId)) {
    return errorBody("invalid-request", 400);
  }
  const contractAddress = (url.searchParams.get("contractAddress") ?? "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    return errorBody("invalid-request", 400);
  }

  try {
    const store = new PgDeploymentStore();
    const row = await store.findByContract(chainId, contractAddress);
    if (!row) {
      return errorBody("not-found", 404);
    }
    // ONLY the public txHash leaves this route — no signer, quote,
    // pricing, or DB metadata.
    return Response.json({ txHash: row.txHash }, { status: 200 });
  } catch {
    return errorBody("unavailable", 503);
  }
}
