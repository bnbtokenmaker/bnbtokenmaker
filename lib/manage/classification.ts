/**
 * Phase 7D-E3 token identification (pure logic over injected reads).
 *
 * Classification evidence (strongest first):
 *  1. Contract code exists at the address.
 *  2. `FACTORY()` returns an address in the known-factory registry AND
 *     `GENERATOR()` returns the canonical provenance string AND
 *     V1-specific views (`maxSupply`, `totalMinted`, `swapBackEnabled`)
 *     resolve — combined this identifies a BNBTokenMaker V1 token.
 *  3. Otherwise, if minimal ERC-20 reads succeed, the token is external;
 *     OPTIONAL capabilities are probed individually (read-only eth_call)
 *     for a conservative compatibility report.
 *
 * Never trusts name/symbol alone. "Created with BNBTokenMaker" describes
 * provenance evidence — never BscScan source verification.
 */

export const V1_GENERATOR = "BNBTokenMaker.com";

export type TokenKind = "own-v1" | "external" | "unsupported";

export type TokenBasicReads = {
  codeExists: boolean;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: bigint | null;
};

export type V1MarkerReads = {
  factory: `0x${string}` | null;
  generator: string | null;
  maxSupply: bigint | null;
  totalMinted: bigint | null;
  swapBackEnabled: boolean | null;
};

export type ExternalCapabilityId =
  | "owner"
  | "pausable"
  | "mint"
  | "burn"
  | "blacklist"
  | "whitelist"
  | "marketingWallet"
  | "ownership";

export type TokenClassification =
  | {
      kind: "own-v1";
      factory: `0x${string}`;
      basic: TokenBasicReads;
    }
  | {
      kind: "external";
      basic: TokenBasicReads;
      /** Conservatively detected read-level capabilities (selector + successful call). */
      detected: ExternalCapabilityId[];
      /** True when even the minimal ERC-20 surface is incomplete. */
      limited: boolean;
    }
  | {
      kind: "unsupported";
      reason: "no-code" | "no-basic-reads";
      basic: TokenBasicReads;
    };

function normalizeAddress(value: unknown): `0x${string}` | null {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/i.test(value)
    ? (value.toLowerCase() as `0x${string}`)
    : null;
}

/**
 * Classify from already-fetched reads (deterministic, fully unit-tested).
 * `knownFactories` are lowercase hex addresses of deployed V1 factories.
 */
export function classifyToken(input: {
  basic: TokenBasicReads;
  markers: V1MarkerReads;
  knownFactories: ReadonlySet<string>;
  externalDetected?: ExternalCapabilityId[];
}): TokenClassification {
  const { basic, markers, knownFactories } = input;
  if (!basic.codeExists) {
    return { kind: "unsupported", reason: "no-code", basic };
  }
  const factory = markers.factory ? normalizeAddress(markers.factory) : null;
  const factoryKnown = factory !== null && knownFactories.has(factory);
  const generatorOk = markers.generator === V1_GENERATOR;
  const markersOk =
    markers.maxSupply !== null &&
    markers.totalMinted !== null &&
    markers.swapBackEnabled !== null;
  if (factoryKnown && generatorOk && markersOk && factory !== null) {
    return { kind: "own-v1", factory, basic };
  }
  const hasBasic =
    basic.name !== null &&
    basic.symbol !== null &&
    basic.decimals !== null &&
    basic.totalSupply !== null;
  if (!hasBasic) {
    return { kind: "unsupported", reason: "no-basic-reads", basic };
  }
  return {
    kind: "external",
    basic,
    detected: input.externalDetected ?? [],
    limited: (input.externalDetected ?? []).length === 0,
  };
}

/** Human classification label (never claims BscScan verification). */
export function classificationLabel(c: TokenClassification): string {
  switch (c.kind) {
    case "own-v1":
      return "Created with BNBTokenMaker";
    case "external":
      return c.limited ? "External token (limited info)" : "Compatible external token";
    case "unsupported":
      return c.reason === "no-code" ? "No contract at this address" : "Unsupported token";
  }
}
