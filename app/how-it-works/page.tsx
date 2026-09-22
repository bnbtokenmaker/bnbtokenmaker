import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { HOW_WEBSITE } from "../../lib/schema";

export const metadata: Metadata = {
  title: "How to Create a BEP-20 Token | BNB Token Maker",
  description: "How to create a BEP-20 token on BNB Smart Chain with BNB Token Maker: configure the details, choose your features, connect your wallet, review and deploy. Non-custodial, no code.",
  alternates: { canonical: "https://bnbtokenmaker.com/how-it-works" },
  openGraph: {
    title: "How to Create a BEP-20 Token | BNB Token Maker",
    description: "How to create a BEP-20 token on BNB Smart Chain with BNB Token Maker: configure the details, choose your features, connect your wallet, review and deploy. Non-custodial, no code.",
    url: "https://bnbtokenmaker.com/how-it-works",
    siteName: "BNB Token Maker",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "How to Create a BEP-20 Token | BNB Token Maker",
    description: "How to create a BEP-20 token on BNB Smart Chain with BNB Token Maker: configure the details, choose your features, connect your wallet, review and deploy. Non-custodial, no code.",
  },
};

export default function Page() {
  return (
    <>
      <JsonLd data={HOW_WEBSITE} />


  <section className="page" id="top">
    <div className="container">
      <header className="page-head reveal is-in">
        <div className="kicker"><span className="dot"></span>How it works</div>
        <h1>From configuration to BNB Smart Chain in a few clear steps.</h1>
        <p className="lede">Creating a BEP-20 token with BNB Token Maker is a four-step flow: configure the details, choose your features, connect your wallet and deploy. You stay in control of everything from start to finish. For a detailed written walkthrough, see the <a href="/create-bep20-token">step-by-step guide to creating a BEP-20 token</a>.</p>
        <div className="idbar" role="group" aria-label="Network identity">
          <img className="net-ico" src="/logo-bnb-chain.svg" alt="BNB Smart Chain (BSC)" width="16" height="16" />
          <span className="idbar-tag">BEP-20</span>
          <span className="idbar-sep" aria-hidden="true"></span>
          <span className="idbar-tag">BNB Smart Chain</span>
          <span className="idbar-sep" aria-hidden="true"></span>
          <span className="idbar-tag"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i>Non-custodial</span>
        </div>
      </header>

      <section className="steps-wrap">
        <div className="steps steps4">
          <div className="step reveal is-in">
            <div className="step-no">01</div>
            <h3>Configure your token</h3>
            <p>Set the name, symbol, decimals and initial supply of your BEP-20 token. The template follows the standard, so the details you choose are baked into the contract. New to the flow? Read the <a href="/blog/how-to-create-a-bep20-token">guide to creating a BEP-20 token</a> before you start.</p>
          </div>
          <div className="step reveal is-in">
            <div className="step-no">02</div>
            <h3>Choose your features</h3>
            <p>Toggle the contract features you want — burnable, mintable, pausable, transfer limits, blacklist or whitelist. Only the options you enable are included.</p>
          </div>
          <div className="step reveal is-in">
            <div className="step-no">03</div>
            <h3>Connect your wallet</h3>
            <p>Connect a BNB Smart Chain wallet to sign the deployment. Your private keys never leave your wallet — BNB Token Maker can&apos;t see or store them.</p>
          </div>
          <div className="step reveal is-in">
            <div className="step-no">04</div>
            <h3>Review and deploy</h3>
            <p>Check the contract summary, approve the transaction and deploy. Your contract address is shown once the network confirms, and the source is ready for verification on BscScan afterward.</p>
          </div>
        </div>
      </section>
    </div>
  </section>

  <section className="page" id="after-deployment" style={{paddingTop:"0"}}>
    <div className="container">
      <header className="page-head reveal is-in">
        <div className="kicker"><span className="dot"></span>After deployment</div>
        <h2>What happens once your contract is live.</h2>
      </header>
      <section className="content-sec reveal is-in" id="after-deploy">
        <div className="cat-row"><span className="idx">01</span><h2>Right after deployment</h2></div>
        <p className="sec-lede">The moment the network confirms your deployment transaction, your token exists on-chain. Here&apos;s how the next few minutes usually play out.</p>
        <ul className="check-list">
          <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Contract address.</b> BNB Token Maker shows your contract address as soon as deployment confirms, so you can copy it and read it on any block explorer.</span></li>
          <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Block explorer.</b> Search your contract address on a BNB Smart Chain explorer to see the token, its supply and its contract code.</span></li>
          <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Source verification.</b> Deployment and verification are separate steps. After deployment, you can verify the contract source on BscScan so the code is publicly inspectable — see the <a href="/verify-bep20-token">verification guide</a>.</span></li>
          <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Wallet recognition.</b> Wallets and interfaces that support BEP-20 can read your token through its standard interface — name, symbol, decimals and balances.</span></li>
          <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Owner control.</b> The deployer wallet becomes the owner of the contract and controls every feature you enabled — unless you transfer or renounce ownership later.</span></li>
        </ul>
      </section>
    </div>
  </section>

  <section className="page" id="pricing-gas" style={{paddingTop:"0"}}>
    <div className="container">
      <header className="page-head reveal is-in">
        <div className="kicker"><span className="dot"></span>Costs</div>
        <h2>Two costs in separate buckets.</h2>
      </header>
      <section className="content-sec reveal is-in" id="fees">
        <div className="cat-row"><span className="idx">02</span><h2>Platform fee and network gas</h2></div>
        <p className="sec-lede">Creating a token involves two separate costs. One is the fee you see on BNB Token Maker; the other is the network fee your wallet pays to the chain. They are never mixed.</p>
        <div className="wgrid">
          <div className="wblock">
            <div className="ic" aria-hidden="true"><i className="fa-solid fa-code"></i></div>
            <h3>Platform fee</h3>
            <p>One fee to generate your BEP-20 contract through BNB Token Maker. You see it in the create flow before you connect your wallet, and it&apos;s charged in BNB.</p>
          </div>
          <div className="wblock">
            <div className="ic" aria-hidden="true"><i className="fa-solid fa-gas-pump"></i></div>
            <h3>Network gas</h3>
            <p>The network fee your wallet pays to deploy the contract on BNB Smart Chain. It&apos;s paid in BNB, set by the network, and your wallet shows the exact amount before you sign.</p>
          </div>
        </div>
        <div className="callout">
          <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span><b>Two wallets worth of BNB.</b> Make sure the wallet you deploy from holds enough BNB to cover both the platform fee and the network gas. See the <a href="/faq">FAQ</a> for common fee questions, or the <a href="/bep20-token-cost">BEP-20 token cost</a> page for the full breakdown.</span>
        </div>
      </section>
    </div>
  </section>

  <section className="page" id="non-custodial" style={{paddingTop:"0"}}>
    <div className="container">
      <header className="page-head reveal is-in">
        <div className="kicker"><span className="dot"></span>Non-custodial</div>
        <h2>Your keys never leave your wallet.</h2>
      </header>
      <section className="content-sec reveal is-in" id="nc">
        <div className="cat-row"><span className="idx">03</span><h2>You sign, you deploy</h2></div>
        <p className="sec-lede">BNB Token Maker never touches your funds, private keys or seed phrase.</p>
        <div className="nc-band">
          <h3>Non-custodial by design</h3>
          <p>The contract is assembled in your browser, and the deployment transaction is signed inside your own wallet before it&apos;s broadcast to BNB Smart Chain. At no point does BNB Token Maker move your assets, hold your keys, or get access to anything beyond the public address you use to connect.</p>
        </div>
      </section>
    </div>
  </section>

  <section className="section" style={{paddingTop:"clamp(.5rem,2vw,1.5rem)"}}>
    <div className="container">
      <div className="cta-band reveal is-in">
        <div className="cta-inner">
          <div className="cta-kicker">Ready when you are</div>
          <h2>Start your first BEP-20 token.</h2>
          <p>Configure the details, choose your features and deploy from your wallet on BNB Smart Chain.</p>
        </div>
        <div className="cta-action">
          <a className="btn btn-dark btn-lg" href="/create">
            Create Token
            <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
          <a className="btn btn-plain" href="/features">Explore the features</a>
        </div>
      </div>
    </div>
  </section>

    </>
  );
}
