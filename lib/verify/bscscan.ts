/**
 * BscScan source-verification client (SERVER-ONLY).
 *
 * Talks to the Etherscan-compatible V2 API (`api.etherscan.io/v2/api`
 * with `chainid=`), the same style already configured for Hardhat
 * verification. The API key is read from the server environment at call
 * time and NEVER leaves this module: it is not logged, not returned, and
 * not embedded in any error message. This module must never be imported by
 * client components (a structural test enforces that boundary).
 *
 * Every function takes an injectable `fetchImpl` so tests run fully
 * deterministic with mocked BscScan responses — no live calls in tests.
 * No unbounded polling lives here: each call performs exactly one upstream
 * request with a bounded timeout. Callers own retry cadence.
 */

import {
  isSupportedV1ChainId,
  type SupportedV1ChainId,
} from "../deploy/chains";
import {
  VERIFY_COMPILERVERSION_PARAM,
  VERIFY_CONTRACT_FQN,
  VERIFY_LICENSE_TYPE_MIT,
} from "./inputs";

export const BSCSCAN_V2_API_BASE = "https://api.etherscan.io/v2/api";

/** Bounded upstream timeout per request (no hanging verification calls). */
export const BSCSCAN_REQUEST_TIMEOUT_MS = 20_000;

/** Max upstream response text retained in sanitized errors. */
const MAX_ERROR_TEXT = 200;

export type BscScanErrorCode =
  | "config-missing-key"
  | "unsupported-chain"
  | "invalid-input"
  | "upstream-unavailable"
  | "timeout"
  | "rate-limited"
  | "indexing-delay"
  | "upstream-exception"
  | "empty-status"
  | "key-invalid"
  | "key-throttled"
  | "pool-exhausted"
  | "chain-not-covered"
  | "malformed-response"
  | "submission-rejected"
  | "already-verified"
  | "guid-unknown"
  | "verification-failed"
  | "compiler-mismatch"
  | "status-unknown";

export class BscScanError extends Error {
  readonly code: BscScanErrorCode;
  readonly retryable: boolean;
  constructor(code: BscScanErrorCode, retryable: boolean, detail: string) {
    super(`BscScan verification ${code}: ${detail}`);
    this.name = "BscScanError";
    this.code = code;
    this.retryable = retryable;
  }
}

export type FetchImpl = (
  input: string,
  init?: RequestInit
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

function apiUrl(chainId: SupportedV1ChainId): string {
  return `${BSCSCAN_V2_API_BASE}?chainid=${chainId}`;
}

function readApiKey(): string {
  const key = (process.env.BSCSCAN_API_KEY ?? "").trim();
  if (!key) {
    throw new BscScanError("config-missing-key", false, "BSCSCAN_API_KEY is not configured");
  }
  return key;
}

function requireChain(chainId: number): asserts chainId is SupportedV1ChainId {
  if (!isSupportedV1ChainId(chainId)) {
    throw new BscScanError("unsupported-chain", false, `chain ${String(chainId)} is not supported`);
  }
}

function sanitize(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_ERROR_TEXT);
}

async function readUpstreamJson(
  response: { ok: boolean; status: number; json(): Promise<unknown> }
): Promise<{ status: string; message: string; result: unknown }> {
  if (!response.ok) {
    throw new BscScanError(
      "upstream-unavailable",
      true,
      `upstream HTTP ${response.status}`
    );
  }
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new BscScanError("malformed-response", true, "upstream returned non-JSON");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new BscScanError("malformed-response", true, "upstream JSON has no result envelope");
  }
  const record = parsed as Record<string, unknown>;
  const status = typeof record.status === "string" ? record.status : "";
  const message = typeof record.message === "string" ? record.message : "";
  if (status !== "0" && status !== "1") {
    throw new BscScanError("malformed-response", true, "upstream JSON has no status");
  }
  return { status, message, result: record.result };
}

async function postForm(
  url: string,
  params: Record<string, string>,
  fetchImpl: FetchImpl
): Promise<{ status: string; message: string; result: unknown }> {
  const body = new URLSearchParams(params).toString();
  let response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(BSCSCAN_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new BscScanError(
      "timeout",
      true,
      error instanceof Error && error.name === "AbortError"
        ? "upstream request timed out"
        : "upstream network error"
    );
  }
  return readUpstreamJson(response);
}

