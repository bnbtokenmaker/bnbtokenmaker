import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PHASE6B_CHAIN_ID,
  PHASE6B_PLATFORM_FEE_WEI,
  assertPhase6bZeroFee,
} from "../phase6b";
import { DEPLOY_TX_VALUE_HEX } from "../tx";
import {
  TESTNET_PLATFORM_FEE_WEI,
  parseQuotePayload,
} from "../quote-client";
import { quoteFromSnapshot } from "../../pricing/server/quote";
import type { AuthoritativeSnapshot } from "../../pricing/server/store";
import { devPricingConfig } from "../../pricing/server/dev-values";

const HOUR = 60 * 60 * 1000;
const NOW = new Date("2026-09-23T12:00:00.000Z");

describe("phase 7C testnet safety — chain 97 stays fee-free", () => {
  it("transaction fee constants remain zero regardless of commercial pricing", () => {
    assert.equal(PHASE6B_CHAIN_ID, 97);
    assert.equal(PHASE6B_PLATFORM_FEE_WEI, 0n);
    assert.equal(TESTNET_PLATFORM_FEE_WEI, 0n);
    assert.equal(DEPLOY_TX_VALUE_HEX, "0x0");
    assert.doesNotThrow(() => assertPhase6bZeroFee(0n));
    assert.throws(() => assertPhase6bZeroFee(1n), Error);
  });

  it("a commercial DB quote (even at the 90% cap) never changes the tx value", () => {
    // Simulate the richest commercial quote: all features + max campaign.
    const snapshot: AuthoritativeSnapshot = {
      config: { ...devPricingConfig(), version: "v9" },
      version: "v9",
      campaign: {
        id: 1,
        name: "Launch discount",
        code: null,
        basisPoints: 9000,
        startsAt: new Date(NOW.getTime() - HOUR),
        endsAt: new Date(NOW.getTime() + HOUR),
      },
      fallback: false,
    };
    const result = quoteFromSnapshot(snapshot, [
      "burn",
      "mint",
      "pause",
      "maxTx",
      "maxWallet",
      "blacklist",
    ]);
    // Commercial reference price is real money...
    assert.ok(result.totalPlatformFeeWei >= 0n);
    // ...but the chain-97 transaction value stays exactly zero.
    assert.equal(PHASE6B_PLATFORM_FEE_WEI, 0n);
    assert.equal(DEPLOY_TX_VALUE_HEX, "0x0");
  });

  it("quote payload parser keeps campaign display tolerant and money strict", () => {
    const good = {
      quote: {
        pricingVersion: "v9",
        currency: "BNB",
        basePriceWei: "50000000000000000",
        basePriceBnb: "0.050",
        lineItems: [{ feature: "mint", priceWei: "10000000000000000" }],
        selectedFeatures: ["mint"],
        subtotalWei: "60000000000000000",
        discountWei: "6000000000000000",
        totalWei: "54000000000000000",
        totalBnb: "0.054",
        campaign: {
          referenceWei: "60000000000000000",
          effectiveWei: "54000000000000000",
          discountWei: "6000000000000000",
          id: 3,
          name: "Launch week",
          code: "LAUNCH10",
          discountBasisPoints: 1000,
        },
      },
    };
    const parsed = parseQuotePayload(good);
    assert.ok(parsed);
    assert.equal(parsed?.campaign?.name, "Launch week");
    assert.equal(parsed?.totalWei, "54000000000000000");

    // Malformed campaign block is dropped safely; money still parses.
    const brokenCampaign = {
      quote: { ...(good.quote as object), campaign: { nonsense: true } },
    };
    const tolerated = parseQuotePayload(brokenCampaign);
    assert.ok(tolerated);
    assert.equal(tolerated?.campaign, null);

    // Malformed money still fails closed.
    const brokenMoney = {
      quote: { ...(good.quote as object), totalWei: "0.054" },
    };
    assert.equal(parseQuotePayload(brokenMoney), null);
  });
});
