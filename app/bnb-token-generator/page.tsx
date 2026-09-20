import type { Metadata } from "next";
import Link from "next/link";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { BNBGEN_ORG } from "../../lib/schema";
import { BNBGEN_FAQ } from "../../lib/schema";
import { BNBGEN_SOFT } from "../../lib/schema";
import { BNBGEN_BREAD } from "../../lib/schema";

export const metadata: Metadata = {
  title: "BNB Token Generator — Create a Token on BNB Smart Chain | BNB Token Maker",
  description: "What a BNB token generator does: create a BEP-20 token that runs on BNB Smart Chain. BNB vs BEP-20 explained, plus how deployment and network fees work.",
  robots: "index, follow, max-image-preview:large",
  alternates: { canonical: "https://bnbtokenmaker.com/bnb-token-generator" },
  openGraph: {
    title: "BNB Token Generator — Create a Token on BNB Smart Chain | BNB Token Maker",
    description: "What a BNB token generator does: create a BEP-20 token that runs on BNB Smart Chain. BNB vs BEP-20 explained, plus how deployment and network fees work.",
    url: "https://bnbtokenmaker.com/bnb-token-generator",
    siteName: "BNB Token Maker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BNB Token Generator — Create a Token on BNB Smart Chain | BNB Token Maker",
    description: "What a BNB token generator does: create a BEP-20 token that runs on BNB Smart Chain. BNB vs BEP-20 explained, plus how deployment and network fees work.",
  },
};

