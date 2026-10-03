import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Tax-percentage UX + auto-liquidity copy tests. Users enter percentages;
 * contracts, drafts, validation and authorization keep integer basis
 * points. Copy must never instruct BPS entry or misstate LP custody.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CREATE_BUILDER = readFileSync(join(ROOT, "components/CreateBuilder.tsx"), "utf8");
const DEPLOY_FLOW = readFileSync(join(ROOT, "components/DeployFlow.tsx"), "utf8");

describe("tax percentage UX", () => {
  it("asks for percentages, not basis points", () => {
    assert.ok(CREATE_BUILDER.includes("Buy Tax (%)"));
    assert.ok(CREATE_BUILDER.includes("Sell Tax (%)"));
    assert.ok(!CREATE_BUILDER.includes("Buy tax (bps"));
    assert.ok(!CREATE_BUILDER.includes("Sell tax (bps"));
  });

  it("explains the percentage range in the helper copy", () => {
    assert.ok(CREATE_BUILDER.includes("0 to 10"));
    assert.ok(!/Maximum 1000 bps \(10%\) per side/.test(CREATE_BUILDER));
  });

  it("review screen displays percentages, not raw bps", () => {
    assert.ok(DEPLOY_FLOW.includes("bpsToPercentString(buyTaxBps)}%"));
    assert.ok(DEPLOY_FLOW.includes("bpsToPercentString(sellTaxBps)}%"));
    assert.ok(!DEPLOY_FLOW.includes("buyTaxBps} bps"));
  });

  it("keeps internal state in integer BPS strings", () => {
    // Draft restore defaults and state setters still carry BPS strings,
    // so drafts, validation and the authorize payload are unchanged.
    assert.ok(CREATE_BUILDER.includes("onBpsChange={setBuyTax}"));
    assert.ok(CREATE_BUILDER.includes("onBpsChange={setSellTax}"));
  });
});

describe("auto-liquidity copy", () => {
  it("states LP goes to the burn address with no platform custody", () => {
    assert.ok(CREATE_BUILDER.includes("burn address"));
    assert.ok(CREATE_BUILDER.includes("neither you nor the platform"));
  });

  it("never claims the platform receives LP", () => {
    assert.ok(!CREATE_BUILDER.includes("platform receives LP"));
    assert.ok(!CREATE_BUILDER.includes("platform will receive"));
    assert.ok(!CREATE_BUILDER.includes("platform gets"));
  });

  it("never claims burned LP is recoverable", () => {
    // False recoverability claims only ("LP is never recoverable" is a
    // correct pre-existing statement and must keep passing).
    assert.ok(!CREATE_BUILDER.includes("can be recovered"));
    assert.ok(!CREATE_BUILDER.includes("recoverable by"));
    assert.ok(!CREATE_BUILDER.includes("retrievable"));
    assert.ok(!CREATE_BUILDER.includes("withdraw LP"));
  });

  it("covers threshold, pair-only accrual and swap failure safety", () => {
    assert.ok(CREATE_BUILDER.includes("swap threshold"));
    assert.ok(CREATE_BUILDER.includes("liquidity-pair trades"));
    assert.ok(CREATE_BUILDER.includes("do not block normal transfers"));
    assert.ok(CREATE_BUILDER.includes("marketing wallet"));
  });
});
