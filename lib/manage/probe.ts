/**
 * Phase 7D-E3 external-token compatibility probing (read-only).
 *
 * Probes run as eth_call reads through an injected client — never writes.
 * A capability counts as detected ONLY when the call succeeds with a
 * well-typed return. Selector existence alone proves nothing, and unknown
 * custom mutators are NEVER exposed as write controls in V1.
 *
 * Conservatively provable via reads: owner()/ownership, paused()/pausable.
 * Everything else (mint, lists, marketing, custom knobs) cannot be safely
 * inferred generically and stays unexposed for external tokens.
 */

import type { Hex } from "viem";

import {
  classifyToken,
  type ExternalCapabilityId,
  type TokenBasicReads,
  type TokenClassification,
  type V1MarkerReads,
} from "./classification";

export type ProbeClient = {
  getBytecode: (address: `0x${string}`) => Promise<Hex | null | undefined>;
  read: (
    address: `0x${string}`,
    functionName: string,
    args?: readonly unknown[]
  ) => Promise<unknown>;
};

/** Minimal read ABIs for cross-contract probing (UI client wiring). */
export const OWNER_READ_ABI = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

export const PAUSED_READ_ABI = [
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
] as const;

function isAddressString(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

export type InspectionReads = {
  basic: TokenBasicReads;
  markers: V1MarkerReads;
  owner: `0x${string}` | null;
  paused: boolean | null;
};

/**
 * Run the full read-only inspection sequence for one address. All reads
 * are best-effort individually — one failing view never aborts the rest.
 */
export async function inspectToken(
  client: ProbeClient,
  address: `0x${string}`
): Promise<InspectionReads> {
  const settled = await Promise.allSettled([
    client.getBytecode(address),
    client.read(address, "name"),
    client.read(address, "symbol"),
    client.read(address, "decimals"),
    client.read(address, "totalSupply"),
    client.read(address, "FACTORY"),
    client.read(address, "GENERATOR"),
    client.read(address, "maxSupply"),
    client.read(address, "totalMinted"),
    client.read(address, "swapBackEnabled"),
    client.read(address, "owner"),
    client.read(address, "paused"),
  ]);
  const value = (index: number): unknown =>
    settled[index].status === "fulfilled"
      ? (settled[index] as PromiseFulfilledResult<unknown>).value
      : undefined;

  const code = value(0);
  const name = value(1);
  const symbol = value(2);
  const decimals = value(3);
  const totalSupply = value(4);
  const factory = value(5);
  const generator = value(6);
  const maxSupply = value(7);
  const totalMinted = value(8);
  const swapBackEnabled = value(9);
  const owner = value(10);
  const paused = value(11);

  const basic: TokenBasicReads = {
    codeExists: typeof code === "string" && code !== "0x" && code.length > 2,
    name: typeof name === "string" ? name : null,
    symbol: typeof symbol === "string" ? symbol : null,
    decimals: typeof decimals === "number" ? decimals : null,
    totalSupply: typeof totalSupply === "bigint" ? totalSupply : null,
  };
  return {
    basic,
    markers: {
      factory: isAddressString(factory) ? factory : null,
      generator: typeof generator === "string" ? generator : null,
      maxSupply: typeof maxSupply === "bigint" ? maxSupply : null,
      totalMinted: typeof totalMinted === "bigint" ? totalMinted : null,
      swapBackEnabled: typeof swapBackEnabled === "boolean" ? swapBackEnabled : null,
    },
    owner: isAddressString(owner) ? owner : null,
    paused: typeof paused === "boolean" ? paused : null,
  };
}

/**
 * Classify an inspected address. `knownFactories` holds lowercase V1
 * factory addresses for the active chain.
 */
export function classifyInspected(
  reads: InspectionReads,
  knownFactories: ReadonlySet<string>
): TokenClassification {
  const detected: ExternalCapabilityId[] = [];
  if (reads.owner !== null) detected.push("owner", "ownership");
  if (reads.paused !== null) detected.push("pausable");
  return classifyToken({
    basic: reads.basic,
    markers: reads.markers,
    knownFactories,
    externalDetected: detected,
  });
}
