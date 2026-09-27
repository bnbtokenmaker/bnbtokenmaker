import { expect } from "chai";
import hre from "hardhat";

/**
 * Battery I — ABI privilege allowlist. Fails if future production changes
 * accidentally introduce privileged mutators outside the approved surface.
 * Standard ERC-20 mutators (transfer/approve/transferFrom) are always allowed.
 * Views are unrestricted (the management UI needs read access).
 */
const TOKEN_WRITERS = [
  "approve",
  "burn",
  "burnFrom",
  "enableTrading",
  "mint",
  "pause",
  "renounceOwnership",
  "setAMMPair",
  "setBlacklisted",
  "setFeeExempt",
  "setMarketingWallet",
  "setSwapBackEnabled",
  "setWhitelistEnforced",
  "setWhitelisted",
  "transfer",
  "transferFrom",
  "transferOwnership",
  "unpause",
].sort();

const FACTORY_WRITERS = [
  "createToken",
  "renounceOwnership",
  "setSigner",
  "transferOwnership",
].sort();

// Explicitly FORBIDDEN anywhere in the token ABI (platform backdoors,
// upgradeability, hidden sinks, permit-family).
const TOKEN_FORBIDDEN = [
  "permit",
  "nonces",
  "DOMAIN_SEPARATOR",
  "eip712Domain",
  "upgrade",
  "upgradeTo",
  "initialize",
  "setOwner",
  "setFee",
  "setTax",
  "withdraw",
  "rescue",
  "sweep",
];

describe("ABI privilege allowlist", () => {
  it("token writer set is exactly the approved management surface", async () => {
    const token = await hre.viem.getContractAt(
      "BNBTokenMakerToken",
      "0x0000000000000000000000000000000000000001"
    );
    const writers = token.abi
      .filter((e) => (e as { type: string }).type === "function")
      .filter(
        (e) =>
          (e as { stateMutability: string }).stateMutability !== "view" &&
          (e as { stateMutability: string }).stateMutability !== "pure"
      )
      .map((e) => (e as { name: string }).name)
      .sort();
    expect(writers).to.deep.equal(TOKEN_WRITERS);
    const names = token.abi.map((e) => (e as { name?: string }).name ?? "");
    for (const forbidden of TOKEN_FORBIDDEN) {
      expect(names).to.not.include(forbidden);
    }
  });

  it("factory writer set is exactly createToken + signer/ownership lifecycle", async () => {
    const factory = await hre.viem.getContractAt(
      "TokenFactory",
      "0x0000000000000000000000000000000000000001"
    );
    const writers = factory.abi
      .filter((e) => (e as { type: string }).type === "function")
      .filter(
        (e) =>
          (e as { stateMutability: string }).stateMutability !== "view" &&
          (e as { stateMutability: string }).stateMutability !== "pure"
      )
      .map((e) => (e as { name: string }).name)
      .sort();
    expect(writers).to.deep.equal(FACTORY_WRITERS);
  });
});
