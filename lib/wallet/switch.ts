import { BNB_MAINNET_CHAIN_ID } from "./chains";
import { DeploymentChainMismatchError } from "./network";

/**
 * Read-only live chain helpers.
 *
 * Phase 6A performs no automatic network changes: this module exposes
 * observation and pre-deployment guards only. Users change the network
 * manually inside their wallet; the app observes the selected live provider
 * (`eth_chainId` / `eth_accounts`) and fails closed otherwise.
 *
 * `getAuthoritativeChainId` / `assertDeploymentChain` are the exported
 * pre-deployment guards for Phase 6B/6C: call immediately before ANY future
 * transaction or signature. Cached wagmi/UI chain state must never authorize
 * deployment.
 */

/** Minimal EIP-1193 surface we rely on. Never touches `window.ethereum`. */
export type Eip1193ProviderLike = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (event: string, handler: (value: unknown) => void) => void;
  removeListener?: (event: string, handler: (value: unknown) => void) => void;
};

/** Minimal connector surface: the selected EIP-6963 connector. */
export type SwitchableConnectorLike = {
  uid: string;
  getProvider: () => Promise<unknown>;
};

export class WalletProviderUnavailableError extends Error {
  constructor() {
    super("No wallet provider is available for the selected connector.");
    this.name = "WalletProviderUnavailableError";
  }
}

export class ProviderChainReadError extends Error {
  constructor() {
    super(
      "Could not read the active network from your wallet. Please open your wallet and try again."
    );
    this.name = "ProviderChainReadError";
  }
}

/**
 * Parse a chain id reported as hex string ("0x38"), decimal string ("56"),
 * or number into a finite integer. Returns null when unparseable.
 */
export function parseChainId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = trimmed.startsWith("0x") || trimmed.startsWith("0X")
      ? Number.parseInt(trimmed, 16)
      : Number.parseInt(trimmed, 10);
    if (Number.isInteger(parsed)) return parsed;
  }
  return null;
}

/**
 * Fail-closed authority rule: only a live provider reading counts.
 * A cached wagmi/UI chain (or the configured default chain) must NEVER stand
 * in for the live provider — unknown live state resolves to null so callers
 * stay Wrong Network / ineligible instead of claiming a connected chain.
 */
export function resolveAuthoritativeChainId(
  providerChainId: number | null | undefined
): number | null {
  return typeof providerChainId === "number" ? providerChainId : null;
}

export function asProvider(value: unknown): Eip1193ProviderLike {
  const candidate = value as Partial<Eip1193ProviderLike> | null | undefined;
  if (!candidate || typeof candidate.request !== "function") {
    throw new WalletProviderUnavailableError();
  }
  return candidate as Eip1193ProviderLike;
}

/**
 * Read `eth_chainId` from one exact provider object. The caller must pass the
 * provider captured from the selected connector — this function never looks
 * up `window.ethereum` or any other ambient provider.
 */
export async function readProviderChainId(
  provider: unknown
): Promise<number> {
  const resolved = asProvider(provider);
  let raw: unknown;
  try {
    raw = await resolved.request({ method: "eth_chainId" });
  } catch {
    throw new ProviderChainReadError();
  }
  const chainId = parseChainId(raw);
  if (chainId === null) throw new ProviderChainReadError();
  return chainId;
}

/**
 * Authoritative chain of the selected connector, read live from its own
 * provider. Pre-deployment guard: call this immediately before ANY future
 * transaction or signature, and never rely on cached wagmi/UI chain state.
 */
export async function getAuthoritativeChainId(
  connector: SwitchableConnectorLike
): Promise<number> {
  const provider = await connector.getProvider();
  return readProviderChainId(provider);
}

/**
 * Pre-deployment guard: re-reads `eth_chainId` from the selected provider
 * and throws unless it is exactly the expected deployment chain.
 */
export async function assertDeploymentChain(
  connector: SwitchableConnectorLike,
  expectedChainId: number = BNB_MAINNET_CHAIN_ID
): Promise<number> {
  const actualChainId = await getAuthoritativeChainId(connector);
  if (actualChainId !== expectedChainId) {
    throw new DeploymentChainMismatchError(expectedChainId, actualChainId);
  }
  return actualChainId;
}
