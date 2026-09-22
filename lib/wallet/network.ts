import {
  BNB_MAINNET_CHAIN_ID,
  BNB_TESTNET_CHAIN_ID,
  isSupportedChainId,
  type SupportedChainId,
} from "./chains";

/**
 * Network state of the connected wallet, derived ONLY from the active chain of
 * the connector/provider that owns the connected account. Never inferred from
 * the configured/default chain.
 */
export type WalletNetworkStatus =
  | "disconnected"
  | "mainnet"
  | "testnet"
  | "wrong";

export function classifyWalletNetwork(
  isConnected: boolean,
  chainId: number | null | undefined
): WalletNetworkStatus {
  if (!isConnected || typeof chainId !== "number") return "disconnected";
  if (chainId === BNB_MAINNET_CHAIN_ID) return "mainnet";
  if (chainId === BNB_TESTNET_CHAIN_ID) return "testnet";
  return "wrong";
}

/**
 * Fail-closed display derivation. Renders BSC Connected ONLY when every
 * authority condition holds simultaneously:
 * - wagmi reports a live connection,
 * - a pinned provider session is currently valid (same object, same account),
 * - the verified reading belongs to the active connector (uid match),
 * - the live chain reading is a number.
 *
 * A provider merely CLAIMING 56 (stale object, superseded session,
 * disconnected connector, unknown state) resolves to Wrong Network with a
 * null chain — never connected, never deployment-eligible.
 */
export type DisplayNetworkInput = {
  wagmiConnected: boolean;
  connectorUid: string | null;
  sessionValid: boolean;
  verifiedUid: string | null;
  liveChainId: number | null;
};

export type DisplayNetwork = {
  chainId: number | null;
  status: WalletNetworkStatus;
};

export function resolveDisplayNetwork(input: DisplayNetworkInput): DisplayNetwork {
  const uidMatch =
    typeof input.connectorUid === "string" &&
    input.connectorUid.length > 0 &&
    input.connectorUid === input.verifiedUid;
  const liveChainId =
    input.wagmiConnected && input.sessionValid && uidMatch
      ? input.liveChainId
      : null;
  const chainId = typeof liveChainId === "number" ? liveChainId : null;
  let status = classifyWalletNetwork(input.wagmiConnected, chainId);
  if (input.wagmiConnected && chainId === null) {
    // Connected but unverifiable => Wrong Network (warning visible,
    // deployment ineligible), never "connected".
    status = "wrong";
  }
  return { chainId, status };
}

/** The chain Phase 6B is allowed to deploy to. */
export const DEPLOYMENT_CHAIN_ID: SupportedChainId = BNB_MAINNET_CHAIN_ID;

export type DeploymentIneligibilityReason =
  | "disconnected"
  | "no-account"
  | "wrong-network";

export type DeploymentEligibility =
  | { eligible: true; chainId: SupportedChainId }
  | { eligible: false; reason: DeploymentIneligibilityReason };

/**
 * Pure eligibility check for future deployment (Phase 6B). Requires a connected
 * account AND that the active connector chain is exactly the deployment chain.
 *
 * This is a UI-level gate only. Phase 6B MUST additionally call
 * `revalidateActiveChain` on the live connector immediately before requesting
 * any signature/transaction, so a stale render can never authorise a deploy.
 */
export function walletDeploymentEligibility(input: {
  isConnected: boolean;
  address?: string | null;
  chainId?: number | null;
}): DeploymentEligibility {
  if (!input.isConnected) return { eligible: false, reason: "disconnected" };
  if (!input.address) return { eligible: false, reason: "no-account" };
  if (!isSupportedChainId(input.chainId)) {
    return { eligible: false, reason: "wrong-network" };
  }
  if (input.chainId !== DEPLOYMENT_CHAIN_ID) {
    return { eligible: false, reason: "wrong-network" };
  }
  return { eligible: true, chainId: input.chainId };
}

export class DeploymentChainMismatchError extends Error {
  readonly expectedChainId: number;
  readonly actualChainId: number;

  constructor(expectedChainId: number, actualChainId: number) {
    super(
      `Wallet is on chain ${actualChainId}, expected ${expectedChainId} for deployment.`
    );
    this.name = "DeploymentChainMismatchError";
    this.expectedChainId = expectedChainId;
    this.actualChainId = actualChainId;
  }
}

/**
 * Re-reads the active chain directly from the live connector provider and
 * throws unless it matches the intended deployment chain.
 *
 * Phase 6B must call this immediately before requesting any transaction or
 * signature. It deliberately bypasses cached React/wagmi state.
 */
export async function revalidateActiveChain(
  connector: { getChainId: () => Promise<number> },
  expectedChainId: number = DEPLOYMENT_CHAIN_ID
): Promise<number> {
  const actualChainId = await connector.getChainId();
  if (actualChainId !== expectedChainId) {
    throw new DeploymentChainMismatchError(expectedChainId, actualChainId);
  }
  return actualChainId;
}
