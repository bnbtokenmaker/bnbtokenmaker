import { expect } from "chai";
import hre from "hardhat";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseUnits } from "viem";

export const SUPPLY_1M = parseUnits("1000000", 18);

/** Full production TokenConfig; override per test. Amounts are base units. */
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
    buyTaxBps: 0,
    sellTaxBps: 0,
    marketingWallet: "0x0000000000000000000000000000000000000000",
    marketingShareBps: 0,
    liquidityShareBps: 0,
    autoLiquidityEnabled: false,
    swapThreshold: 0n,
    antiBotEnabled: false,
    snipeBlocks: 0n,
    maxSupply: 0n,
    ...overrides,
  };
}

export async function accounts() {
  const clients = await hre.viem.getWalletClients();
  const [owner, alice, bob, carol] = clients;
  return { clients, owner, alice, bob, carol };
}

type LinkRefs = Record<
  string,
  Record<string, Array<{ start: number; length: number }>>
>;

function artifact(contract: string, file?: string): {
  abi: readonly unknown[];
  bytecode: `0x${string}`;
  deployedBytecode: `0x${string}`;
  linkReferences: LinkRefs;
} {
  const source = file ?? contract;
  return JSON.parse(
    readFileSync(
      join(
        process.cwd(),
        `contracts/.artifacts/contracts/${source}.sol/${contract}.json`
      ),
      "utf8"
    )
  );
}

/** Patches SwapLib link placeholders with the deployed library address. */
export function linkSwapLib(bytecode: `0x${string}`, linkReferences: LinkRefs, library: `0x${string}`) {
  let code = bytecode.replace(/^0x/, "");
  const address = library.toLowerCase().replace(/^0x/, "");
  let linked = 0;
  for (const fileRefs of Object.values(linkReferences ?? {})) {
    for (const slots of Object.values(fileRefs)) {
      for (const slot of slots) {
        const at = slot.start * 2;
        const len = slot.length * 2;
        code = code.slice(0, at) + address + code.slice(at + len);
        linked++;
      }
    }
  }
  if (linked === 0) throw new Error("no library slots linked");
  return `0x${code}` as `0x${string}`;
}

let cachedLib: { chainId: number; address: `0x${string}` } | null = null;

/** Deploys SwapLib once per chain (library-first ceremony). Re-deploys after
 *  a chain reset (e.g. fork tests restore the ephemeral chain afterwards). */
export async function deploySwapLib(): Promise<`0x${string}`> {
  const publicClient = await hre.viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  if (cachedLib && cachedLib.chainId === chainId) {
    const code = await publicClient.getBytecode({ address: cachedLib.address });
    if (code && code !== "0x") return cachedLib.address;
    cachedLib = null;
  }
  const clients = await hre.viem.getWalletClients();
  const lib = artifact("SwapLib");
  const hash = await clients[0].deployContract({
    abi: lib.abi,
    bytecode: lib.bytecode,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  expect(receipt.status).to.equal("success");
  cachedLib = { chainId, address: receipt.contractAddress as `0x${string}` };
  return cachedLib.address;
}

export async function deployToken(config: ReturnType<typeof baseConfig>) {
  const lib = await deploySwapLib();
  const token = artifact("BNBTokenMakerToken");
  const clients = await hre.viem.getWalletClients();
  const hash = await clients[0].deployContract({
    abi: token.abi,
    bytecode: linkSwapLib(token.bytecode, token.linkReferences, lib),
    args: [config],
  });
  const publicClient = await hre.viem.getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  expect(receipt.status).to.equal("success");
  return hre.viem.getContractAt(
    "BNBTokenMakerToken",
    receipt.contractAddress as `0x${string}`
  );
}

export async function deployFactory(
  recipient: `0x${string}`,
  signer: `0x${string}`,
  maxFeeWei: bigint
) {
  const lib = await deploySwapLib();
  const factory = artifact("TokenFactory");
  const clients = await hre.viem.getWalletClients();
  const hash = await clients[0].deployContract({
    abi: factory.abi,
    bytecode: linkSwapLib(factory.bytecode, factory.linkReferences, lib),
    args: [recipient, signer, maxFeeWei],
  });
  const publicClient = await hre.viem.getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  expect(receipt.status).to.equal("success");
  return hre.viem.getContractAt(
    "TokenFactory",
    receipt.contractAddress as `0x${string}`
  );
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
