import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { CREATE_WEBSITE } from "../../lib/schema";
import { CreateBuilder } from "../../components/CreateBuilder";
import { NetState } from "../../components/wallet/NetState";
import { resolveDraft } from "../../lib/draft";
import type { DraftQuery } from "../../lib/draft";
import { getCurrentPricingConfig, currentPricingSource } from "../../lib/pricing/server/current-pricing-source";
import { quotePlatformFee, toQuoteDto } from "../../lib/pricing/server/quote";
import { PRESETS, selectedFeatureIds } from "../../lib/pricing/presets";
import { toPricingConfigDto, validateConfig } from "../../lib/pricing";

export const metadata: Metadata = {
  title: "Create BEP-20 Token — BNB Token Maker",
  description: "Create a BEP-20 token on BNB Smart Chain. Set the name, supply and controls, choose your features, connect your wallet and deploy — no code required.",
  alternates: { canonical: "/create" },
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
  const pricingConfig = getCurrentPricingConfig();
  const configValidation = validateConfig(pricingConfig);
  if (!configValidation.ok) {
    throw new Error(
      `Invalid development pricing config: ${configValidation.errors.map((error) => error.code).join(", ")}`
    );
  }
  const pricingConfigDto = toPricingConfigDto(pricingConfig);

  const serverQuote = toQuoteDto(
    quotePlatformFee(currentPricingSource, selectedFeatureIds(PRESETS.standard))
  );

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
      />
    </div>
  </section>

    </>
  );
}
