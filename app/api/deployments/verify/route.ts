/**
 * POST /api/deployments/verify — automatic BscScan source verification.
 * GET  /api/deployments/verify — persisted verification status.
 *
 * The client may send ONLY { chainId, txHash } (POST) or
 * ?chainId=&contractAddress= (GET). Every other fact — token address,
 * provenance, constructor inputs, compiler settings — is derived
 * server-side from proven on-chain evidence. The BscScan key is touched
 * only after all proofs pass, inside lib/verify/* (never here, never in
 * responses, never in logs).
 *
 * Verification failure NEVER affects deployment success: this route only
 * reports verification state; the deployment already happened on-chain.
 */

import { getExpectedFactory, getServerChainReader } from "../../../../lib/deployments/chain";
import { isSupportedV1ChainId } from "../../../../lib/deploy/chains";
import { DatabaseUnavailableError } from "../../../../lib/db/client";
import { checkRateLimit, clientIpFromRequest } from "../../../../lib/server/rate-limit";
import { readTokenConstructorViews } from "../../../../lib/verify/chain";
import { PgVerificationStore } from "../../../../lib/verify/store";
import {
  pollVerificationStatus,
  requestVerification,
  VerifyServiceError,
} from "../../../../lib/verify/service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// Submissions consume BscScan key quota: throttle harder than status reads.
const VERIFY_LIMIT = 10;
const VERIFY_WINDOW_MS = 60_000;
const STATUS_LIMIT = 30;
const STATUS_WINDOW_MS = 60_000;

function errorBody(code: string, status: number, retryable: boolean): Response {
  return Response.json({ error: { code, retryable } }, { status });
}

function mapError(error: unknown): Response {
  if (error instanceof VerifyServiceError) {
    return errorBody(error.code, error.httpStatus, error.retryable);
  }
  if (error instanceof DatabaseUnavailableError) {
    return errorBody("unavailable", 503, true);
  }
  return errorBody("unavailable", 503, true);
}

function parsePostBody(body: unknown): { chainId: number; txHash: `0x${string}` } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  // The client may send ONLY { chainId, txHash }: any additional key
  // (tokenAddress, source, constructor args, …) is rejected outright so
  // unverified material can never become authoritative by accident.
  const keys = Object.keys(record).sort();
  if (keys.length !== 2 || keys[0] !== "chainId" || keys[1] !== "txHash") return null;
  if (typeof record.chainId !== "number" || !Number.isInteger(record.chainId)) return null;
  if (typeof record.txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(record.txHash)) {
    return null;
  }
  return { chainId: record.chainId, txHash: record.txHash as `0x${string}` };
}

export async function POST(request: Request): Promise<Response> {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(`deployments:verify:${ip}`, VERIFY_LIMIT, VERIFY_WINDOW_MS);
  if (!limit.allowed) {
    const response = errorBody("rate-limited", 429, true);
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorBody("invalid-request", 400, false);
  }
  const parsed = parsePostBody(body);
  if (!parsed || !isSupportedV1ChainId(parsed.chainId)) {
    return errorBody("invalid-request", 400, false);
  }
  const expectedFactory = getExpectedFactory(parsed.chainId);
  if (!expectedFactory) {
    return errorBody("invalid-request", 400, false);
  }

  try {
    // Lazily loaded: server-quote.ts carries `import "server-only"`, a
    // package absent from the unit-test runtime. Deferring keeps this
    // handler importable by tests (same precedent as lib/db/client.ts);
    // in production the module resolves normally before any key use.
    const { serverQuoteSnapshot } = await import(
      "../../../../lib/deployments/server-quote"
    );
    const state = await requestVerification(parsed.chainId, parsed.txHash, {
      chain: getServerChainReader(parsed.chainId),
      expectedFactory,
      quoteForFeatures: serverQuoteSnapshot,
      readTokenViews: (token) => readTokenConstructorViews(parsed.chainId, token),
      store: new PgVerificationStore(),
    });
    const status = state.status === "pending" ? 202 : 200;
    return Response.json({ verification: state }, { status });
  } catch (error) {
    return mapError(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(`deployments:verify-status:${ip}`, STATUS_LIMIT, STATUS_WINDOW_MS);
  if (!limit.allowed) {
    const response = errorBody("rate-limited", 429, true);
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return errorBody("invalid-request", 400, false);
  }
  const chainId = Number(url.searchParams.get("chainId"));
  const contractAddress = url.searchParams.get("contractAddress") ?? "";
  if (!Number.isInteger(chainId) || !isSupportedV1ChainId(chainId)) {
    return errorBody("invalid-request", 400, false);
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    return errorBody("invalid-request", 400, false);
  }

  try {
    const state = await pollVerificationStatus(chainId, contractAddress, {
      store: new PgVerificationStore(),
    });
    return Response.json({ verification: state }, { status: 200 });
  } catch (error) {
    return mapError(error);
  }
}
