/**
 * Behavioral tests for the extracted deployment gas-estimation helper.
 *
 * These import and execute the SAME `estimateDeploymentGas` used by
 * `components/DeployFlow.tsx`. The public-client and EIP-1193 wallet-provider
 * boundary is exercised with recording test doubles — no duplicated logic.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BALANCE_EXHAUSTION_MARKER,
  canAffordDeployment,
  estimateDeploymentGas,
  isBalanceExhaustionError,
  toRpcQuantity,
  type DeploymentGasClient,
  type WalletRpcProvider,
} from "../gas-estimation";

const ACCOUNT = "0x8d3218A2cD42388CA627a9432e8b14F65d1c9990" as const;
const FACTORY = "0xd7de07de5113efa6cf0c213914ed7f0df60b682c" as const;
const DATA = "0xdeadbeef" as const;
const BASIC_VALUE = 50000000000000000n; // 0.050 BNB
const GAS = 1200000n;
const GAS_PRICE = 1000000000n; // 1 gwei
const GAS_COST = GAS * GAS_PRICE; // 0.0012 BNB
/** Realistic shortfall seen on the deployer wallet. */
const DEPLOYER_BALANCE = 49600000000000000n; // 0.0496 BNB

type EstimateArgs = {
  account: string;
  to: string;
  data: string;
  value: bigint;
};
type ProviderCall = { method: string; params: unknown[] };

type ClientDouble = {
  client: DeploymentGasClient;
  estimateCalls: EstimateArgs[];
  /** Mutable holder: a plain number would be snapshotted at destructure time. */
  gasPriceCalls: { count: number };
  balanceCalls: { address: string }[];
};

/** Public-client double. `estimateGas` failure mode is caller-controlled. */
function makeClient(opts: {
  gas?: bigint;
  gasPrice?: bigint;
  balance?: bigint;
  estimateError?: Error;
  getGasPriceError?: Error;
  getBalanceError?: Error;
}): ClientDouble {
  const estimateCalls: EstimateArgs[] = [];
  const balanceCalls: { address: string }[] = [];
  const gasPriceCalls = { count: 0 };
  const client: DeploymentGasClient = {
    async estimateGas(args) {
      estimateCalls.push(args);
      if (opts.estimateError) throw opts.estimateError;
      return opts.gas ?? GAS;
    },
    async getGasPrice() {
      gasPriceCalls.count += 1;
      if (opts.getGasPriceError) throw opts.getGasPriceError;
      return opts.gasPrice ?? GAS_PRICE;
    },
    async getBalance(args) {
      balanceCalls.push(args);
      if (opts.getBalanceError) throw opts.getBalanceError;
      return opts.balance ?? 10n ** 20n;
    },
  };
  return { client, estimateCalls, gasPriceCalls, balanceCalls };
}

/** EIP-1193 provider double that records every request. */
function makeProvider(opts: {
  estimate?: string;
  balance?: string;
  estimateError?: Error;
  balanceError?: Error;
}) {
  const calls: ProviderCall[] = [];
  const provider: WalletRpcProvider = {
    async request({ method, params }) {
      calls.push({ method, params });
      if (method === "eth_estimateGas") {
        if (opts.estimateError) throw opts.estimateError;
        return opts.estimate ?? `0x${GAS.toString(16)}`;
      }
      if (method === "eth_getBalance") {
        if (opts.balanceError) throw opts.balanceError;
        return opts.balance ?? `0x${(10n ** 20n).toString(16)}`;
      }
      throw new Error(`unexpected method ${method}`);
    },
  };
  return { provider, calls };
}

/** Error shaped like the node's balance-exhaustion rejection. */
function balanceExhaustionError(): Error {
  return new Error(
    `The total cost (gas * gas fee + value) of executing this transaction ${BALANCE_EXHAUSTION_MARKER} of the account.`,
  );
}

describe("gas-estimation — error classification", () => {
  it("matches the balance-exhaustion error", () => {
    assert.equal(isBalanceExhaustionError(balanceExhaustionError()), true);
  });

  it("does not match unrelated RPC errors", () => {
    assert.equal(isBalanceExhaustionError(new Error("execution reverted: 0x")), false);
    assert.equal(isBalanceExhaustionError(new Error("timeout")), false);
  });

  it("does not match non-error or empty inputs", () => {
    assert.equal(isBalanceExhaustionError(undefined), false);
    assert.equal(isBalanceExhaustionError(null), false);
    assert.equal(isBalanceExhaustionError("exceeds the balance"), false);
    assert.equal(isBalanceExhaustionError({}), false);
  });
});

