import type { Metadata } from "next";
import Link from "next/link";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { GEN_SOFT } from "../../lib/schema";
import { GEN_ORG } from "../../lib/schema";
import { GEN_BREAD } from "../../lib/schema";
import { GEN_FAQ } from "../../lib/schema";

export const metadata: Metadata = {
  title: "BEP-20 Token Generator for BNB Smart Chain | BNB Token Maker",
  description: "Create a BEP-20 token on BNB Smart Chain without writing Solidity. Configure name, symbol, supply and controls, connect your wallet and deploy — non-custodial.",
  robots: "index, follow, max-image-preview:large",
  alternates: { canonical: "https://bnbtokenmaker.com/bep20-token-generator" },
  openGraph: {
    title: "BEP-20 Token Generator for BNB Smart Chain | BNB Token Maker",
    description: "Create a BEP-20 token on BNB Smart Chain without writing Solidity. Configure name, symbol, supply and controls, connect your wallet and deploy — non-custodial.",
    url: "https://bnbtokenmaker.com/bep20-token-generator",
    siteName: "BNB Token Maker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BEP-20 Token Generator for BNB Smart Chain | BNB Token Maker",
    description: "Create a BEP-20 token on BNB Smart Chain without writing Solidity. Configure name, symbol, supply and controls, connect your wallet and deploy — non-custodial.",
  },
};

