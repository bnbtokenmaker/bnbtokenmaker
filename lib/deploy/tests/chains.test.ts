import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BSC_MAINNET_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
  isSupportedV1ChainId,
  v1ChainDescriptor,
  v1ExplorerTxUrl,
  v1ExplorerAddressUrl,
  v1ExplorerTokenUrl,
} from "../chains";

describe("chains", () => {
  it("supports chain 56 (BSC Mainnet) and 97 (BSC Testnet)", () => {
    assert.equal(isSupportedV1ChainId(BSC_MAINNET_CHAIN_ID), true);
    assert.equal(isSupportedV1ChainId(BSC_TESTNET_CHAIN_ID), true);
  });

  it("rejects unsupported chains", () => {
    assert.equal(isSupportedV1ChainId(1), false);
    assert.equal(isSupportedV1ChainId(137), false);
    assert.equal(isSupportedV1ChainId(0), false);
    assert.equal(isSupportedV1ChainId(null), false);
    assert.equal(isSupportedV1ChainId(undefined), false);
  });

  it("returns correct chain descriptors", () => {
    const mainnet = v1ChainDescriptor(BSC_MAINNET_CHAIN_ID);
    assert.equal(mainnet?.name, "BNB Smart Chain");
    assert.equal(mainnet?.isTestnet, false);
    const testnet = v1ChainDescriptor(BSC_TESTNET_CHAIN_ID);
    assert.equal(testnet?.name, "BNB Smart Chain Testnet");
    assert.equal(testnet?.isTestnet, true);
  });

  it("returns null for unsupported chain descriptors", () => {
    assert.equal(v1ChainDescriptor(1), null);
    assert.equal(v1ChainDescriptor(null), null);
  });

  it("builds correct explorer URLs for mainnet", () => {
    const txUrl = v1ExplorerTxUrl(BSC_MAINNET_CHAIN_ID, "0x" + "a".repeat(64));
    assert.equal(txUrl, "https://bscscan.com/tx/0x" + "a".repeat(64));
    const addrUrl = v1ExplorerAddressUrl(BSC_MAINNET_CHAIN_ID, "0x" + "b".repeat(40));
    assert.equal(addrUrl, "https://bscscan.com/address/0x" + "b".repeat(40));
    const tokenUrl = v1ExplorerTokenUrl(BSC_MAINNET_CHAIN_ID, "0x" + "c".repeat(40));
    assert.equal(tokenUrl, "https://bscscan.com/token/0x" + "c".repeat(40));
  });

  it("builds correct explorer URLs for testnet", () => {
    const txUrl = v1ExplorerTxUrl(BSC_TESTNET_CHAIN_ID, "0x" + "a".repeat(64));
    assert.equal(txUrl, "https://testnet.bscscan.com/tx/0x" + "a".repeat(64));
    const tokenUrl = v1ExplorerTokenUrl(BSC_TESTNET_CHAIN_ID, "0x" + "c".repeat(40));
    assert.equal(tokenUrl, "https://testnet.bscscan.com/token/0x" + "c".repeat(40));
  });

  it("fails closed for unsupported chains and malformed explorer inputs", () => {
    assert.equal(v1ExplorerTxUrl(1, "0x" + "a".repeat(64)), null);
    assert.equal(v1ExplorerTxUrl(BSC_MAINNET_CHAIN_ID, "0x123"), null);
    assert.equal(v1ExplorerTokenUrl(137, "0x" + "c".repeat(40)), null);
    assert.equal(v1ExplorerTokenUrl(BSC_TESTNET_CHAIN_ID, "not-an-address"), null);
  });
});