export default function Page() {
  return (
    <>
<JsonLd data={BNBGEN_ORG} />
<JsonLd data={BNBGEN_FAQ} />
<JsonLd data={BNBGEN_SOFT} />
<JsonLd data={BNBGEN_BREAD} />


<section className="hero land-hero" id="top">
    <div className="hero-bg" aria-hidden="true"></div>
    <div className="container">
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span className="sep" aria-hidden="true">/</span><span>BNB Token Generator</span></nav>
      <div className="kicker"><span className="dot" aria-hidden="true"></span>BNB token generator&nbsp;&nbsp;&middot;&nbsp;&nbsp;<img className="net-ico" src="/logo-bnb-chain.svg" alt="" width="16" height="16" />&nbsp;BNB Smart Chain</div>
      <h1>BNB Token Generator &mdash; Create a Token on BNB Smart Chain.</h1>
      <p className="lede">A &ldquo;BNB token generator&rdquo; creates a new token that runs on BNB Smart Chain. BNB itself cannot be created by a generator &mdash; it is the native currency of the network. Here is what you can actually create, and how.</p>
      <div className="hero-ctas">
        <a className="btn btn-primary btn-lg" href="/create">Create a Token on BNB Smart Chain <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        <a className="btn btn-ghost btn-lg" href="/how-it-works">See How It Works</a>
      </div>
      <ul className="land-facts">
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Standard BEP-20</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>BNB Smart Chain&nbsp;&middot;&nbsp;Chain ID 56</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>No coding</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Non-custodial</li>
      </ul>
    </div>
  </section>

  <section className="section reveal is-in" id="meaning">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Terminology</div>
        <h2>What does &ldquo;BNB token generator&rdquo; mean?</h2>
      </div>
      <div className="guide-sec">
        <p>&ldquo;BNB&rdquo; is used for both the network currency and the network itself, which makes the term confusing. Here is the distinction:</p>
        <div className="def-table">
          <table>
            <thead>
              <tr><th>Term</th><th>Meaning</th></tr>
            </thead>
            <tbody>
              <tr><td className="k">BNB</td><td>The native cryptocurrency of BNB Smart Chain, used to pay network fees.</td></tr>
              <tr><td className="k">BNB Smart Chain</td><td>The network where tokens run &mdash; an EVM-compatible blockchain (Chain ID 56).</td></tr>
              <tr><td className="k">BEP-20</td><td>The token standard used on BNB Smart Chain, defining balances, transfers and approvals.</td></tr>
              <tr><td className="k">&ldquo;BNB token&rdquo;</td><td>A casual way to refer to a token that runs on BNB Smart Chain &mdash; it is not BNB itself.</td></tr>
              <tr><td className="k">BEP-20 token</td><td>A token that follows the BEP-20 standard, created and owned by an independent contract.</td></tr>
            </tbody>
          </table>
        </div>
        <p>A <strong>BNB token generator</strong> can therefore create a new token that runs on BNB Smart Chain &mdash; not BNB itself. BNB is the network&rsquo;s native currency, minted according to the chain&rsquo;s own rules.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="standard">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">The standard</div>
        <h2>Why tokens on BNB Smart Chain use BEP-20.</h2>
      </div>
      <div className="guide-sec">
        <p>BEP-20 defines a common interface for how a token handles balances, transfers and approvals. Because it is a standard, tokens created with it work with wallets, exchanges and protocols across the ecosystem without custom integration.</p>
        <p>A BNB token generator builds a contract that follows this standard, so the token you create behaves the way wallets and other applications expect. For a deeper look at the standard itself, see the <a href="/docs#bep20-standard">BEP-20 documentation</a>.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="create-options">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">What you can create</div>
        <h2>What a generator lets you create.</h2>
      </div>
      <div className="guide-sec">
        <p>With BNB Token Maker you configure the details that define your token:</p>
        <ul>
          <li><strong>Token name &amp; symbol</strong> &mdash; how the token is identified and displayed.</li>
          <li><strong>Total supply &amp; decimals</strong> &mdash; the amount minted at launch and its precision.</li>
          <li><strong>Mint &amp; burn</strong> &mdash; optional abilities to add or remove supply.</li>
          <li><strong>Pause</strong> &mdash; the ability to halt transfers in an emergency.</li>
          <li><strong>Ownership</strong> &mdash; managing the contract, including transferring or renouncing control.</li>
        </ul>
        <p>The complete feature set is described on the <a href="/features">features page</a>.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="deploy">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">How it works</div>
        <h2>How deployment works on BNB Smart Chain.</h2>
      </div>
      <div className="guide-sec">
        <ol>
          <li><strong>Your wallet connects</strong> &mdash; the generator prepares the deployment for the token you configured.</li>
          <li><strong>Your wallet signs</strong> &mdash; the transaction is created but only signed and broadcast from your wallet.</li>
          <li><strong>The network confirms</strong> &mdash; BNB Smart Chain processes the transaction and creates your token contract.</li>
        </ol>
        <p>There is no registration, no API key and no custodial step. The result is your token, owned by your wallet. For the deeper technical flow, see <a href="/create-token-on-bnb-chain">creating a token on BNB Smart Chain</a>.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="fees">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Network fees</div>
        <h2>What it costs to create a token.</h2>
      </div>
      <div className="guide-sec">
        <p>The on-chain cost is the <strong>network fee</strong> for the deployment transaction, paid in BNB from your wallet. It covers the processing of your transaction by BNB Smart Chain and is charged by the network itself.</p>
        <p>Creating a token here involves two separate costs: the <strong>platform fee</strong> for generating the contract, shown in the builder before you connect your wallet, and the <strong>network fee</strong> the chain charges to confirm the deployment, shown in your wallet before you sign. Both are paid in BNB and never mixed. For the full breakdown of what moves each cost, see <a href="/bep20-token-cost">BEP-20 token creation costs</a>.</p>
        <p className="note">Never share your private key or seed phrase anywhere &mdash; BNB Token Maker and BNB Smart Chain will never ask for it.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="ownership">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Ownership</div>
        <h2>Who owns the token you create.</h2>
      </div>
      <div className="guide-sec">
        <p>Ownership is tied to the wallet address that deploys the contract. That means the creator keeps control of contract-level features such as minting and pausing &mdash; unless the token was deployed without them or ownership is later transferred or renounced.</p>
        <p>This is a deliberate design: the network guarantees the contract&rsquo;s rules, and the owner is whoever holds the ownership role at any given time. See <a href="/docs#ownership">the ownership documentation</a> for details.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="faq">
    <div className="container faq-root">
      <div className="sec-head">
        <div className="kicker">FAQ</div>
        <h2>BNB vs BEP-20: your questions.</h2>
      </div>
      <div className="faq-list">
        <details className="faq-item">
          <summary>Is a BNB token the same as BNB?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">No. BNB is the native cryptocurrency of BNB Smart Chain, used to pay network fees. A ‘BNB token’ usually means a separate BEP-20 token that runs on BNB Smart Chain &mdash; the two are different assets.</div>
        </details>
        <details className="faq-item">
          <summary>What is a BEP-20 token?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">BEP-20 is the token standard used on BNB Smart Chain. It defines a common interface for balances, transfers and approvals, so tokens work with wallets, exchanges and protocols on the network.</div>
        </details>
        <details className="faq-item">
          <summary>Can a generator create BNB?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">No. BNB is the network&rsquo;s native currency and is managed by the chain&rsquo;s own rules. A BNB token generator creates a new token that runs on BNB Smart Chain &mdash; not BNB itself.</div>
        </details>
        <details className="faq-item">
          <summary>Do I need coding to create a token?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">No. You configure the token, and the generated BEP-20 contract is deployed from your wallet with a signed transaction.</div>
        </details>
        <details className="faq-item">
          <summary>Who owns the token I create?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">Your wallet does. Ownership is tied to the deploying address and can be transferred or renounced later.</div>
        </details>
      </div>
      <p className="faq-more"><a href="/faq">View all FAQs <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a></p>
    </div>
  </section>

  <section className="section reveal is-in" id="create">
    <div className="container">
      <div className="cta-band">
        <div className="cta-inner">
          <div className="cta-kicker">Create your token</div>
          <h2>Launch a BEP-20 token on BNB Smart Chain.</h2>
          <p>Configure your token, connect and deploy &mdash; no code required.</p>
        </div>
        <div className="cta-action">
          <a className="btn btn-dark btn-lg" href="/create">Create Token <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
          <span className="cta-note">no sign-up&nbsp;&middot;&nbsp;network fees paid in BNB</span>
        </div>
      </div>
    </div>
  </section>

    </>
  );
}
