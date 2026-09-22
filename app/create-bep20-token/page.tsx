import type { Metadata } from "next";
import Link from "next/link";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { GUIDE_FAQ } from "../../lib/schema";
import { GUIDE_ORG } from "../../lib/schema";
import { GUIDE_SOFT } from "../../lib/schema";
import { GUIDE_HOWTO } from "../../lib/schema";
import { GUIDE_BREAD } from "../../lib/schema";

export const metadata: Metadata = {
  title: "Create a BEP-20 Token on BNB Smart Chain | BNB Token Maker",
  description: "Step-by-step guide to creating a BEP-20 token: what you need, the five steps from configuration to deployment, and common mistakes to avoid. No Solidity required.",
  robots: "index, follow, max-image-preview:large",
  alternates: { canonical: "https://bnbtokenmaker.com/create-bep20-token" },
  openGraph: {
    title: "Create a BEP-20 Token on BNB Smart Chain | BNB Token Maker",
    description: "Step-by-step guide to creating a BEP-20 token: what you need, the five steps from configuration to deployment, and common mistakes to avoid. No Solidity required.",
    url: "https://bnbtokenmaker.com/create-bep20-token",
    siteName: "BNB Token Maker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Create a BEP-20 Token on BNB Smart Chain | BNB Token Maker",
    description: "Step-by-step guide to creating a BEP-20 token: what you need, the five steps from configuration to deployment, and common mistakes to avoid. No Solidity required.",
  },
};

