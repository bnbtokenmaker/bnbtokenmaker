/**
 * POST /api/deployments/authorize — server-authoritative deployment package.
 *
 * Accepts ONLY a validated V1 TokenConfig ({ token fields, chainId }) plus an
 * optional campaignCode. The server prices the capability selection from the
 * ACTIVE pricing version, binds the EXACT config hash + fee + chain +
 * factory + nonce + expiry + pricing version into a frozen EIP-712
 * DeployQuote, signs it with the server-only quote key, and returns the
 * canonical package the frontend needs for the value-bearing
 * `createToken(params, quote, signature)` transaction.
 *
 * FAILURE POLICY (fail closed): invalid config, chain mismatch, unavailable
 * pricing, missing signer/factory config → 4xx/503 with sanitized codes.
 * No secrets (key, connection strings) ever leave this route. No-store.
 *
 * TESTNET SEPARATION: when DEPLOY_QUOTE_ZERO_FEE=true (testnet config), the
 * package is a signed ZERO-fee authorization — same architecture, no
 * commercial charge. Commercial chains sign the priced fee.
 */

import {
  authorizeDeployment,
  authorizeErrorStatus,
  getQuoteServerConfig,
  parseAuthorizeRequest,
  serverAccountFromEnv,
  AuthorizeError,
} from "../../../../lib/deploy/authorize";
import { checkRateLimit, clientIpFromRequest } from "../../../../lib/server/rate-limit";
import { getPricingStores, loadAuthoritativeSnapshot } from "../../../../lib/pricing/server/store";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const AUTHORIZE_LIMIT = 30;
const AUTHORIZE_WINDOW_MS = 60_000;

function errorBody(code: string, status: number): Response {
  return Response.json({ error: { code } }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(
    `deployments:authorize:${ip}`,
    AUTHORIZE_LIMIT,
    AUTHORIZE_WINDOW_MS
  );
  if (limit.allowed === false) {
    const response = errorBody("rate-limited", 429);
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorBody("invalid-request", 400);
  }

  let parsed;
  try {
    parsed = parseAuthorizeRequest(body);
  } catch (error) {
    if (error instanceof AuthorizeError) {
      return errorBody(error.code, authorizeErrorStatus(error));
    }
    return errorBody("invalid-request", 400);
  }

  let serverConfig;
  try {
    serverConfig = getQuoteServerConfig();
  } catch (error) {
    if (error instanceof AuthorizeError) {
      return errorBody(error.code, authorizeErrorStatus(error));
    }
    return errorBody("signer-unavailable", 503);
  }

  let snapshot;
  try {
    snapshot = await loadAuthoritativeSnapshot(getPricingStores(), {
      now: new Date(),
      campaignCode: parsed.campaignCode,
    });
  } catch {
    return errorBody("pricing-unavailable", 503);
  }

  let signer;
  try {
    signer = serverAccountFromEnv();
  } catch (error) {
    if (error instanceof AuthorizeError) {
      return errorBody(error.code, authorizeErrorStatus(error));
    }
    return errorBody("signer-unavailable", 503);
  }

  try {
    const deploymentPackage = await authorizeDeployment({
      token: parsed.token,
      chainId: parsed.chainId,
      deps: { snapshot, signer, serverConfig },
    });
    return Response.json({ package: deploymentPackage }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizeError) {
      return errorBody(error.code, authorizeErrorStatus(error));
    }
    return errorBody("unavailable", 503);
  }
}
