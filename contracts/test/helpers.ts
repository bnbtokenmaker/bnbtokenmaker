import { expect } from "chai";
import hre from "hardhat";
import { parseUnits } from "viem";

export const SUPPLY_1M = parseUnits("1000000", 18);

/** Base token config; override per test. Amounts are base units. */
export function baseConfig(
  owner: `0x${string}`,
  overrides: Record<string, unknown> = {}
) {
  return {
    name: "Test Token",
    symbol: "TST",
    decimals: 18,
    initialSupply: SUPPLY_1M,
    owner,
    burnable: false,
    mintable: false,
    pausable: false,
    maxTxAmount: 0n,
    maxWalletAmount: 0n,
    blacklistEnabled: false,
    whitelistEnabled: false,
    ...overrides,
  };
}

export async function accounts() {
  const clients = await hre.viem.getWalletClients();
  const [owner, alice, bob, carol] = clients;
  return { clients, owner, alice, bob, carol };
}

export async function deployToken(config: ReturnType<typeof baseConfig>) {
  return hre.viem.deployContract("BNBTokenMakerToken", [config]);
}

/** Expect a viem write to revert; match a fragment of the error text. */export async function expectRevert(
  promise: Promise<unknown>,
  fragment: string | RegExp
) {
  try {
    await promise;
  } catch (error) {
    const text =
      error instanceof Error ? `${error.message} ${"shortMessage" in error ? String((error as { shortMessage: unknown }).shortMessage) : ""}` : String(error);
    expect(text).to.match(
      typeof fragment === "string"
        ? new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        : fragment
    );
    return;
  }
  expect.fail("expected transaction to revert, but it succeeded");
}

describe("placeholder", () => {
  it("helpers load", () => {
    expect(SUPPLY_1M).to.equal(1000000n * 10n ** 18n);
  });
});

/** Act as another account against an already-deployed token. */
export type WalletLike = { account: { address: `0x${string}` } };
export function tokenAs(address: `0x${string}`, wallet: WalletLike) {
  return hre.viem.getContractAt("BNBTokenMakerToken", address, {
    client: { wallet: wallet as never },
  });
}