export default function Page() {
  return (
    <>
<JsonLd data={GUIDE_FAQ} />
<JsonLd data={GUIDE_ORG} />
<JsonLd data={GUIDE_SOFT} />
<JsonLd data={GUIDE_HOWTO} />
<JsonLd data={GUIDE_BREAD} />


<section className="hero land-hero" id="top">
    <div className="hero-bg" aria-hidden="true"></div>
    <div className="container">
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span className="sep" aria-hidden="true">/</span><span>Create a BEP-20 Token</span></nav>
      <div className="kicker"><span className="dot" aria-hidden="true"></span>Step-by-step guide&nbsp;&nbsp;&middot;&nbsp;&nbsp;<img className="net-ico" src="/logo-bnb-chain.svg" alt="" width="16" height="16" />&nbsp;BNB Smart Chain</div>
      <h1>How to Create a BEP-20 Token: A Step-by-Step Guide.</h1>
      <p className="lede">You create a BEP-20 token by defining the token, connecting a wallet to BNB Smart Chain and signing the deployment transaction. No Solidity required.</p>
      <div className="hero-ctas">
        <a className="btn btn-primary btn-lg" href="/create">Create Your BEP-20 Token <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        <a className="btn btn-ghost btn-lg" href="#steps">Jump to the Steps</a>
      </div>
      <ul className="land-facts">
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Five steps, start to finish</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>No coding</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Deployed from your wallet</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Non-custodial</li>
      </ul>
    </div>
  </section>

  <section className="section reveal is-in" id="what-you-need">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Before you start</div>
        <h2>What you need to create a BEP-20 token.</h2>
      </div>
      <ul className="check-list">
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span>A <strong>wallet</strong> that can sign transactions on BNB Smart Chain (Chain ID 56).</span></li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span>A small amount of <strong>BNB</strong> in that wallet to cover the deployment network fee.</span></li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span>A <strong>token name</strong> and <strong>symbol</strong> for your token.</span></li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span>A clear decision on <strong>total supply</strong> &mdash; and whether it should be possible to mint more later.</span></li>
      </ul>
      <p className="note">You do not need a server, a node or coding experience. The generator builds the BEP-20 contract for you from your configuration. New to the standard? Read our <a href="/bep20-token-generator">BEP-20 token generator guide</a> first.</p>
    </div>
  </section>

  <section className="section reveal is-in" id="steps">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">The steps</div>
        <h2>Create your BEP-20 token in five steps.</h2>
      </div>
      <div className="guide-sec">
        <h3>Step 1 &mdash; Define your token</h3>
        <p>Start with the token&rsquo;s identity: the public <strong>name</strong>, the <strong>symbol</strong> shown next to balances, the number of <strong>decimals</strong> (the standard configuration uses 18) and the <strong>total supply</strong> to mint at launch. These values become part of the contract and are set once the token is deployed.</p>

        <h3>Step 2 &mdash; Choose the token controls</h3>
        <p>Decide which optional features the contract should include: <strong>mint</strong> to create supply later, <strong>burn</strong> to remove supply permanently, <strong>pause</strong> to halt transfers in an emergency, and <strong>ownership</strong> so the contract can be managed. A control only exists in your contract if you enable it. See the <a href="/features">feature reference</a> for what each one does.</p>

        <h3>Step 3 &mdash; Connect your wallet</h3>
        <p>Connect your wallet to BNB Smart Chain. The generator builds the deployment transaction for you, but you remain in control: your wallet reviews and signs it, and your private key never leaves the wallet. Make sure the wallet holds enough BNB for the network fee &mdash; see <a href="/docs#network-requirements">network requirements</a> for details.</p>

        <h3>Step 4 &mdash; Review the contract</h3>
        <p>Before broadcasting, check the configuration one more time: name, symbol, supply, decimals and the controls you enabled. The on-chain values come from exactly what you review here &mdash; they cannot be changed after deployment. Our <a href="/docs#before-you-deploy">pre-deployment checklist</a> covers the full review.</p>

        <h3>Step 5 &mdash; Deploy to BNB Smart Chain</h3>
        <p>Confirm the transaction in your wallet. The network processes it, the network fee is paid in BNB, and your token&rsquo;s contract is created on BNB Smart Chain. Follow the <a href="/how-it-works#after-deployment">after-deployment walkthrough</a> to view the contract on-chain, and verify its source on BscScan so anyone can inspect it.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="after-deploy">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Right after deployment</div>
        <h2>What happens once your token is live.</h2>
      </div>
      <div className="guide-sec">
        <ul>
          <li><strong>Contract address</strong> &mdash; your token gets a public address on BNB Smart Chain and appears in balances once added to a wallet.</li>
          <li><strong>Source verification</strong> &mdash; the generated source is available for verification on BscScan, so anyone can inspect the contract they interact with.</li>
          <li><strong>Ownership</strong> &mdash; your wallet owns the contract. Ownership can be transferred or renounced later &mdash; see <a href="/docs#ownership">ownership controls</a>.</li>
          <li><strong>Supply</strong> &mdash; if you enabled minting, additional supply can be created through the contract; otherwise the launch supply is the total supply &mdash; see <a href="/docs#supply-controls">supply controls</a>.</li>
        </ul>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="mistakes">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Common mistakes</div>
        <h2>Mistakes to avoid when creating a BEP-20 token.</h2>
      </div>
      <div className="guide-sec">
        <ul>
          <li><strong>Choosing the wrong supply</strong> &mdash; the launch supply is fixed. Changing it later requires minting, so decide carefully whether minting should be enabled.</li>
          <li><strong>Overlooking decimals</strong> &mdash; the standard configuration uses 18 decimals. A custom value changes how amounts are displayed.</li>
          <li><strong>Enabling mint without a plan</strong> &mdash; minting creates a permanent ability to increase supply. Enable it only if you intend to use it.</li>
          <li><strong>Leaving ownership undecided</strong> &mdash; decide up front whether to keep, transfer or renounce ownership after deployment.</li>
          <li><strong>Running out of BNB</strong> &mdash; the deployment network fee is paid in BNB from your wallet. Confirm the balance covers it before confirming.</li>
        </ul>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="more">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Keep reading</div>
        <h2>More resources.</h2>
      </div>
      <div className="guide-grid">
        <a className="guide-card" href="/features"><span className="g-no">FEATURES</span><h3>Token features</h3><p>Mint, burn, pause and ownership controls explained in depth.</p><span className="go">View features <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span></a>
        <a className="guide-card" href="/docs#quick-start"><span className="g-no">DOCS</span><h3>Quick-start guide</h3><p>The technical walkthrough from configuration to contract verification.</p><span className="go">Read the docs <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span></a>
        <a className="guide-card" href="/how-it-works"><span className="g-no">HOW IT WORKS</span><h3>Deployment walkthrough</h3><p>Follow the full creation flow outside the product itself.</p><span className="go">See how it works <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span></a>
      </div>
      <div className="sec-cta">
        <a href="/blog/how-to-create-a-bep20-token">From the blog: How to Create a BEP-20 Token on BNB Smart Chain <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="faq">
    <div className="container faq-root">
      <div className="sec-head">
        <div className="kicker">FAQ</div>
        <h2>Common questions about creating a BEP-20 token.</h2>
      </div>
      <div className="faq-list">
        <details className="faq-item">
          <summary>How long does it take to create a BEP-20 token?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">Once the token is configured and your wallet is connected, deployment is one or two signed transactions. Confirmation on BNB Smart Chain is typically a matter of seconds to minutes, depending on network conditions.</div>
        </details>
        <details className="faq-item">
          <summary>Do I need to write code or use a compiler?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">No. The generator builds the BEP-20 contract from your configuration. You review the token details and confirm the deployment in your wallet.</div>
        </details>
        <details className="faq-item">
          <summary>Do I need BNB to create a BEP-20 token?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">Yes &mdash; enough to cover the network fee for the deployment transaction. The fee is paid in BNB from your wallet.</div>
        </details>
        <details className="faq-item">
          <summary>Can I change the token name or supply after deployment?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">The name, symbol, decimals and initial supply are fixed at deployment. If you enabled minting, additional supply can be created later through the contract.</div>
        </details>
        <details className="faq-item">
          <summary>Who controls the token after I deploy it?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">Your wallet. Ownership is tied to the address that deploys the contract and can be transferred or renounced later. See the ownership documentation for details.</div>
        </details>
      </div>
      <p className="faq-more"><a href="/faq">View all FAQs <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a></p>
    </div>
  </section>

  <section className="section reveal is-in" id="create">
    <div className="container">
      <div className="cta-band">
        <div className="cta-inner">
          <div className="cta-kicker">Create your BEP-20 token</div>
          <h2>Follow the steps and deploy your token in minutes.</h2>
          <p>Configure, connect and deploy from your own wallet &mdash; no code required.</p>
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
