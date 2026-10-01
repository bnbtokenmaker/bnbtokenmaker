/**
 * Deployment gas estimation (client-side).
 *
 * Extracted from `components/DeployFlow.tsx` so the public-client /
 * EIP-1193 wallet-provider boundary is unit-testable. This module is pure
 * logic: it performs no transaction construction, no factory selection, no
 * fee calculation, and no chain selection of its own. Callers supply an
 * already-authorized `to` / `data` / `value` triple.
 *
 * Safety posture: fail closed. Any estimation path that cannot produce a
 * trustworthy estimate throws `DeployFlowError`. A snapshot is never
 * fabricated, defaulted, or partially filled in.
 */
import { DeployFlowError } from "./errors";

export type GasSnapshot = {
  /** Gas units for the authorized deployment call. */
  gas: bigint;
  /** Network gas price (wei per gas unit) used to derive `costWei`. */
  gasPriceWei: bigint;
  /** Network gas cost only: `gas * gasPriceWei`. Never includes `value`. */
  costWei: bigint;
  /** Sender native balance observed on the path that produced the estimate. */
  balanceWei: bigint;
};

/** Minimal slice of a viem public client used for gas estimation. */
export type DeploymentGasClient = {
  estimateGas(args: {
    account: `0x${string}`;
    to: `0x${string}`;
    data: `0x${string}`;
    value: bigint;
  }): Promise<bigint>;
  getGasPrice(): Promise<bigint>;
  getBalance(args: { address: `0x${string}` }): Promise<bigint>;
};

/**
 * Minimal slice of an injected EIP-1193 provider.
 *
 * Declared structurally (rather than reusing wagmi/viem transport types) so
 * the estimation boundary can be exercised with a plain test double.
 */
export type WalletRpcProvider = {
  request(args: { method: string; params: unknown[] }): Promise<unknown>;
};

/**
 * Resolver for the connected wallet's EIP-1193 provider.
 *
 * When omitted (or when it resolves to `undefined`), no wallet fallback is
 * attempted and estimation fails closed. Callers pass this only when a
 * connector exists, mirroring the previous `if (connector && ...)` gate.
 */
export type WalletProviderResolver = () =>
  | Promise<WalletRpcProvider | undefined>
  | WalletRpcProvider
  | undefined;

/**
 * Marker emitted by BSC / go-ethereum-derived nodes when the sender cannot
 * cover `gas * fee + value`.
 *
 * Matched against the top-level error message only. viem wraps node errors in
 * `EstimateGasExecutionError` / `CallExecutionError` via
 * `super(cause.shortMessage, ...)`, so the node's own wording is always the
 * first line of `error.message`. No cause-chain walk is required, and none is
 * performed: widening the match would also retry on unrelated nested errors.
 */
export const BALANCE_EXHAUSTION_MARKER = "exceeds the balance";

/** True only for the specific "cannot cover gas * fee + value" RPC failure. */
export function isBalanceExhaustionError(error: unknown): boolean {
  const message = (error as { message?: unknown } | null | undefined)?.message;
  return typeof message === "string" && message.includes(BALANCE_EXHAUSTION_MARKER);
}

/**
 * Encode a bigint as a canonical JSON-RPC QUANTITY (`0x`-prefixed, no leading
 * zeros, minimal length).
 *
 * Deliberately NOT zero-padded to even length: BSC nodes reject even-length
 * values with leading zeros
 * (`json: cannot unmarshal hex number with leading zero digits ... hexutil.Big`)
 * while accepting minimal odd-length forms such as `0x1`. Fee magnitudes whose
 * hex length is odd (e.g. the FULL-V1 fee `226abadc42f8000`) are therefore
 * valid and must stay in this form.
 */
export function toRpcQuantity(value: bigint): `0x${string}` {
  return `0x${value.toString(16)}`;
}

/** True when `balance` can cover the platform `value` plus network gas cost. */
export function canAffordDeployment(args: {
  balanceWei: bigint;
  /** Authorized platform fee (the transaction `value`). */
  valueWei: bigint;
  /** Network gas cost: `gas * gasPriceWei`. */
  gasCostWei: bigint;
}): boolean {
  return args.balanceWei >= args.valueWei + args.gasCostWei;
}

/**
 * Estimate gas for an authorized deployment call.
 *
 * Primary path: the chain's public client. If — and only if — that path fails
 * with the balance-exhaustion error, estimation is retried once through the
 * connected wallet's EIP-1193 provider, which can resolve sender funds the
 * public RPC node does not see.
 *
 * `gasPrice` intentionally continues to come from the **public client** in
 * both paths. Gas price is a network-wide value rather than an account-scoped
 * one, so the public node's `eth_gasPrice` is equally authoritative, and this
 * avoids adding a second, wallet-dependent RPC surface to a security gate.
 *
 * Unrelated primary-path errors are never retried or masked: they surface as
 * `gas-estimate-failed`.
 */
export async function estimateDeploymentGas(input: {
  client: DeploymentGasClient;
  /** Connected wallet address; preserved as `from` on every path. */
  account: `0x${string}`;
  /** Authorized mainnet/testnet factory; preserved as `to` on every path. */
  to: `0x${string}`;
  /** Exact authorized `createToken` calldata; preserved on every path. */
  data: `0x${string}`;
  /** Exact authorized platform fee; preserved as `value` on every path. */
  value: bigint;
  resolveWalletProvider?: WalletProviderResolver;
}): Promise<GasSnapshot> {
  const { client, account, to, data, value } = input;

  try {
    const [gas, gasPriceWei, balanceWei] = await Promise.all([
      client.estimateGas({ account, to, data, value }),
      client.getGasPrice(),
      client.getBalance({ address: account }),
    ]);
    const costWei = gas * gasPriceWei;
    if (!canAffordDeployment({ balanceWei, valueWei: value, gasCostWei: costWei })) {
      throw new DeployFlowError("insufficient-gas-funds");
    }
    return { gas, gasPriceWei, costWei, balanceWei };
  } catch (error) {
    if (error instanceof DeployFlowError) throw error;
    if (isBalanceExhaustionError(error) && input.resolveWalletProvider) {
      try {
        const provider = await input.resolveWalletProvider();
        if (provider?.request) {
          const gas = BigInt(
            (await provider.request({
              method: "eth_estimateGas",
              params: [{ from: account, to, data, value: toRpcQuantity(value) }],
            })) as string,
          );
          const gasPriceWei = await client.getGasPrice();
          const balanceWei = BigInt(
            (await provider.request({
              method: "eth_getBalance",
              params: [account, "latest"],
            })) as string,
          );
          return { gas, gasPriceWei, costWei: gas * gasPriceWei, balanceWei };
        }
      } catch {
        // Wallet path failed; fall through and fail closed below.
      }
    }
    throw new DeployFlowError("gas-estimate-failed");
  }
}
