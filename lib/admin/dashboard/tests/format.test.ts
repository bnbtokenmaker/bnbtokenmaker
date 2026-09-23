import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  abbreviateAddress,
  abbreviateTxHash,
  asCanonicalUintString,
  chainLabel,
  enabledFeatureIds,
  explorerAddressUrl,
  explorerTxUrl,
  formatBaseUnitsToHuman,
  formatUtc,
  formatWeiTextToBnb,
  normalizeFeatureDisplay,
  parseFeeSum,
} from "../format";

const ADDRESS = "0x5357b13C30967197CF38b5FfAE2088417c562187";
const TX =
  "0xaf52ed25e9ad10c0d22455c1bcda4bf0b095eadeceab9debf4d2e0c93203a45c";

describe("admin dashboard — display formatting", () => {
  it("abbreviates for display while callers keep full values", () => {
    assert.equal(abbreviateAddress(ADDRESS.toLowerCase()), "0x5357…2187");
    const short = abbreviateTxHash(TX.toLowerCase());
    assert.ok(short.startsWith("0xaf52ed25"));
    assert.ok(short.endsWith("3203a45c"));
    assert.ok(short.includes("…"));
  });

  it("formats wei TEXT to exact BNB without Number precision loss", () => {
    assert.equal(formatWeiTextToBnb("0"), "0");
    assert.equal(formatWeiTextToBnb("50000000000000000"), "0.05");
    assert.equal(formatWeiTextToBnb("1000000000000000000000000"), "1000000");
    // Beyond float precision: exact digits preserved.
    assert.equal(
      formatWeiTextToBnb("12345678901234567890123456789"),
      "12345678901.234567890123456789"
    );
    assert.equal(formatWeiTextToBnb("007"), null);
    assert.equal(formatWeiTextToBnb("1.5"), null);
    assert.equal(formatWeiTextToBnb(""), null);
    assert.equal(formatWeiTextToBnb(42), null);
    assert.equal(asCanonicalUintString("0"), "0");
    assert.equal(asCanonicalUintString("-1"), null);
  });

  it("parses fee SUM aggregates with bigint semantics", () => {
    assert.equal(parseFeeSum("0"), "0");
    assert.equal(parseFeeSum("150000000000000000"), "150000000000000000");
    assert.equal(parseFeeSum("0.0"), "0");
    assert.equal(parseFeeSum(null), "0");
    assert.equal(parseFeeSum(undefined), "0");
    assert.equal(parseFeeSum("not-a-number"), "0");
    assert.equal(parseFeeSum("1.5"), "0");
    assert.equal(parseFeeSum(42), "42");
  });

  it("formats base-unit supply to human amounts, bigint-safe", () => {
    assert.equal(
      formatBaseUnitsToHuman("1000000000000000000000000", 18),
      "1000000"
    );
    assert.equal(formatBaseUnitsToHuman("1500000", 6), "1.5");
    assert.equal(formatBaseUnitsToHuman("0", 18), "0");
    assert.equal(formatBaseUnitsToHuman("007", 18), null);
    assert.equal(formatBaseUnitsToHuman("100", 19), null);
    assert.equal(formatBaseUnitsToHuman("100", -1), null);
  });

  it("formats UTC timestamps deterministically", () => {
    assert.equal(
      formatUtc(new Date("2026-09-23T14:05:32.000Z")),
      "2026-09-23 14:05:32 UTC"
    );
  });

  it("labels chains and builds testnet explorer URLs", () => {
    assert.equal(chainLabel(97), "BSC Testnet");
    assert.equal(chainLabel(56), "Chain 56");
    const addr = ADDRESS.toLowerCase();
    assert.equal(
      explorerAddressUrl(97, addr),
      `https://testnet.bscscan.com/address/${addr}`
    );
    assert.equal(
      explorerTxUrl(97, TX.toLowerCase()),
      `https://testnet.bscscan.com/tx/${TX.toLowerCase()}`
    );
    assert.equal(explorerAddressUrl(97, "0x123"), null);
    assert.equal(explorerTxUrl(97, "0x123"), null);
    assert.equal(explorerTxUrl(12345, TX.toLowerCase()), null);
  });

  it("normalizes feature display independent of JSONB key order", () => {
    const ordered = {
      version: 1,
      burn: true,
      mint: false,
      pause: true,
      maxTx: false,
      maxWallet: false,
      blacklist: true,
      whitelist: false,
    };
    // Same facts, jsonb-normalized key order.
    const reordered = {
      blacklist: true,
      burn: true,
      maxTx: false,
      maxWallet: false,
      mint: false,
      pause: true,
      version: 1,
      whitelist: false,
    };
    const a = normalizeFeatureDisplay(ordered);
    const b = normalizeFeatureDisplay(reordered);
    assert.deepEqual(
      a.flags.map((f) => [f.id, f.enabled]),
      b.flags.map((f) => [f.id, f.enabled])
    );
    assert.deepEqual(enabledFeatureIds(ordered), ["burn", "pause", "blacklist"]);
    assert.equal(a.unknownVersion, false);
    assert.deepEqual(a.extra, []);
  });

  it("flags unknown feature versions without reinterpreting them", () => {
    const display = normalizeFeatureDisplay({
      version: 2,
      burn: true,
      futureFlag: true,
    });
    assert.equal(display.unknownVersion, true);
    assert.deepEqual(display.flags, []);
    assert.deepEqual(display.extra, [
      { key: "burn", raw: "true" },
      { key: "futureFlag", raw: "true" },
    ]);
    const missing = normalizeFeatureDisplay(null);
    assert.equal(missing.version, null);
    assert.equal(missing.unknownVersion, true);
  });
});
