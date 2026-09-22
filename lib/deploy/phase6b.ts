/**
 * Phase 6B deployment guards. Testnet-only, fail-closed.
 *
 * Allowed chain for ANY real Phase 6B transaction: 97 (BSC Testnet).
 * Every other chain — including 56 (BSC Mainnet) — is rejected.
 *
 * These guards sit ABOVE the proven Phase 6A wallet layer without modifying
 * it: callers must pass a FRESHLY read live chain id (from the authoritative
 * selected provider via getAuthoritativeChainId / verifyProviderSession /
 * revalidateActiveChain), never cached wagmi/UI state. A cached claim of 97
 * can never override a live reading.
 */

export const PHASE6B_CHAIN_ID = 97;
export const PHASE6B_EXPLORER = "https://testnet.bscscan.com";
export const PHASE6B_RPC_DEFAULT = "https://data-seed-prebsc-1-s1.binance.org:8545/";

/** Phase 6B performs zero-fee testnet deployments: gas only, no platform fee. */
export const PHASE6B_PLATFORM_FEE_WEI = 0n;

export type Phase6bRejectReason =
  | "disconnected"
  | "no-account"
  | "account-mismatch"
  | "chain-unknown"
  | "chain-not-allowed"
  | "stale-chain"
  | "invalid-args"
  | "nonzero-fee";

export class Phase6bDeploymentError extends Error {
  readonly reason: Phase6bRejectReason;
  readonly liveChainId: number | null;
  constructor(reason: Phase6bRejectReason, liveChainId: number | null, detail: string) {
    super(`Phase 6B deployment blocked (${reason}): ${detail}`);
    this.name = "Phase6bDeploymentError";
    this.reason = reason;
    this.liveChainId = liveChainId;
  }
}

/**
 * Fail-closed chain gate. `liveChainId` must be exactly 97.
 * `cachedChainId` is accepted for stale-cache detection only: when the live
 * reading is missing/wrong, a cached 97 is reported as "stale-chain" so
 * operators can see the cache lied — it never authorizes.
 */
export function assertPhase6bChain(
  liveChainId: number | null | undefined,
  cachedChainId?: number | null
): 97 {
  if (typeof liveChainId !== "number" || !Number.isInteger(liveChainId)) {
    throw new Phase6bDeploymentError(
      "chain-unknown",
      null,
      "live chain could not be read from the wallet provider"
    );
  }
  if (liveChainId !== PHASE6B_CHAIN_ID) {
    const stale = cachedChainId === PHASE6B_CHAIN_ID;
    throw new Phase6bDeploymentError(
      stale ? "stale-chain" : "chain-not-allowed",
      liveChainId,
      stale
        ? `cached state claims chain 97 but the live provider reports ${liveChainId}; refusing`
        : `chain ${liveChainId} is not allowed for Phase 6B (only 97)`
    );
  }
  return PHASE6B_CHAIN_ID;
}

/** Reject unless connected with a usable account. */
export function assertPhase6bConnection(input: {
  isConnected: boolean;
  address?: string | null;
}): `0x${string}` {
  if (!input.isConnected) {
    throw new Phase6bDeploymentError(
      "disconnected",
      null,
      "wallet is not connected"
    );
  }
  const raw = (input.address ?? "").trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(raw)) {
    throw new Phase6bDeploymentError(
      "no-account",
      null,
      "no connected account available"
    );
  }
  return raw as `0x${string}`;
}

/**
 * The expected account must still be present in the fresh eth_accounts list
 * from the authoritative provider.
 */
export function assertPhase6bAccount(
  expectedAddress: string,
  liveAccounts: readonly string[]
): `0x${string}` {
  const expected = expectedAddress.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(expected)) {
    throw new Phase6bDeploymentError(
      "no-account",
      null,
      "expected account is not an address"
    );
  }
  const present = liveAccounts.some((a) => a.trim().toLowerCase() === expected);
  if (!present) {
    throw new Phase6bDeploymentError(
      "account-mismatch",
      null,
      "expected account is no longer available in the wallet"
    );
  }
  return expected as `0x${string}`;
}

/** Phase 6B testnet deployments carry zero native value (gas only). */
export function assertPhase6bZeroFee(txValueWei: bigint): void {
  if (txValueWei !== PHASE6B_PLATFORM_FEE_WEI) {
    throw new Phase6bDeploymentError(
      "nonzero-fee",
      PHASE6B_CHAIN_ID,
      `Phase 6B fee must be 0, got ${txValueWei} wei`
    );
  }
}

export type Phase6bPreTransactionInput = {
  isConnected: boolean;
  /** Account bound at session time (expected deployer/owner). */
  expectedAddress?: string | null;
  /** Fresh eth_accounts from the authoritative provider. */
  liveAccounts: readonly string[];
  /** Fresh eth_chainId from the authoritative provider. */
  liveChainId: number | null | undefined;
  /** Cached UI chain id, for stale-cache detection only. */
  cachedChainId?: number | null;
  /** Deployment args already validated via validateTokenConfig. */
  argsValid: boolean;
  /** Native value attached to the deployment transaction. */
  txValueWei: bigint;
};

export type Phase6bPreTransaction = {
  chainId: 97;
  deployer: `0x${string}`;
};

/**
 * Pre-transaction security gate for Phase 6B (mirrors the Phase 6C contract):
 * session exists, account matches, live chain is 97, args validated, fee zero.
 * Throws Phase6bDeploymentError fail-closed; only then may a transaction be
 * prepared.
 */
export function assertPhase6bPreTransaction(
  input: Phase6bPreTransactionInput
): Phase6bPreTransaction {
  const connected = assertPhase6bConnection({
    isConnected: input.isConnected,
    address: input.expectedAddress,
  });
  const deployer = assertPhase6bAccount(connected, input.liveAccounts);
  const chainId = assertPhase6bChain(input.liveChainId, input.cachedChainId);
  if (!input.argsValid) {
    throw new Phase6bDeploymentError(
      "invalid-args",
      chainId,
      "deployment arguments failed validation"
    );
  }
  assertPhase6bZeroFee(input.txValueWei);
  // Structural check: the deployer IS the token owner (factory enforces
  // owner == msg.sender on-chain; this mirrors it pre-transaction).
  return { chainId, deployer };
}
