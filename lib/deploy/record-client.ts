/**
 * Phase 7A best-effort deployment persistence (client side).
 *
 * Called ONLY after the flow has independently reached verified on-chain
 * success (receipt + factory TokenCreated event). Sends the minimum hint
 * { chainId, txHash } — the server re-verifies everything before storing.
 *
 * Dual-chain: the chainId is passed explicitly from the deployment context.
 * Chain 56 records stay 56; chain 97 records stay 97.
 *
 * FAILURE CONTRACT (critical): this helper never throws into the deploy
 * flow and never reports failure as deployment failure. A recording outage
 * returns false; blockchain success is already established and stays shown.
 * It performs exactly one POST — never a wallet call, never a transaction.
 */

import { isSupportedV1ChainId } from "./chains";

export async function requestDeploymentRecord(
  chainId: number,
  txHash: `0x${string}`
): Promise<boolean> {
  if (!isSupportedV1ChainId(chainId)) {
    return false;
  }
  try {
    const response = await fetch("/api/deployments/record", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chainId, txHash }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
