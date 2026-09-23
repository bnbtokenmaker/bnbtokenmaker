import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { CREATE_WEBSITE } from "../../lib/schema";
import { CreateBuilder } from "../../components/CreateBuilder";
import { NetState } from "../../components/wallet/NetState";
import { resolveDraft } from "../../lib/draft";
import type { DraftQuery } from "../../lib/draft";
import {
  getPricingStores,
  loadAuthoritativeSnapshot,
} from "../../lib/pricing/server/store";
import {
  quoteFromSnapshot,
  toQuoteDto,
} from "../../lib/pricing/server/quote";
import { PRESETS, selectedFeatureIds } from "../../lib/pricing/presets";
import { toPricingConfigDto, validateConfig } from "../../lib/pricing";

export const metadata: Metadata = {
  title: "Create BEP-20 Token — BNB Token Maker",
  description: "Create a BEP-20 token on BNB Smart Chain. Set the name, supply and controls, choose your features, connect your wallet and deploy — no code required.",
  alternates: { canonical: "https://bnbtokenmaker.com/create" },
  openGraph: {
    title: "Create BEP-20 Token — BNB Token Maker",
    description: "Create a BEP-20 token on BNB Smart Chain. Set the name, supply and controls, choose your features, connect your wallet and deploy — no code required.",
    url: "https://bnbtokenmaker.com/create",
    siteName: "BNB Token Maker",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Create BEP-20 Token — BNB Token Maker",
    description: "Create a BEP-20 token on BNB Smart Chain. Set the name, supply and controls, choose your features, connect your wallet and deploy — no code required.",
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<DraftQuery>;
}) {
  const requested = await searchParams;
  const initialDraft = resolveDraft(requested);

  // Optional ?campaign=CODE from operator-shared links. Passed through RAW
  // and untrusted: the configurator validates it through the authoritative
  // quote API exactly like a typed code. Only the code travels — never money.
  const rawCampaign = requested.campaign;
  const initialCampaignCode =
    typeof rawCampaign === "string"
      ? rawCampaign
      : Array.isArray(rawCampaign) && typeof rawCampaign[0] === "string"
        ? rawCampaign[0]
        : null;

  // Phase 7C: the configurator prices from the ACTIVE DB pricing version plus
  // the currently-applicable campaign (server time). Fail closed: without an
  // authoritative snapshot the page renders an unavailable state instead of
  // invented prices. (Outside production with no DATABASE_URL, an explicit
  // static development fallback keeps local work operable.)
  let snapshot;
  try {
    snapshot = await loadAuthoritativeSnapshot(getPricingStores(), {
      now: new Date(),
    });
  } catch {
    return (
      <>
        <JsonLd data={CREATE_WEBSITE} />
        <section className="app" id="top">
          <div className="container">
            <header className="app-head">
              <div className="app-head-row">
                <div className="app-head-copy">
                  <div className="kicker"><span className="dot"></span>Create BEP-20 Token</div>
                  <h1>Configure your token, then let your wallet ship it.</h1>
                </div>
              </div>
            </header>
            <div className="warn" role="alert">
              Pricing is temporarily unavailable. Please try again in a moment —
              no price is shown rather than a guessed one.
            </div>
          </div>
        </section>
      </>
    );
  }

  const configValidation = validateConfig(snapshot.config);
  if (!configValidation.ok) {
    throw new Error(
      `Invalid pricing config: ${configValidation.errors.map((error) => error.code).join(", ")}`
    );
  }
  const pricingConfigDto = toPricingConfigDto(snapshot.config);

  const campaignMeta = snapshot.campaign
    ? {
        id: snapshot.campaign.id,
        name: snapshot.campaign.name,
        code: snapshot.campaign.code,
        discountBasisPoints: snapshot.campaign.basisPoints,
      }
    : undefined;
  const serverQuote = toQuoteDto(
    quoteFromSnapshot(snapshot, selectedFeatureIds(PRESETS.standard)),
    campaignMeta
  );

  // Sanitized public campaign summary for the live estimate breakdown.
  // Display-only: the deploy flow re-quotes authoritatively server-side.
  const activeCampaign = snapshot.campaign
    ? {
        name: snapshot.campaign.name,
        code: snapshot.campaign.code,
        discountBasisPoints: snapshot.campaign.basisPoints,
        endsAt: snapshot.campaign.endsAt.toISOString(),
      }
    : null;

  return (
    <>
      <JsonLd data={CREATE_WEBSITE} />

 
  <section className="app" id="top">
    <div className="container">
      <header className="app-head">
        <div className="app-head-row">
          <div className="app-head-copy">
            <div className="kicker"><span className="dot"></span>Create BEP-20 Token</div>
            <h1>Configure your token, then let your wallet ship it.</h1>
            <p className="intro">Set the name, supply and controls, choose the features your project needs, and connect your wallet to deploy. Your contract is generated here — the platform fee is charged by BNB Token Maker, while the network gas is charged by BNB Smart Chain. The two are separate charges, both paid in BNB, and gas is the only on-chain cost, shown just before you sign.</p>
          </div>
          <div className="app-wordmark" aria-hidden="true">
            <img className="app-wm-logo" src="/logo-bnb-chain.svg" alt="" width="64" height="64" />
            <span className="wm-name">BNB Smart Chain<span className="wm-sub">(BSC)</span></span>
          </div>
        </div>
        <div className="netbar" role="group" aria-label="Network identity">
          <span className="netbar-brand"><img className="netbar-logo" src="/logo-bnb-chain.svg" alt="BNB Smart Chain (BSC)" width="18" height="18" />BNB Smart Chain (BSC)</span>
          <span className="netbar-sep" aria-hidden="true"></span>
          <span className="netbar-tag">BEP-20</span>
          <span className="netbar-sep" aria-hidden="true"></span>
          <span className="netbar-tag">Mainnet&nbsp;·&nbsp;Chain ID 56</span>
          <span className="netbar-sep" aria-hidden="true"></span>
          <span className="netbar-tag"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i>Non-custodial</span>
          <NetState />
        </div>
      </header>

      <div className="progress" aria-label="Deployment steps">
        <span className="prog is-cur"><span className="n">01</span><span className="t">Token</span></span>
        <span className="prog"><span className="n">02</span><span className="t">Features</span></span>
        <span className="prog"><span className="n">03</span><span className="t">Review</span></span>
        <span className="prog"><span className="n">04</span><span className="t">Deploy</span></span>
      </div>

      <CreateBuilder
        pricingConfigDto={pricingConfigDto}
        serverQuote={serverQuote}
        initialDraft={initialDraft}
        activeCampaign={activeCampaign}
        initialCampaignCode={initialCampaignCode}
      />
    </div>
  </section>

    </>
  );
}
