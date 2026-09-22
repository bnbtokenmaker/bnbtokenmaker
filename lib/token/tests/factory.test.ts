import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeAbiParameters, keccak256, pad, stringToHex } from "viem";

import {
  explorerTokenUrl,
  factoryAddress,
  parseTokenCreatedLog,
} from "../factory";

const TOKEN = "0x1111111111111111111111111111111111111111";
const CREATOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function makeLog() {
  const topic0 = keccak256(
    stringToHex(
      "TokenCreated(address,address,address,string,string,uint8,uint256,uint256)"
    )
  );
  const data = encodeAbiParameters(
    [
      { type: "string" },
      { type: "string" },
      { type: "uint8" },
      { type: "uint256" },
      { type: "uint256" },
    ],
    ["Test Token", "TST", 18, 1000000n * 10n ** 18n, 43n]
  );
  return {
    topics: [topic0, pad(TOKEN), pad(CREATOR), pad(CREATOR)] as [
      `0x${string}`,
      ...`0x${string}`[],
    ],
    data,
  };
}

describe("factory boundary", () => {
  it("round-trips a TokenCreated log", () => {
    const parsed = parseTokenCreatedLog(makeLog());
    assert.ok(parsed);
    assert.equal(parsed.token.toLowerCase(), TOKEN.toLowerCase());
    assert.equal(parsed.creator.toLowerCase(), CREATOR.toLowerCase());
    assert.equal(parsed.owner.toLowerCase(), CREATOR.toLowerCase());
    assert.equal(parsed.name, "Test Token");
    assert.equal(parsed.symbol, "TST");
    assert.equal(parsed.decimals, 18);
    assert.equal(parsed.initialSupply, 1000000n * 10n ** 18n);
    assert.equal(parsed.features, 43n);
    assert.deepEqual(parsed.featureFlags, {
      burn: true, mint: true, pause: false, maxTx: true,
      maxWallet: false, blacklist: true, whitelist: false,
    });
  });

  it("returns null for unrelated logs", () => {
    assert.equal(
      parseTokenCreatedLog({
        topics: ["0x1234567890123456789012345678901234567890123456789012345678901234"],
        data: "0x",
      }),
      null
    );
  });

  it("factory address is null until a real deployment is registered", () => {
    // No env address set in test env -> null (refuses to build tx).
    assert.equal(factoryAddress(97), null);
    assert.equal(factoryAddress(56), null);
    assert.equal(factoryAddress(null), null);
  });

  it("explorer links only for testnet tokens", () => {
    const url = explorerTokenUrl(97, TOKEN);
    assert.equal(url, `https://testnet.bscscan.com/token/${TOKEN}`);
    assert.equal(explorerTokenUrl(56, TOKEN), null);
    assert.equal(explorerTokenUrl(97, "0x123"), null);
  });
});
