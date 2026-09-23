import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  featureConfigFromBitmap,
  featureIdsFromConfig,
  isCanonicalUintString,
  parseFeatureConfig,
  parseRecordHint,
  RecordHintError,
  toCanonicalUintString,
} from "../validate";

const TX =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("deployments — record hint validation", () => {
  it("accepts a valid chain-97 hint and normalizes case", () => {
    const checksummed = "0x" + TX.slice(2).toUpperCase();
    const hint = parseRecordHint({ chainId: 97, txHash: checksummed });
    assert.equal(hint.chainId, 97);
    assert.equal(hint.txHash, TX);
  });

  it("rejects non-97 chains (mainnet stays out of the record path)", () => {
    assert.throws(() => parseRecordHint({ chainId: 56, txHash: TX }), (error) => {
      assert.ok(error instanceof RecordHintError);
      assert.equal(error.code, "unsupported-chain");
      return true;
    });
    assert.throws(() => parseRecordHint({ chainId: 1, txHash: TX }), (error) => {
      assert.ok(error instanceof RecordHintError);
      return true;
    });
  });

  it("rejects malformed tx hashes", () => {
    for (const bad of ["", "0x123", "not-a-hash", 123, null, "0x" + "zz".repeat(32)]) {
      assert.throws(
        () => parseRecordHint({ chainId: 97, txHash: bad }),
        (error) => {
          assert.ok(error instanceof RecordHintError);
          assert.equal(error.code, "invalid-tx-hash");
          return true;
        },
        `expected rejection for ${String(bad)}`
      );
    }
  });

  it("rejects smuggled client claims (no success/contract/fee fields exist)", () => {
    for (const body of [
      { chainId: 97, txHash: TX, success: true },
      { chainId: 97, txHash: TX, contractAddress: "0x" + "11".repeat(20) },
      { chainId: 97, txHash: TX, platformFee: "0" },
      { chainId: 97, txHash: TX, deployer: "0x" + "22".repeat(20) },
      { chainId: 97, txHash: TX, tokenName: "Fake" },
    ]) {
      assert.throws(() => parseRecordHint(body), (error) => {
        assert.ok(error instanceof RecordHintError);
        assert.equal(error.code, "invalid-request");
        return true;
      });
    }
  });

  it("rejects non-object bodies", () => {
    for (const bad of [null, [], "string", 42]) {
      assert.throws(() => parseRecordHint(bad), RecordHintError);
    }
  });
});

describe("deployments — canonical uint strings (no floating point)", () => {
  it("wei-scale values round-trip losslessly through bigint", () => {
    // Largest uint256 + a realistic supply: Number() would destroy these.
    const max = (1n << 256n) - 1n;
    assert.equal(BigInt(toCanonicalUintString(max)), max);
    const supply = 1_000_000n * 10n ** 18n;
    assert.equal(toCanonicalUintString(supply), "1000000000000000000000000");
    assert.equal(BigInt(toCanonicalUintString(supply)), supply);
    assert.equal(toCanonicalUintString(0n), "0");
  });

  it("accepts only canonical shapes", () => {
    assert.ok(isCanonicalUintString("0"));
    assert.ok(isCanonicalUintString("1000000000000000000000000"));
    assert.ok(!isCanonicalUintString("007"));
    assert.ok(!isCanonicalUintString("1.5"));
    assert.ok(!isCanonicalUintString("-1"));
    assert.ok(!isCanonicalUintString(""));
    assert.ok(!isCanonicalUintString(42));
  });
});

describe("deployments — versioned feature config", () => {
  it("derives v1 flags from an on-chain bitmap", () => {
    const config = featureConfigFromBitmap(43n);
    assert.deepEqual(config, {
      version: 1,
      burn: true,
      mint: true,
      pause: false,
      maxTx: true,
      maxWallet: false,
      blacklist: true,
      whitelist: false,
    });
  });

  it("round-trips through strict parsing; rejects unversioned/arbitrary JSON", () => {
    const config = featureConfigFromBitmap(0n);
    assert.deepEqual(parseFeatureConfig(JSON.parse(JSON.stringify(config))), config);
    assert.equal(parseFeatureConfig(null), null);
    assert.equal(parseFeatureConfig({}), null);
    assert.equal(parseFeatureConfig({ ...config, version: 2 }), null);
    assert.equal(parseFeatureConfig({ ...config, burn: "yes" }), null);
    // Unknown extra keys are tolerated (forward-compatible); wrong-typed
    // or missing known flags are not.
    assert.deepEqual(parseFeatureConfig({ ...config, extra: true }), config);
    assert.deepEqual(featureIdsFromConfig(featureConfigFromBitmap(43n)), [
      "burn",
      "mint",
      "maxTx",
      "blacklist",
    ]);
  });
});
