import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateTokenConfig } from "../../token/config";
import {
  DEPLOY_DRAFT_KEY,
  DEPLOY_DRAFT_VERSION,
  draftContainsSecrets,
  draftDomainValid,
  parseDeployDraft,
  type DeployDraftV1,
} from "../draft-transfer";

function goodDraft(): DeployDraftV1 {
  return {
    version: DEPLOY_DRAFT_VERSION,
    name: "Maker",
    symbol: "MAKER",
    decimals: "18",
    supply: "1,000,000",
    feats: {
      burn: false,
      mint: true,
      pause: false,
      maxTx: true,
      maxWallet: true,
      blacklist: false,
      whitelist: false,
    },
    maxTxPercent: "1",
    maxWalletPercent: "2",
    savedAt: 123,
  };
}

describe("deploy draft transfer — shape validation", () => {
  it("uses a namespaced versioned key", () => {
    assert.equal(DEPLOY_DRAFT_KEY, "btm-deploy-draft-v1");
    assert.equal(DEPLOY_DRAFT_VERSION, 1);
  });

  it("accepts a well-formed draft", () => {
    const parsed = parseDeployDraft(goodDraft());
    assert.ok(parsed);
    assert.equal(parsed.symbol, "MAKER");
  });

  it("fails closed on absent/malformed/stale drafts", () => {
    assert.equal(parseDeployDraft(null), null);
    assert.equal(parseDeployDraft(undefined), null);
    assert.equal(parseDeployDraft("nope"), null);
    assert.equal(parseDeployDraft([]), null);
    assert.equal(parseDeployDraft({ ...goodDraft(), version: 999 }), null);
    assert.equal(parseDeployDraft({ ...goodDraft(), version: 2 }), null);
    assert.equal(parseDeployDraft({ ...goodDraft(), name: 42 }), null);
    assert.equal(parseDeployDraft({ ...goodDraft(), feats: null }), null);
    assert.equal(
      parseDeployDraft({
        ...goodDraft(),
        feats: { ...goodDraft().feats, evil: true },
      }),
      null
    );
    assert.equal(
      parseDeployDraft({
        ...goodDraft(),
        feats: { burn: "yes" },
      }),
      null
    );
    assert.equal(parseDeployDraft({ ...goodDraft(), savedAt: Number.NaN }), null);
  });

  it("a parsed draft revalidates through the token domain rules", () => {
    const parsed = parseDeployDraft(goodDraft());
    assert.ok(parsed);
    const validated = validateTokenConfig({
      name: parsed.name,
      symbol: parsed.symbol,
      decimals: parsed.decimals,
      supplyHuman: parsed.supply,
      owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      features: { ...parsed.feats },
      maxTxPercent: parsed.maxTxPercent,
      maxWalletPercent: parsed.maxWalletPercent,
    });
    assert.equal(validated.symbol, "MAKER");
    // An invalid draft payload fails domain validation too (fail closed).
    assert.throws(() =>
      validateTokenConfig({
        name: "",
        symbol: "!!!",
        decimals: "99",
        supplyHuman: "0",
        owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        features: { ...parsed.feats },
        maxTxPercent: parsed.maxTxPercent,
        maxWalletPercent: parsed.maxWalletPercent,
      })
    );
  });
});

describe("deploy draft transfer — domain revalidation", () => {
  it("a clean draft is domain-valid for /deploy review", () => {
    assert.equal(draftDomainValid(goodDraft()), true);
  });

  it("tampered drafts fail domain validation (fail closed)", () => {
    assert.equal(draftDomainValid({ ...goodDraft(), name: "" }), false);
    assert.equal(draftDomainValid({ ...goodDraft(), symbol: "!!!" }), false);
    assert.equal(draftDomainValid({ ...goodDraft(), decimals: "99" }), false);
    assert.equal(draftDomainValid({ ...goodDraft(), supply: "0" }), false);
    assert.equal(
      draftDomainValid({
        ...goodDraft(),
        feats: { ...goodDraft().feats, blacklist: true, whitelist: true },
      }),
      false
    );
    assert.equal(draftDomainValid({ ...goodDraft(), maxTxPercent: "0" }), false);
  });
});

describe("deploy draft transfer — secret hygiene", () => {
  it("detects forbidden secret-shaped keys", () => {
    assert.ok(draftContainsSecrets({ privateKey: "0xabc" }));
    assert.ok(draftContainsSecrets({ nested: { seedPhrase: "x" } }));
    assert.ok(draftContainsSecrets({ Mnemonic: "x" }));
    assert.ok(draftContainsSecrets({ provider: {} }));
  });

  it("a clean draft carries no secret keys", () => {
    assert.equal(draftContainsSecrets(goodDraft()), false);
    assert.equal(draftContainsSecrets(null), false);
    assert.deepEqual(
      Object.keys(goodDraft()).sort(),
      [
        "feats",
        "maxTxPercent",
        "maxWalletPercent",
        "name",
        "decimals",
        "savedAt",
        "supply",
        "symbol",
        "version",
      ].sort()
    );
  });
});
