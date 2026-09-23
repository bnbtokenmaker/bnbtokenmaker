/**
 * Phase 7A best-effort deployment persistence (client side).
 *
 * Called ONLY after the flow has independently reached verified on-chain
 * success (receipt + factory TokenCreated event). Sends the minimum hint
 * { chainId, txHash } — the server re-verifies everything before storing.
 *
 * FAILURE CONTRACT (critical): this helper never throws into the deploy
 * flow and never reports failure as deployment failure. A recording outage
 * returns false; blockchain success is already established and stays shown.
 * It performs exactly one POST — never a wallet call, never a transaction.
 */

import { PHASE6B_CHAIN_ID } from "./phase6b";

export async function requestDeploymentRecord(
  txHash: `0x${string}`
): Promise<boolean> {
  try {
    const response = await fetch("/api/deployments/record", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chainId: PHASE6B_CHAIN_ID, txHash }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