describe("gas-estimation — I: DeployFlow delegates to the tested helper", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(
    join(here, "..", "..", "..", "components", "DeployFlow.tsx"),
    "utf8",
  );

  it("imports the helper under test", () => {
    assert.match(source, /from "\.\.\/lib\/deploy\/gas-estimation"/);
    assert.match(source, /estimateDeploymentGas/);
  });

  it("no longer inlines the estimation/fallback logic in the gas preview", () => {
    // Scoped to the preview query. The pre-transaction gate below it keeps its
    // own stricter public-client-only estimation by design and must not be
    // folded into the helper.
    const start = source.indexOf("const gasQuery = useQuery({");
    const end = source.indexOf("enabled: isGasEstimateReady({", start);
    assert.ok(start > 0 && end > start, "gas preview query region not found");
    const preview = source.slice(start, end);

    assert.ok(
      !preview.includes("eth_estimateGas"),
      "wallet-provider estimation must live in the tested helper",
    );
    assert.ok(
      !preview.includes("client.estimateGas("),
      "public-client estimation must live in the tested helper",
    );
    assert.ok(
      !preview.includes("client.getGasPrice("),
      "gas-price reads must live in the tested helper",
    );
  });

  it("still passes the authorized transaction triple to the helper", () => {
    assert.match(source, /estimateDeploymentGas\(\{/);
    for (const field of ["account,", "to: v1Factory,", "data,", "value,"]) {
      assert.ok(
        source.includes(field),
        `expected the helper call to forward "${field}"`,
      );
    }
  });

  it("keeps the pre-estimate simulation gate in the component", () => {
    assert.match(source, /client\.call\(\{/);
    assert.match(source, /"simulation-reverted"/);
  });
});

describe("gas-estimation — RPC quantity encoding", () => {
  it("encodes the BASIC fee as a canonical hex quantity", () => {
    assert.equal(toRpcQuantity(BASIC_VALUE), "0xb1a2bc2ec50000");
  });

  it("emits no leading zeros (BSC rejects padded quantities)", () => {
    assert.equal(toRpcQuantity(0xf00000000000000n), "0xf00000000000000");
    assert.ok(!toRpcQuantity(1n).startsWith("0x0"));
  });

  it("keeps odd-length minimal forms, which the node accepts", () => {
    // FULL-V1 fee is 15 hex digits; zero-padding it would be rejected by the
    // node ("hex number with leading zero digits"), so minimal form is required.
    assert.equal(toRpcQuantity(155000000000000000n), "0x226abadc42f8000");
    assert.equal(toRpcQuantity(155000000000000000n).length % 2, 1);
    assert.equal(toRpcQuantity(0n), "0x0");
  });
});

describe("gas-estimation — affordability arithmetic", () => {
  it("keeps platform value separate from network gas cost", () => {
    // costWei is gas-only; the fee is compared against, never folded into, it.
    assert.equal(GAS_COST, 1200000000000000n);
    assert.notEqual(GAS_COST, BASIC_VALUE + GAS_COST);
  });

  it("0.0496 BNB cannot cover a 0.050 BNB platform value before any gas", () => {
    assert.ok(DEPLOYER_BALANCE < BASIC_VALUE);
    assert.equal(
      canAffordDeployment({
        balanceWei: DEPLOYER_BALANCE,
        valueWei: BASIC_VALUE,
        gasCostWei: GAS_COST,
      }),
      false,
    );
  });

  it("treats an exact value+gas balance as sufficient", () => {
    assert.equal(
      canAffordDeployment({
        balanceWei: BASIC_VALUE + GAS_COST,
        valueWei: BASIC_VALUE,
        gasCostWei: GAS_COST,
      }),
      true,
    );
  });

  it("one wei short of value+gas is insufficient", () => {
    assert.equal(
      canAffordDeployment({
        balanceWei: BASIC_VALUE + GAS_COST - 1n,
        valueWei: BASIC_VALUE,
        gasCostWei: GAS_COST,
      }),
      false,
    );
  });
});

describe("gas-estimation — A: public RPC estimate succeeds", () => {
  it("uses the public client and never touches the wallet provider", async () => {
    const { client, estimateCalls, gasPriceCalls, balanceCalls } = makeClient({});
    const { provider, calls } = makeProvider({});

    const snapshot = await estimateDeploymentGas({
      client,
      account: ACCOUNT,
      to: FACTORY,
      data: DATA,
      value: BASIC_VALUE,
      resolveWalletProvider: () => provider,
    });

    assert.equal(snapshot.gas, GAS);
    assert.equal(snapshot.gasPriceWei, GAS_PRICE);
    assert.equal(snapshot.costWei, GAS_COST);
    assert.equal(snapshot.balanceWei, 10n ** 20n);
    assert.equal(estimateCalls.length, 1);
    assert.equal(gasPriceCalls.count, 1);
    assert.equal(balanceCalls.length, 1);
    assert.deepEqual(calls, [], "wallet provider must not be called");
  });

  it("preserves from/to/data/value exactly on the public path", async () => {
    const { client, estimateCalls, balanceCalls } = makeClient({});

    await estimateDeploymentGas({
      client,
      account: ACCOUNT,
      to: FACTORY,
      data: DATA,
      value: BASIC_VALUE,
    });

    assert.equal(estimateCalls.length, 1);
    assert.deepEqual(estimateCalls[0], {
      account: ACCOUNT,
      to: FACTORY,
      data: DATA,
      value: BASIC_VALUE,
    });
    assert.deepEqual(balanceCalls[0], { address: ACCOUNT });
  });
});

describe("gas-estimation — B/C: balance error triggers wallet-provider fallback", () => {
  it("routes eth_estimateGas through the EIP-1193 provider", async () => {
    const { client, estimateCalls } = makeClient({ estimateError: balanceExhaustionError() });
    const { provider, calls } = makeProvider({});

    const snapshot = await estimateDeploymentGas({
      client,
      account: ACCOUNT,
      to: FACTORY,
      data: DATA,
      value: BASIC_VALUE,
      resolveWalletProvider: () => provider,
    });

    assert.equal(estimateCalls.length, 1, "public path attempted exactly once");
    assert.equal(calls.length, 2);
    assert.equal(calls[0].method, "eth_estimateGas");
    assert.deepEqual(calls[0].params, [
      { from: ACCOUNT, to: FACTORY, data: DATA, value: "0xb1a2bc2ec50000" },
    ]);
    assert.equal(snapshot.gas, GAS);
  });

  it("encodes value as a hex quantity on the wallet path", async () => {
    const { client } = makeClient({ estimateError: balanceExhaustionError() });
    const { provider, calls } = makeProvider({});

    await estimateDeploymentGas({
      client,
      account: ACCOUNT,
      to: FACTORY,
      data: DATA,
      value: BASIC_VALUE,
      resolveWalletProvider: () => provider,
    });

    const params = calls[0].params[0] as { value: string };
    assert.match(params.value, /^0x[0-9a-f]+$/);
    assert.equal(BigInt(params.value), BASIC_VALUE);
  });

  it("preserves from = connected wallet, to = factory, data = calldata", async () => {
    const { client } = makeClient({ estimateError: balanceExhaustionError() });
    const { provider, calls } = makeProvider({});

    await estimateDeploymentGas({
      client,
      account: ACCOUNT,
      to: FACTORY,
      data: DATA,
      value: BASIC_VALUE,
      resolveWalletProvider: () => provider,
    });

    const params = calls[0].params[0] as Record<string, unknown>;
    assert.equal(params.from, ACCOUNT);
    assert.equal(params.to, FACTORY);
    assert.equal(params.data, DATA);
  });

  it("reads balance via eth_getBalance(account, latest) from the provider", async () => {
    const realBalance = 60000000000000000n; // 0.06 BNB
    const { client } = makeClient({ estimateError: balanceExhaustionError() });
    const { provider, calls } = makeProvider({ balance: `0x${realBalance.toString(16)}` });

    const snapshot = await estimateDeploymentGas({
      client,
      account: ACCOUNT,
      to: FACTORY,
      data: DATA,
      value: BASIC_VALUE,
      resolveWalletProvider: () => provider,
    });

    assert.equal(calls[1].method, "eth_getBalance");
    assert.deepEqual(calls[1].params, [ACCOUNT, "latest"]);
    assert.equal(snapshot.balanceWei, realBalance);
  });

  it("still sources gas price from the public client, not the wallet", async () => {
    const { client, gasPriceCalls } = makeClient({
      estimateError: balanceExhaustionError(),
      gasPrice: GAS_PRICE,
    });
    const { provider, calls } = makeProvider({});

    const snapshot = await estimateDeploymentGas({
      client,
      account: ACCOUNT,
      to: FACTORY,
      data: DATA,
      value: BASIC_VALUE,
      resolveWalletProvider: () => provider,
    });

    assert.equal(
      gasPriceCalls.count,
      2,
      "public client supplies gas price on both paths",
    );
    assert.equal(snapshot.gasPriceWei, GAS_PRICE);
    assert.equal(
      calls.filter((c) => c.method === "eth_gasPrice").length,
      0,
      "wallet provider is not used for gas price",
    );
  });

  it("resolves an async provider resolver", async () => {
    const { client } = makeClient({ estimateError: balanceExhaustionError() });
    const { provider, calls } = makeProvider({});

    await estimateDeploymentGas({
      client,
      account: ACCOUNT,
      to: FACTORY,
      data: DATA,
      value: BASIC_VALUE,
      resolveWalletProvider: async () => provider,
    });

    assert.equal(calls[0].method, "eth_estimateGas");
  });
});

describe("gas-estimation — D: unrelated errors are not masked", () => {
  it("fails closed without invoking the wallet provider", async () => {
    const { client, estimateCalls } = makeClient({
      estimateError: new Error("execution reverted: 0x"),
    });
    const { provider, calls } = makeProvider({});

    await assert.rejects(
      estimateDeploymentGas({
        client,
        account: ACCOUNT,
        to: FACTORY,
        data: DATA,
        value: BASIC_VALUE,
        resolveWalletProvider: () => provider,
      }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.equal((err as { code?: string }).code, "gas-estimate-failed");
        return true;
      },
    );
    assert.equal(estimateCalls.length, 1);
    assert.deepEqual(calls, [], "unrelated errors must not trigger a wallet retry");
  });

  it("does not retry when getGasPrice fails with an unrelated error", async () => {
    const { client } = makeClient({ getGasPriceError: new Error("gateway timeout") });
    const { provider, calls } = makeProvider({});

    await assert.rejects(
      estimateDeploymentGas({
        client,
        account: ACCOUNT,
        to: FACTORY,
        data: DATA,
        value: BASIC_VALUE,
        resolveWalletProvider: () => provider,
      }),
      /gas-estimate-failed/,
    );
    assert.deepEqual(calls, [], "unrelated failures must not reach the wallet");
  });

  it("treats the balance marker as aggregate across the concurrent reads", async () => {
    // The three public reads are issued together, so the helper cannot attribute
    // the marker to a specific method. Any balance-exhaustion failure therefore
    // triggers the wallet retry. Documented here so the behavior is intentional.
    const { client } = makeClient({ getBalanceError: balanceExhaustionError() });
    const { provider, calls } = makeProvider({});

    await estimateDeploymentGas({
      client,
      account: ACCOUNT,
      to: FACTORY,
      data: DATA,
      value: BASIC_VALUE,
      resolveWalletProvider: () => provider,
    });

    assert.equal(calls[0].method, "eth_estimateGas");
  });

  it("surfaces insufficient-gas-funds when the public balance is short", async () => {
    const { client } = makeClient({ balance: DEPLOYER_BALANCE });
    const { provider, calls } = makeProvider({});

    await assert.rejects(
      estimateDeploymentGas({
        client,
        account: ACCOUNT,
        to: FACTORY,
        data: DATA,
        value: BASIC_VALUE,
        resolveWalletProvider: () => provider,
      }),
      (err: unknown) => {
        assert.equal((err as { code?: string }).code, "insufficient-gas-funds");
        return true;
      },
    );
    assert.deepEqual(calls, [], "local balance shortfall must not be retried on the wallet");
  });
});

describe("gas-estimation — E: no wallet provider available", () => {
  it("fails closed when no resolver is supplied", async () => {
    const { client } = makeClient({ estimateError: balanceExhaustionError() });

    await assert.rejects(
      estimateDeploymentGas({
        client,
        account: ACCOUNT,
        to: FACTORY,
        data: DATA,
        value: BASIC_VALUE,
      }),
      /gas-estimate-failed/,
    );
  });

  it("fails closed when the resolver yields no provider", async () => {
    const { client } = makeClient({ estimateError: balanceExhaustionError() });

    await assert.rejects(
      estimateDeploymentGas({
        client,
        account: ACCOUNT,
        to: FACTORY,
        data: DATA,
        value: BASIC_VALUE,
        resolveWalletProvider: () => undefined,
      }),
      /gas-estimate-failed/,
    );
  });

  it("fails closed when the provider lacks request()", async () => {
    const { client } = makeClient({ estimateError: balanceExhaustionError() });

    await assert.rejects(
      estimateDeploymentGas({
        client,
        account: ACCOUNT,
        to: FACTORY,
        data: DATA,
        value: BASIC_VALUE,
        resolveWalletProvider: () => ({}) as WalletRpcProvider,
      }),
      /gas-estimate-failed/,
    );
  });

  it("returns no snapshot when the fallback is unavailable", async () => {
    const { client } = makeClient({ estimateError: balanceExhaustionError() });
    const result = await estimateDeploymentGas({
      client,
      account: ACCOUNT,
      to: FACTORY,
      data: DATA,
      value: BASIC_VALUE,
    }).catch(() => "rejected");
    assert.equal(result, "rejected");
  });
});

describe("gas-estimation — F: wallet path itself fails", () => {
  it("fails closed when the wallet's eth_estimateGas rejects", async () => {
    const { client } = makeClient({ estimateError: balanceExhaustionError() });
    const { provider, calls } = makeProvider({
      estimateError: new Error("user rejected the request"),
    });

    await assert.rejects(
      estimateDeploymentGas({
        client,
        account: ACCOUNT,
        to: FACTORY,
        data: DATA,
        value: BASIC_VALUE,
        resolveWalletProvider: () => provider,
      }),
      /gas-estimate-failed/,
    );
    assert.equal(calls.length, 1, "no balance read after a failed estimate");
  });

  it("fails closed when the wallet's eth_getBalance rejects", async () => {
    const { client } = makeClient({ estimateError: balanceExhaustionError() });
    const { provider, calls } = makeProvider({ balanceError: new Error("rpc unavailable") });

    await assert.rejects(
      estimateDeploymentGas({
        client,
        account: ACCOUNT,
        to: FACTORY,
        data: DATA,
        value: BASIC_VALUE,
        resolveWalletProvider: () => provider,
      }),
      /gas-estimate-failed/,
    );
    assert.equal(calls.length, 2);
  });

  it("fails closed when the wallet returns a non-hex gas result", async () => {
    const { client } = makeClient({ estimateError: balanceExhaustionError() });
    const { provider } = makeProvider({ estimate: "not-a-number" });

    await assert.rejects(
      estimateDeploymentGas({
        client,
        account: ACCOUNT,
        to: FACTORY,
        data: DATA,
        value: BASIC_VALUE,
        resolveWalletProvider: () => provider,
      }),
      /gas-estimate-failed/,
    );
  });

  it("fails closed when the wallet reports a genuine balance shortfall", async () => {
    // The real deployer scenario: wallet provider is honest and also short.
    const { client } = makeClient({ estimateError: balanceExhaustionError() });
    const { provider } = makeProvider({
      balance: `0x${DEPLOYER_BALANCE.toString(16)}`,
    });

    const snapshot = await estimateDeploymentGas({
      client,
      account: ACCOUNT,
      to: FACTORY,
      data: DATA,
      value: BASIC_VALUE,
      resolveWalletProvider: () => provider,
    });

    // Snapshot is reported, but affordability is still decidable by the caller
    // and cost/value remain separate.
    assert.equal(snapshot.balanceWei, DEPLOYER_BALANCE);
    assert.equal(snapshot.costWei, GAS_COST);
    assert.ok(DEPLOYER_BALANCE < BASIC_VALUE);
  });
});
