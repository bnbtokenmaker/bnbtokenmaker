/**
 * Phase 7D-E3 lifetime mint capacity (pure, bigint-safe).
 *
 * Remaining capacity = maxSupply − totalMinted (lifetime issuance, NOT
 * current totalSupply). Burns never restore capacity. maxSupply 0n means
 * contract-level Unlimited — an explicit deployment choice with a clear
 * trust implication, never "zero capacity".
 */

export type MintCapacity =
  | { kind: "unlimited" }
  | { kind: "capped"; remaining: bigint; exhausted: boolean };

export function mintCapacity(input: {
  maxSupply: bigint;
  totalMinted: bigint;
}): MintCapacity {
  if (input.maxSupply === 0n) return { kind: "unlimited" };
  const remaining = input.maxSupply - input.totalMinted;
  return {
    kind: "capped",
    remaining: remaining > 0n ? remaining : 0n,
    exhausted: remaining <= 0n,
  };
}

/** Client-side over-cap prevention (the contract remains authoritative). */
export function wouldExceedCap(
  input: { maxSupply: bigint; totalMinted: bigint },
  amount: bigint
): boolean {
  if (amount <= 0n) return true;
  const capacity = mintCapacity(input);
  if (capacity.kind === "unlimited") return false;
  return amount > capacity.remaining;
}