export default function Page() {
  return (
    <>
<JsonLd data={GEN_SOFT} />
<JsonLd data={GEN_ORG} />
<JsonLd data={GEN_BREAD} />
<JsonLd data={GEN_FAQ} />


<section className="hero land-hero" id="top">
    <div className="hero-bg" aria-hidden="true"></div>
    <div className="container">
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span className="sep" aria-hidden="true">/</span><span>BEP-20 Token Generator</span></nav>
      <div className="kicker"><span className="dot" aria-hidden="true"></span>BEP-20 token generator&nbsp;&nbsp;&middot;&nbsp;&nbsp;<img className="net-ico" src="/logo-bnb-chain.svg" alt="" width="16" height="16" />&nbsp;BNB Smart Chain</div>
      <h1>BEP-20 Token Generator for BNB Smart Chain.</h1>
      <p className="lede">Configure a BEP-20 token&rsquo;s name, supply and controls, then deploy the contract to BNB Smart Chain from your own wallet &mdash; no Solidity, no code, no custody.</p>
      <div className="hero-ctas">
        <a className="btn btn-primary btn-lg" href="/create">Create BEP-20 Token <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        <a className="btn btn-ghost btn-lg" href="/how-it-works">See How It Works</a>
      </div>
      <ul className="land-facts">
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>No coding required</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Non-custodial</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Standard BEP-20</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Deploy in minutes</li>
      </ul>
    </div>
  </section>

  <section className="section reveal is-in" id="what-is">
    <div className="container">
      <div className="sec-head">
        <div className="kicker"><span className="dot" aria-hidden="true"></span>What is a BEP-20 token generator?</div>
        <h2>A generator turns token settings into a deployable smart contract.</h2>
      </div>
      <div className="guide-sec">
        <p>A BEP-20 token is a fungible token deployed on BNB Smart Chain that follows the BEP-20 standard. A <strong>BEP-20 token generator</strong> is a tool that builds that token&rsquo;s smart contract from a visual configuration, so you never touch the source code yourself.</p>
        <p>With BNB Token Maker you choose the token name, symbol, total supply, decimals and optional controls, and the generator assembles a standard BEP-20 contract. You then deploy it to BNB Smart Chain directly from your wallet. The wallet signs the transaction; the generator never holds your keys or your tokens.</p>
        <p>New to token creation? The <a href="/create-bep20-token">step-by-step guide to creating a BEP-20 token</a> walks through the same flow in more detail.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="no-code">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Create without Solidity</div>
        <h2>Deploy a BEP-20 token without coding.</h2>
      </div>
      <div className="guide-sec">
        <p>Writing a token contract by hand means compiling Solidity, wiring the correct BEP-20 functions and double-checking every parameter before the transaction reaches the chain. A token generator removes that entire step: the contract is assembled from a standardized BEP-20 template based on the options you select.</p>
        <p>Here&rsquo;s what the no-code flow looks like in the generator:</p>
      </div>
      <div className="config-grid">
        <div className="config-item"><span className="ic"><i className="fa-solid fa-sliders" aria-hidden="true"></i></span><div><b>Fill in the token form</b><span>Set the name, symbol, total supply and decimals in plain text fields.</span></div></div>
        <div className="config-item"><span className="ic"><i className="fa-solid fa-toggle-on" aria-hidden="true"></i></span><div><b>Toggle the controls</b><span>Switch optional features like mint, burn, pause and limits on or off.</span></div></div>
        <div className="config-item"><span className="ic"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i></span><div><b>Contract is generated</b><span>The standardized BEP-20 contract is assembled from your selections.</span></div></div>
        <div className="config-item"><span className="ic"><i className="fa-solid fa-wallet" aria-hidden="true"></i></span><div><b>Your wallet signs</b><span>You review everything, then approve the deployment in your own wallet.</span></div></div>
      </div>
      <div className="guide-sec" style={{marginTop:"1.5rem"}}>
        <p>You keep the decisions that matter &mdash; the token&rsquo;s identity and its contract controls &mdash; while the technical work is handled for you. The result is a contract you can deploy without a compiler, an IDE or a node.</p>
        <p>The same no-code flow powers any <a href="/create-meme-coin-bnb-chain">meme coin on BNB Smart Chain</a>, since a meme coin is just a BEP-20 token. And if you&rsquo;re weighing chains first, see how the standard compares against its Ethereum counterpart in <a href="/bep20-vs-erc20">BEP-20 vs ERC-20</a>.</p>
        <p>Ready to start? <a href="/create">Open the generator and create your BEP-20 token</a>.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="config">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Configuration</div>
        <h2>What can you configure?</h2>
        <p>These are the token details and contract controls you set before deployment:</p>
      </div>
      <div className="config-grid">
        <div className="config-item"><span className="ic"><i className="fa-solid fa-font" aria-hidden="true"></i></span><div><b>Token Name</b><span>The public name of your token</span></div></div>
        <div className="config-item"><span className="ic"><i className="fa-solid fa-signature" aria-hidden="true"></i></span><div><b>Symbol</b><span>The ticker shown next to balances</span></div></div>
        <div className="config-item"><span className="ic"><i className="fa-solid fa-coins" aria-hidden="true"></i></span><div><b>Total Supply</b><span>The fixed supply minted at launch</span></div></div>
        <div className="config-item"><span className="ic"><i className="fa-solid fa-hashtag" aria-hidden="true"></i></span><div><b>Decimals</b><span>Amount precision (standard is 18)</span></div></div>
        <div className="config-item"><span className="ic"><i className="fa-solid fa-plus" aria-hidden="true"></i></span><div><b>Mintable</b><span>Create additional supply later</span></div></div>
        <div className="config-item"><span className="ic"><i className="fa-solid fa-fire" aria-hidden="true"></i></span><div><b>Burnable</b><span>Remove supply permanently</span></div></div>
        <div className="config-item"><span className="ic"><i className="fa-solid fa-pause" aria-hidden="true"></i></span><div><b>Pausable</b><span>Pause transfers in an emergency</span></div></div>
        <div className="config-item"><span className="ic"><i className="fa-solid fa-key" aria-hidden="true"></i></span><div><b>Ownership control</b><span>Transfer or renounce ownership</span></div></div>
      </div>
      <p className="note">Only the options shown in the configuration form are generated into your contract &mdash; nothing hidden is added. See the <a href="/features">full list of token features</a> for more detail.</p>
    </div>
  </section>

  <section className="section reveal is-in" id="workflow">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">How the generator works</div>
        <h2>From configuration to a live BEP-20 contract.</h2>
      </div>
      <div className="guide-sec">
        <ol>
          <li><strong>Configure</strong> &mdash; set the token name, symbol, supply, decimals and optional controls.</li>
          <li><strong>Connect</strong> &mdash; link your wallet to BNB Smart Chain. BNB Token Maker never signs on your behalf.</li>
          <li><strong>Deploy</strong> &mdash; confirm the transaction in your wallet. The contract is created on BNB Smart Chain.</li>
        </ol>
        <p>See the <a href="/how-it-works">complete deployment walkthrough</a> to follow each step in detail.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="network">
    <div className="container">
      <div className="net-band">
        <div className="net-head">
          <img className="net-logo" src="/logo-bnb-chain.svg" alt="BNB Smart Chain" width="80" height="80" />
          <div className="net-copy">
            <div className="kicker"><span className="dot" aria-hidden="true"></span>Deployment</div>
            <h2>Your token runs on BNB Smart Chain.</h2>
            <p>Tokens are created on BNB Smart Chain using the BEP-20 standard. The deployment transaction is signed from your wallet, and the network fee is paid in BNB. After confirmation the token has a public contract address, ready for source verification on BscScan.</p>
            <ul className="net-spec">
              <li>Standard&nbsp;&middot;&nbsp;<b>BEP-20</b></li>
              <li>Mainnet&nbsp;&middot;&nbsp;<b>Chain ID 56</b></li>
              <li>Network fees&nbsp;&middot;&nbsp;<b>paid in BNB</b></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="security">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Security</div>
        <h2>Non-custodial by design.</h2>
        <p>BNB Token Maker never asks for your private key or seed phrase. The interface builds the transaction; your wallet signs it.</p>
      </div>
      <div className="trust-grid">
        <div className="trust-item"><span className="ic"><i className="fa-solid fa-key" aria-hidden="true"></i></span><h3>Non-custodial</h3><p>Signing happens only inside your own wallet. BNB Token Maker holds nothing on your behalf.</p></div>
        <div className="trust-item"><span className="ic"><i className="fa-solid fa-paper-plane" aria-hidden="true"></i></span><h3>Direct deployment</h3><p>Your wallet broadcasts the deployment transaction itself &mdash; there is no intermediary step.</p></div>
        <div className="trust-item"><span className="ic"><i className="fa-solid fa-code" aria-hidden="true"></i></span><h3>Transparent contracts</h3><p>The generated source is open and verifiable on BscScan after deployment. Learn more about <a href="/docs#wallet-security">wallet and contract security</a>, or follow the <a href="/verify-bep20-token">step-by-step verification guide</a>.</p></div>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="guides">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Next steps</div>
        <h2>Guides and references.</h2>
      </div>
      <div className="guide-grid">
        <a className="guide-card" href="/create"><span className="g-no">GENERATOR</span><h3>Create your BEP-20 token</h3><p>Open the generator, configure your token and deploy to BNB Smart Chain.</p><span className="go">Open generator <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span></a>
        <a className="guide-card" href="/features"><span className="g-no">FEATURES</span><h3>Token features explained</h3><p>Mint, burn, pause and ownership &mdash; what each optional control does.</p><span className="go">View features <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span></a>
        <a className="guide-card" href="/docs#quick-start"><span className="g-no">DOCS</span><h3>Documentation</h3><p>Start with the quick-start guide for deployment details.</p><span className="go">Read the docs <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span></a>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="faq">
    <div className="container faq-root">
      <div className="sec-head">
        <div className="kicker">FAQ</div>
        <h2>BEP-20 token generator questions.</h2>
      </div>
      <div className="faq-list">
        <details className="faq-item">
          <summary>What is a BEP-20 token generator?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">A BEP-20 token generator is a tool that builds the smart contract for a BEP-20 token from a visual configuration &mdash; name, symbol, supply and controls &mdash; so you can deploy it to BNB Smart Chain without writing code.</div>
        </details>
        <details className="faq-item">
          <summary>Can I create a BEP-20 token without coding?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">Yes, completely. The generator builds the BEP-20 contract for you from a visual form: you set the name, symbol, supply and decimals, toggle the optional controls you want, and your wallet signs the deployment transaction. No Solidity, compiler or node is needed at any step.</div>
        </details>
        <details className="faq-item">
          <summary>Do I need Solidity or coding knowledge?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">No. The contract is assembled from a standardized BEP-20 template. You configure the fields and controls visually while the contract itself is built for you.</div>
        </details>
        <details className="faq-item">
          <summary>Which blockchain will my token be deployed on?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">BNB Smart Chain (Chain ID 56), using the BEP-20 standard. Deployment happens directly from your wallet to the network.</div>
        </details>
        <details className="faq-item">
          <summary>Do I need BNB in my wallet?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">Yes. Your wallet needs enough BNB to cover the network fee for the deployment transaction on BNB Smart Chain.</div>
        </details>
        <details className="faq-item">
          <summary>Who owns the token after deployment?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">You do. Contract ownership is tied to the wallet address that deploys it, and it can be transferred or renounced later. The platform never holds your token.</div>
        </details>
        <details className="faq-item">
          <summary>Can I customize how my token behaves?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">Yes, through the optional controls: minting, burning, pausing and ownership management. A feature only exists in your contract if you enable it during configuration.</div>
        </details>
      </div>
      <p className="faq-more"><a href="/faq">View all FAQs <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a></p>
    </div>
  </section>

  <section className="section reveal is-in" id="create">
    <div className="container">
      <div className="cta-band">
        <div className="cta-inner">
          <div className="cta-kicker">Ready to create your BEP-20 token?</div>
          <h2>Build and deploy a BEP-20 token on BNB Smart Chain.</h2>
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