async function getJson(
  url: string,
  params: Record<string, string>,
  fetchImpl: FetchImpl
): Promise<{ status: string; message: string; result: unknown }> {
  const full = `${url}&${new URLSearchParams(params).toString()}`;
  let response;
  try {
    response = await fetchImpl(full, {
      signal: AbortSignal.timeout(BSCSCAN_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new BscScanError(
      "timeout",
      true,
      error instanceof Error && error.name === "AbortError"
        ? "upstream request timed out"
        : "upstream network error"
    );
  }
  return readUpstreamJson(response);
}

export type SubmitVerificationInput = {
  chainId: number;
  contractAddress: string;
  standardJson: string;
  /** Raw hex constructor arguments WITHOUT 0x prefix. */
  constructorArgsHex: string;
  fetchImpl?: FetchImpl;
};

/**
 * Submit Standard JSON source verification. Resolves with the BscScan GUID
 * on acceptance. Rejects with classified BscScanError otherwise.
 */
export async function submitVerification(input: SubmitVerificationInput): Promise<{ guid: string }> {
  requireChain(input.chainId);
  if (!/^0x[a-fA-F0-9]{40}$/.test(input.contractAddress)) {
    throw new BscScanError("invalid-input", false, "contract address is malformed");
  }
  if (!input.standardJson || input.constructorArgsHex === undefined) {
    throw new BscScanError("invalid-input", false, "verification input is incomplete");
  }
  const key = readApiKey();
  const { fetchImpl = fetch as unknown as FetchImpl } = input;
  // Constructor arguments are sent under BOTH documented spellings with
  // identical values. Evidence: the maintained @nomicfoundation/hardhat-verify
  // integration (the repo's pinned 2.0.14) sends only `constructorArguements`
  // against this same V2 endpoint and verifies successfully, while the
  // current Etherscan OpenAPI + verification guide document
  // `constructorArguments`. Form backends ignore unknown fields, and equal
  // values admit no semantic ambiguity — so dual submission covers both
  // backend generations with zero behavioral risk either way.
  // NOTE: `constructorArguements` is the historical Etherscan API typo,
  // kept verbatim (not a typo in this file).
  const { status, result } = await postForm(
    apiUrl(input.chainId),
    {
      module: "contract",
      action: "verifysourcecode",
      chainid: String(input.chainId),
      apikey: key,
      contractaddress: input.contractAddress,
      codeformat: "solidity-standard-json-input",
      sourceCode: input.standardJson,
      contractname: VERIFY_CONTRACT_FQN,
      compilerversion: VERIFY_COMPILERVERSION_PARAM,
      constructorArguements: input.constructorArgsHex,
      constructorArguments: input.constructorArgsHex,
      optimizationUsed: "1",
      runs: "200",
      licenseType: String(VERIFY_LICENSE_TYPE_MIT),
    },
    fetchImpl
  );
  if (status === "1" && typeof result === "string" && /^[A-Za-z0-9]{8,128}$/.test(result)) {
    return { guid: result };
  }
  const text = typeof result === "string" ? result : "";
  const lower = text.toLowerCase();
  if (lower.includes("already verified") || lower.includes("alreadyverified")) {
    throw new BscScanError("already-verified", false, sanitize(text) || "contract already verified");
  }
  if (lower.includes("rate limit") || lower.includes("max rate") || lower.includes("exceeded")) {
    throw new BscScanError("rate-limited", true, sanitize(text) || "upstream rate limit");
  }
  if (lower.includes("invalid api key") || lower.includes("missing") && lower.includes("apikey")) {
    throw new BscScanError("config-missing-key", false, "upstream rejected the API key");
  }
  // BscScan has not indexed the contract yet (standard immediately after
  // deployment). Retryable — must never become a terminal mismatch. The
  // match is case/whitespace-insensitive; `lower` is already normalized.
  if (lower.replace(/\s+/g, " ").includes("unable to locate contractcode")) {
    throw new BscScanError("indexing-delay", true, sanitize(text) || "contract not indexed yet");
  }
  if (
    lower.includes("compiler") ||
    lower.includes("bytecode") ||
    lower.includes("does not match") ||
    lower.includes("mismatch")
  ) {
    throw new BscScanError("compiler-mismatch", false, sanitize(text) || "compiler input mismatch");
  }
  throw new BscScanError("submission-rejected", false, sanitize(text) || "submission rejected");
}

export type VerificationStatus =
  | { state: "pending" }
  | { state: "verified"; alreadyKnown: boolean }
  | { state: "failed"; terminal: boolean; detail: string };

/**
 * Check one GUID exactly once (no polling here). Classifies the upstream
 * verdict into pending / verified / failed.
 */
export async function checkVerificationStatus(input: {
  chainId: number;
  guid: string;
  fetchImpl?: FetchImpl;
}): Promise<VerificationStatus> {
  requireChain(input.chainId);
  if (!/^[A-Za-z0-9]{8,128}$/.test(input.guid)) {
    throw new BscScanError("invalid-input", false, "GUID is malformed");
  }
  const key = readApiKey();
  const { fetchImpl = fetch as unknown as FetchImpl } = input;
  const { status, result } = await getJson(
    apiUrl(input.chainId),
    {
      module: "contract",
      action: "checkverifystatus",
      chainid: String(input.chainId),
      guid: input.guid,
      apikey: key,
    },
    fetchImpl
  );
  const text = typeof result === "string" ? result : "";
  const lower = text.toLowerCase();
  void status;
  // Empty or non-string results carry no verdict at all (common while
  // BscScan is still ingesting a fresh submission). Retryable and
  // explicit — never silently terminal, never silently pending-forever.
  if (text.trim() === "") {
    throw new BscScanError("empty-status", true, "upstream returned no status text");
  }
  if (lower.includes("pass") && lower.includes("verif")) {
    return { state: "verified", alreadyKnown: false };
  }
  if (lower.includes("already verified") || lower.includes("alreadyverified")) {
    return { state: "verified", alreadyKnown: true };
  }
  if (lower.includes("pending")) {
    return { state: "pending" };
  }
  if (lower.includes("rate limit") || lower.includes("max rate") || lower.includes("exceeded")) {
    throw new BscScanError("rate-limited", true, sanitize(text) || "upstream rate limit");
  }
  // IP-level key throttle resets on its own (~30 s per upstream docs):
  // retryable, but tracked separately from quota rate limits. Must be
  // checked BEFORE the invalid-key arm: the throttle message contains
  // the words "invalid api key".
  if (lower.includes("too many invalid")) {
    throw new BscScanError("key-throttled", true, sanitize(text) || "api key throttled");
  }
  // An unusable key is an operator/configuration fault, not a transient
  // one: surface it distinctly and do NOT retry blindly or file it as
  // ordinary pending. Fresh requests after a key fix proceed normally.
  if (lower.includes("invalid api key")) {
    throw new BscScanError("key-invalid", false, "upstream rejected the API key");
  }
  if (lower.includes("invalid") && lower.includes("guid")) {
    // A GUID BscScan does not know yet usually means propagation delay
    // right after submission — retryable within the route's attempt cap.
    throw new BscScanError("guid-unknown", true, sanitize(text) || "unknown GUID");
  }
  if (lower.includes("fail") || lower.includes("unable to verify") || lower.includes("mismatch")) {
    return { state: "failed", terminal: true, detail: sanitize(text) || "verification failed" };
  }
  // Shared-pool exhaustion resets on its own (upstream publishes the
  // reset time): retryable with its own code, not generic pending.
  if (lower.includes("community free api limit") || lower.includes("free api limit reached")) {
    throw new BscScanError("pool-exhausted", true, sanitize(text) || "shared API pool exhausted");
  }
  // The key's plan does not cover this chain. Retrying cannot help —
  // only a plan change does — so this is terminal-but-recoverable:
  // surfaced honestly, and a fresh request after the fix proceeds
  // (deliberately NOT in the terminal-code set that blocks resubmission).
  if (
    lower.includes("free api access is not supported") ||
    lower.includes("not supported for this chain")
  ) {
    throw new BscScanError("chain-not-covered", false, "api plan does not cover this chain");
  }
  // Upstream-side timeouts/server-busy: retryable, never terminal.
  if (lower.includes("timeout") || lower.includes("server too busy")) {
    throw new BscScanError("timeout", true, sanitize(text) || "upstream timeout");
  }
  // BscScan-side job failure the explorer itself cannot classify. Kept
  // retryable and explicit (bounded by the caller's attempt budget) so an
  // unrecognized backend state can never silently stall or silently fail.
  if (lower.replace(/\s+/g, " ").includes("other exception")) {
    throw new BscScanError("upstream-exception", true, sanitize(text) || "upstream exception");
  }
  // Unknown verdict text: never terminal by default — the route's attempt
  // cap stops unbounded polling.
  throw new BscScanError("status-unknown", true, sanitize(text) || "unknown status");
}

/**
 * Ask BscScan whether a contract already exposes verified source, without
 * submitting anything. Used before submission (dedup) and for refresh
 * recovery (GUID-independent).
 */
export async function isContractSourceVerified(input: {
  chainId: number;
  contractAddress: string;
  fetchImpl?: FetchImpl;
}): Promise<boolean> {
  requireChain(input.chainId);
  if (!/^0x[a-fA-F0-9]{40}$/.test(input.contractAddress)) {
    throw new BscScanError("invalid-input", false, "contract address is malformed");
  }
  const key = readApiKey();
  const { fetchImpl = fetch as unknown as FetchImpl } = input;
  const { status, result } = await getJson(
    apiUrl(input.chainId),
    {
      module: "contract",
      action: "getsourcecode",
      chainid: String(input.chainId),
      address: input.contractAddress,
      apikey: key,
    },
    fetchImpl
  );
  if (status !== "1" || !Array.isArray(result) || result.length === 0) {
    throw new BscScanError("malformed-response", true, "unexpected getsourcecode envelope");
  }
  const source = (result[0] as Record<string, unknown>).SourceCode;
  return typeof source === "string" && source.length > 0 && source !== "0x";
}
