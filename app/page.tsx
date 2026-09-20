import type { Metadata } from "next";
import "./home.css";
import { JsonLd } from "../components/JsonLd";
import {
  INDEX_WEBSITE,
  INDEX_ORGANIZATION,
  INDEX_SOFTWARE,
  INDEX_FAQ
} from "../lib/schema";

export const metadata: Metadata = {
  title: "BNB Token Maker — Create a BEP-20 Token on BNB Smart Chain",
  description: "Create a BEP-20 token on BNB Smart Chain without writing Solidity. Configure the name, supply and contract controls, connect your wallet and deploy — non-custodial and ready in minutes.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Create a BEP-20 Token on BNB Smart Chain | BNB Token Maker",
    description: "Create a BEP-20 token on BNB Smart Chain without writing Solidity. Configure the name, supply and contract controls, connect your wallet and deploy — non-custodial and ready in minutes.",
    url: "https://bnbtokenmaker.com/",
    siteName: "BNB Token Maker",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Create a BEP-20 Token on BNB Smart Chain | BNB Token Maker",
    description: "Create a BEP-20 token on BNB Smart Chain without writing Solidity. Configure the name, supply and contract controls, connect your wallet and deploy — non-custodial and ready in minutes.",
  },
};

export default function Page() {
  return (
    <>
      <JsonLd data={INDEX_WEBSITE} />
      <JsonLd data={INDEX_ORGANIZATION} />
      <JsonLd data={INDEX_SOFTWARE} />
      <JsonLd data={INDEX_FAQ} />


  <section className="hero" id="top">
    <div className="hero-bg" aria-hidden="true"></div>
    <svg className="hero-pattern" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="currentColor">
        <rect x="1030" y="80" width="340" height="340" rx="24" transform="rotate(45 1200 250)"></rect>
        <rect x="1088" y="138" width="224" height="224" rx="16" transform="rotate(45 1200 250)"></rect>
        <path d="M112 784 L292 668 L472 564 L652 460 L832 356 L1012 252 L1192 148"></path>
      </g>
      <g fill="currentColor">
        <rect x="274" y="650" width="12" height="12" rx="2.5" transform="rotate(45 280 656)"></rect>
        <rect x="454" y="546" width="12" height="12" rx="2.5" transform="rotate(45 460 552)"></rect>
        <rect x="634" y="442" width="12" height="12" rx="2.5" transform="rotate(45 640 448)"></rect>
        <rect x="814" y="338" width="12" height="12" rx="2.5" transform="rotate(45 820 344)"></rect>
        <rect x="994" y="234" width="12" height="12" rx="2.5" transform="rotate(45 1000 240)"></rect>
      </g>
      <rect className="pat-accent" x="1341" y="241" width="18" height="18" rx="4" transform="rotate(45 1350 250)"></rect>
    </svg>
    <div className="container hero-grid">
      <div className="reveal is-in">
        <div className="kicker hero-kicker"><span className="dot"></span>BEP-20 generator&nbsp;·&nbsp;<img className="net-ico" src="/logo-bnb-chain.svg" alt="" width="14" height="14" />BNB Smart Chain</div>
        <h1>Create a <span className="tech">BEP-20</span> token on BNB Smart Chain.<img className="h1-net" src="/logo-bnb-chain.svg" alt="" width="34" height="34" /></h1>
        <p className="lede">Launch your token without writing Solidity. Set the name, supply and controls, connect your wallet, and deploy directly to BNB Smart Chain in about two minutes.</p>
        <div className="hero-ctas">
          <a className="btn btn-primary btn-lg" href="/create">
            Create Token
            <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
          <a className="btn btn-ghost btn-lg" href="#how">See How It Works</a>
        </div>
        <ul className="trust-row">
          <li><i className="fa-solid fa-check" aria-hidden="true"></i>No coding required</li>
          <li><i className="fa-solid fa-check" aria-hidden="true"></i>Non-custodial</li>
          <li><i className="fa-solid fa-check" aria-hidden="true"></i>Verified contracts</li>
          <li><i className="fa-solid fa-check" aria-hidden="true"></i>Deploy in minutes</li>
        </ul>
        <p className="hero-indep">BNB Token Maker is an independent tool for creating BEP-20 tokens on BNB Smart Chain and is not affiliated with BNB Chain or Binance.</p>
      </div>

      <aside className="deck reveal is-in" aria-label="Token configuration preview">
        <div className="deck-head">
          <span className="lbl"><span className="pulse"></span>New token</span>
          <span className="net"><img className="net-ico" src="/logo-bnb-chain.svg" alt="" width="14" height="14" />BNB Smart Chain</span>
        </div>
        <div className="deck-body">
          <label className="field">
            <span className="field-label">Token name</span>
            <input id="f-name" type="text" value="Aurora" maxLength={40} spellCheck="false" autoComplete="off" />
          </label>
          <div className="field-row">
            <label className="field">
              <span className="field-label">Symbol</span>
              <input id="f-symbol" type="text" value="AUR" maxLength={11} spellCheck="false" autoComplete="off" />
            </label>
            <label className="field">
              <span className="field-label">Decimals</span>
              <input id="f-dec" type="number" value="18" min={0} max={18} inputMode="numeric" />
              <span className="field-hint">Standard&nbsp;·&nbsp;max&nbsp;18</span>
            </label>
          </div>
          <label className="field">
            <span className="field-label">Total supply</span>
            <input id="f-supply" type="text" value="1,000,000,000" inputMode="numeric" autoComplete="off" />
          </label>
          <div className="preview" aria-live="polite">
            <span className="p-lbl">Draft</span>
            <span className="p-val" id="pv">Aurora&nbsp;·&nbsp;AUR&nbsp;·&nbsp;1,000,000,000&nbsp;·&nbsp;18&nbsp;dec.</span>
          </div>
        </div>
        <div className="deck-foot">
          <div className="estimate">
            <span className="est">≈ 2 min</span>
            <span className="est-txt">estimated deployment&nbsp;·&nbsp;network fees paid in BNB</span>
          </div>
          <a className="btn btn-primary" href="/create" style={{width:"100%"}}>
            Create Token
            <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
          <div className="deploy-note">
            <i className="fa-solid fa-check" aria-hidden="true"></i>
            Signed from your wallet&nbsp;·&nbsp;source ready for verification on BscScan
          </div>
        </div>
      </aside>
    </div>
  </section>

  <section className="section net" style={{paddingTop:"0"}}>
    <div className="container">
      <div className="net-band reveal is-in">
        <div className="net-head">
          <img className="net-logo" src="/logo-bnb-chain.svg" alt="BNB Smart Chain" width="96" height="96" />
          <div className="net-copy">
            <div className="kicker"><span className="dot"></span>BEP-20&nbsp;·&nbsp;BNB Smart Chain</div>
            <h2>Your token, live on BNB Smart Chain.</h2>
            <p>BNB Token Maker generates BEP-20 smart contracts for BNB Smart Chain (Chain ID 56). You configure the token details, connect your wallet, and sign the deployment transaction yourself — the network fee is paid in BNB from your own wallet.</p>
            <p>Because your token uses the BEP-20 standard, it fits the BNB Smart Chain ecosystem directly: supported wallets, exchanges and block explorers can read and display it right after deployment.</p>
            <ul className="net-spec">
              <li>Standard&nbsp;·&nbsp;<b>BEP-20</b></li>
              <li>Mainnet&nbsp;·&nbsp;<b>Chain ID 56</b></li>
              <li>Network fees&nbsp;·&nbsp;<b>paid in BNB</b></li>
            </ul>
          </div>
        </div>
        <ul className="net-points">
          <li>
            <span className="ic" aria-hidden="true"><i className="fa-solid fa-shield-halved"></i></span>
            <span><b>Non-custodial</b><span className="net-pt-txt">Deployment is signed from your wallet — keys never leave your control</span></span>
          </li>
          <li>
            <span className="ic" aria-hidden="true"><i className="fa-solid fa-coins"></i></span>
            <span><b>BEP-20 standard</b><span className="net-pt-txt">Native token standard on BNB Smart Chain, Chain ID 56</span></span>
          </li>
          <li>
            <span className="ic" aria-hidden="true"><i className="fa-solid fa-code"></i></span>
            <span><b>Transparent contracts</b><span className="net-pt-txt">Open source and verifiable on BscScan</span></span>
          </li>
        </ul>
      </div>
    </div>
  </section>

  <section className="section" id="why-bnb">
    <div className="container">
      <div className="sec-head reveal is-in">
        <div className="kicker"><span className="dot"></span>01&nbsp;·&nbsp;Why build on BNB Smart Chain</div>
        <h2>Why create a token on BNB Smart Chain?</h2>
        <p>Your BEP-20 token lives on BNB Smart Chain, a widely supported EVM network. Here is what that means in practice — the standard, the tools and the fees.</p>
        <p className="why-chip"><img className="net-ico" src="/logo-bnb-chain.svg" alt="" width="15" height="15" /> BNB Smart Chain&nbsp;·&nbsp;Mainnet&nbsp;·&nbsp;Chain ID 56</p>
      </div>
      <div className="why-grid reveal is-in">
        <article className="why-item">
          <span className="ic" aria-hidden="true"><i className="fa-solid fa-cubes"></i></span>
          <h3>BEP-20 ecosystem compatibility</h3>
          <p>BEP-20 is the token standard on BNB Smart Chain. Tokens built with it fit the wallets, exchanges and decentralized apps that already support the network.</p>
        </article>
        <article className="why-item">
          <span className="ic" aria-hidden="true"><i className="fa-solid fa-microchip"></i></span>
          <h3>EVM-compatible network</h3>
          <p>BNB Smart Chain is an EVM-compatible chain, so a BEP-20 contract follows the standard smart contract model — readable in familiar tooling and block explorers.</p>
        </article>
        <article className="why-item">
          <span className="ic" aria-hidden="true"><i className="fa-solid fa-coins"></i></span>
          <h3>Network fees paid in BNB</h3>
          <p>Deployment and transfers cost the BNB Smart Chain network fee, paid in BNB from your own wallet. Transactions settle on-chain and are visible to anyone.</p>
        </article>
        <article className="why-item">
          <span className="ic" aria-hidden="true"><i className="fa-solid fa-wallet"></i></span>
          <h3>Broad wallet &amp; explorer compatibility</h3>
          <p>Wallets and explorers built for BNB Smart Chain (Chain ID 56) — such as MetaMask, Trust Wallet and BscScan — can read and display your token right after deployment.</p>
        </article>
      </div>
      <div className="sec-cta reveal is-in">
        <a className="sec-cta-main" href="/create">Create a BEP-20 token <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        <a className="sec-cta-plain" href="/docs">Read the documentation <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
      </div>
    </div>
  </section>

  <section className="section" id="how">
    <div className="container">
      <div className="sec-head reveal is-in">
        <div className="kicker"><span className="dot"></span>02&nbsp;·&nbsp;How it works</div>
        <h2>From idea to a live token, in three steps.</h2>
        <p>No compilation, no CLI, no node setup. The generator produces the contract, and your wallet signs the launch.</p>
      </div>
      <ol className="steps">
        <li className="step reveal is-in">
          <span className="step-no">01</span>
          <h3>Configure</h3>
          <p>Set the name, symbol, supply and decimals. Choose the controls you need — mint, burn, pause and ownership — before anything goes on chain.</p>
        </li>
        <li className="step reveal is-in">
          <span className="step-no">02</span>
          <h3>Connect</h3>
          <p>Connect your wallet to BNB Smart Chain. We sign nothing for you and never touch your private keys — the transaction stays in your control.</p>
        </li>
        <li className="step reveal is-in">
          <span className="step-no">03</span>
          <h3>Deploy</h3>
          <p>Confirm the transaction in your wallet and your contract goes live on BNB Smart Chain, with source ready for verification on BscScan.</p>
        </li>
      </ol>
      <div className="sec-cta reveal is-in">
        <a className="sec-cta-main" href="/how-it-works">Learn how token deployment works <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        <a className="sec-cta-plain" href="/create">Create your BEP-20 token <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
      </div>
    </div>
  </section>

  <section className="section" id="features">
    <div className="container">
      <div className="sec-head reveal is-in">
        <div className="kicker"><span className="dot"></span>03&nbsp;·&nbsp;Features</div>
        <h2>Token standards that ship with your contract.</h2>
        <p>Every token is generated from a standardized BEP-20 template. You pick the controls that suit your project — the rest stays out of the way.</p>
      </div>
      <div className="feat-grid">
        <article className="feat reveal is-in">
          <div className="feat-top"><span className="feat-idx">01</span><span className="feat-state on">default&nbsp;on</span></div>
          <h3>Fixed Supply</h3>
          <p>The total supply is locked in at launch. Your numbers are set until you change them deliberately.</p>
        </article>
        <article className="feat reveal is-in">
          <div className="feat-top"><span className="feat-idx">02</span><span className="feat-state">optional</span></div>
          <h3>Mintable</h3>
          <p>Create additional supply after launch when growth calls for it — under owner control.</p>
        </article>
        <article className="feat reveal is-in">
          <div className="feat-top"><span className="feat-idx">03</span><span className="feat-state">optional</span></div>
          <h3>Burnable</h3>
          <p>Remove tokens from circulation permanently, right from the owner wallet.</p>
        </article>
        <article className="feat reveal is-in">
          <div className="feat-top"><span className="feat-idx">04</span><span className="feat-state">optional</span></div>
          <h3>Pausable</h3>
          <p>Pause transfers instantly in an emergency — a safety valve for new projects.</p>
        </article>
        <article className="feat reveal is-in">
          <div className="feat-top"><span className="feat-idx">05</span><span className="feat-state">default&nbsp;on</span></div>
          <h3>Ownership Control</h3>
          <p>Transfer or renounce ownership. Hand the contract to a multisig, or lock it forever.</p>
        </article>
        <article className="feat reveal is-in">
          <div className="feat-top"><span className="feat-idx">06</span><span className="feat-state">always</span></div>
          <h3>Verifiable Source Code</h3>
          <p>Deployment and verification are separate steps — after deployment you can verify the contract source on BscScan so anyone can inspect it.</p>
        </article>
      </div>
      <div className="sec-cta reveal is-in">
        <a className="sec-cta-main" href="/features">Explore all token features <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        <a className="sec-cta-plain" href="/create">Create a BEP-20 token <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
      </div>
    </div>
  </section>

  <section className="section" id="learn">
    <div className="container">
      <div className="sec-head reveal is-in">
        <div className="kicker"><span className="dot"></span>04&nbsp;·&nbsp;Documentation</div>
        <h2>Learn before you deploy.</h2>
        <p>Explore how BEP-20 tokens are created on BNB Smart Chain — token details, contract features, ownership, deployment and security — before you configure anything.</p>
      </div>
      <div className="guide-grid reveal is-in">
        <article className="guide-card">
          <span className="g-no">Guide&nbsp;01</span>
          <h3>Creating a BEP-20 Token</h3>
          <p>Token details, supply, decimals and the controls you configure before deployment.</p>
          <a className="go" href="/docs#quick-start">Read guide <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        </article>
        <article className="guide-card">
          <span className="g-no">Guide&nbsp;02</span>
          <h3>Understanding Token Features</h3>
          <p>Fixed supply, mint, burn, pause and ownership — what each contract control does.</p>
          <a className="go" href="/docs#token-features">Read guide <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        </article>
        <article className="guide-card">
          <span className="g-no">Guide&nbsp;03</span>
          <h3>Token Ownership &amp; Security</h3>
          <p>Who owns the contract after deployment, wallet security and non-custodial signing.</p>
          <a className="go" href="/docs#ownership">Read guide <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        </article>
      </div>
      <div className="sec-cta reveal is-in">
        <a className="sec-cta-main" href="/docs">Explore documentation <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        <a className="sec-cta-plain" href="/create">Create your BEP-20 token <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
      </div>
    </div>
  </section>

  <section className="section" id="blog">
    <div className="container">
      <div className="sec-head reveal is-in">
        <div className="kicker"><span className="dot"></span>05&nbsp;·&nbsp;From the blog</div>
        <h2>Latest guides.</h2>
        <p>Practical guides on creating and understanding BEP-20 tokens on BNB Smart Chain.</p>
      </div>
      <div className="hp-blog-grid reveal is-in">
        <article className="hp-blog">
          <span className="blg-cat">Guide</span>
          <h3>How to Create a BEP-20 Token on BNB Smart Chain</h3>
          <p>A practical introduction to configuring and deploying a BEP-20 token without writing Solidity.</p>
          <a className="go" href="/blog/how-to-create-a-bep20-token">Read guide <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        </article>
        <article className="hp-blog">
          <span className="blg-cat">Learn</span>
          <h3>What Is a BEP-20 Token?</h3>
          <p>A clear look at the token standard that powers BNB Smart Chain, and what it means for your token.</p>
          <a className="go" href="/blog">Read article <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        </article>
        <article className="hp-blog">
          <span className="blg-cat">Token&nbsp;Design</span>
          <h3>Fixed Supply vs Mintable Tokens</h3>
          <p>Why the two can&apos;t coexist, and how to decide which supply model fits your token.</p>
          <a className="go" href="/blog">Read article <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        </article>
      </div>
      <div className="sec-cta reveal is-in">
        <a className="sec-cta-main" href="/blog">View all articles <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
      </div>
    </div>
  </section>

  <section className="section" id="security">
    <div className="container">
      <div className="sec-head reveal is-in">
        <div className="kicker"><span className="dot"></span>06&nbsp;·&nbsp;Security</div>
        <h2>You hold the keys. Always.</h2>
        <p>The contract is yours and the keys are yours. BNB Token Maker is only the form in between.</p>
      </div>
      <div className="trust-grid">
        <div className="trust-item reveal is-in">
          <span className="ic" aria-hidden="true"><i className="fa-solid fa-key"></i></span>
          <h3>Non-custodial</h3>
          <p>We never access your wallet&apos;s private keys. Signing happens only inside your own wallet, and we hold nothing on your behalf.</p>
        </div>
        <div className="trust-item reveal is-in">
          <span className="ic" aria-hidden="true"><i className="fa-solid fa-rocket"></i></span>
          <h3>Direct deployment</h3>
          <p>Transactions are signed directly from your wallet and broadcast by you. There is no middle step where funds or contracts pass through us.</p>
        </div>
        <div className="trust-item reveal is-in">
          <span className="ic" aria-hidden="true"><i className="fa-solid fa-code"></i></span>
          <h3>Transparent contracts</h3>
          <p>The generated source is open so you can inspect it before deployment — and verify it on BscScan afterwards so anyone can read it.</p>
        </div>
      </div>
      <p className="security-note reveal is-in">BNB Token Maker runs the generator interface&nbsp;—&nbsp;the blockchain runs your token.</p>
      <a className="security-link reveal is-in" href="/docs#wallet-security">Learn about wallet security <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
    </div>
  </section>

  <section className="section" id="faq">
    <div className="container faq-root">
      <div className="sec-head reveal is-in">
        <div className="kicker"><span className="dot"></span>07&nbsp;·&nbsp;FAQ</div>
        <h2>Quick answers.</h2>
      </div>
      <div className="faq-list reveal is-in">
        <details className="faq-item">
          <summary>Do I need any coding or Solidity knowledge?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
          <div className="a">No. Tokens are generated from a standardized BEP-20 smart contract template. You <a href="/create">configure the fields and controls visually</a> — the contract itself is built for you.</div>
        </details>
        <details className="faq-item">
          <summary>Which network will my token be deployed on?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
          <div className="a">BNB Smart Chain, using <a href="/docs#bep20-standard">the BEP-20 standard</a>. Deployment happens from your wallet directly to BNB Chain, and your configuration can be previewed on the BNB testnet before a production launch.</div>
        </details>
        <details className="faq-item">
          <summary>Who owns the token after deployment?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
          <div className="a">You do. Ownership of the smart contract is tied to the wallet address that deploys it, and you can <a href="/features">transfer or renounce it</a> later. The platform never holds your token.</div>
        </details>
        <details className="faq-item">
          <summary>How much does it cost to create a BEP-20 token?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
          <div className="a">Creating a BEP-20 token has two costs: the BNB Token Maker platform fee for generating the contract and the BNB Smart Chain network gas for deploying it. Both are paid in BNB and both are shown before you sign — the platform fee in the builder and the network gas in your wallet. See the <a href="/bep20-token-cost">cost breakdown</a>.</div>
        </details>
        <details className="faq-item">
          <summary>Do I need BNB in my wallet?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
          <div className="a">Yes. Your wallet needs enough BNB to cover the network fee for the deployment transaction on BNB Smart Chain.</div>
        </details>
        <details className="faq-item">
          <summary>Can I mint, burn or manage my token after deployment?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
          <div className="a">Yes, depending on which controls you enable. Mint, burn, pause and ownership management are optional smart contract features — they only exist in your contract if you turn them on.</div>
        </details>
        <details className="faq-item">
          <summary>Can BNB Token Maker access my private keys or funds?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
          <div className="a">No. BNB Token Maker is non-custodial. The interface builds the transaction, but only your wallet signs it — your private keys and funds never leave your control.</div>
        </details>
        <details className="faq-item">
          <summary>Can I review and verify the smart contract?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
          <div className="a">Yes. The generated source can be inspected before deployment, and the deployed smart contract can be verified on BscScan afterwards so anyone can read it.</div>
        </details>
      </div>
      <p className="faq-more reveal is-in"><a href="/faq">View all FAQs <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a></p>
    </div>
  </section>

  <section className="section" id="guides">
    <div className="container">
      <div className="sec-head">
        <div className="kicker"><span className="dot"></span>LEARN&nbsp;·&nbsp;BEP-20</div>
        <h2>Everything you need to create a token on BNB Smart Chain.</h2>
        <p>Short reads that explain the generator, the standard and the deployment flow — then send you to the product.</p>
      </div>
      <div className="learn-list">
        <a className="learn-item" href="/bep20-token-generator">
          <span className="learn-txt"><b>BEP-20 Token Generator</b><span>Understand how the generator works and configure your token.</span></span>
          <span className="learn-go">Explore the BEP-20 Token Generator <i className="fa-solid fa-arrow-right"></i></span>
        </a>
        <a className="learn-item" href="/create-bep20-token">
          <span className="learn-txt"><b>Create a BEP-20 Token</b><span>Step-by-step walkthrough from configuration to deployment.</span></span>
          <span className="learn-go">Read the creation guide <i className="fa-solid fa-arrow-right"></i></span>
        </a>
        <a className="learn-item" href="/bnb-token-generator">
          <span className="learn-txt"><b>BNB Token Generator</b><span>Why BNB and BEP-20 are not the same thing — and what that means for your launch.</span></span>
          <span className="learn-go">Understand the difference <i className="fa-solid fa-arrow-right"></i></span>
        </a>
        <a className="learn-item" href="/create-token-on-bnb-chain">
          <span className="learn-txt"><b>Create Token on BNB Chain</b><span>End-to-end deployment overview: fees, testnet, mainnet, verification.</span></span>
          <span className="learn-go">See the deployment flow <i className="fa-solid fa-arrow-right"></i></span>
        </a>
        <a className="learn-item" href="/bep20-token-cost">
          <span className="learn-txt"><b>BEP-20 Token Cost</b><span>Platform fee vs network gas, what affects them and what you pay before deploy.</span></span>
          <span className="learn-go">See the pricing breakdown <i className="fa-solid fa-arrow-right"></i></span>
        </a>
        <a className="learn-item" href="/bep20-vs-erc20">
          <span className="learn-txt"><b>BEP-20 vs ERC-20</b><span>Same token interface on two different chains — and how to choose between them.</span></span>
          <span className="learn-go">Compare the standards <i className="fa-solid fa-arrow-right"></i></span>
        </a>
        <a className="learn-item" href="/create-meme-coin-bnb-chain">
          <span className="learn-txt"><b>Create a Meme Coin on BNB Chain</b><span>No-code BEP-20 meme token setup: supply, controls and what&apos;s coming soon.</span></span>
          <span className="learn-go">Launch a meme coin <i className="fa-solid fa-arrow-right"></i></span>
        </a>
      </div>
    </div>
  </section>

  <section className="section" id="create">
    <div className="container">
      <div className="cta-band reveal is-in">
        <div className="cta-inner">
          <div className="cta-kicker">Ready when you are</div>
          <h2>Launch your BEP-20 token on BNB Smart Chain.</h2>
          <p>Configure the details, connect your wallet and deploy in about two minutes — no code, no custody, no middleman.</p>
        </div>
        <div className="cta-action">
          <a className="btn btn-dark btn-lg" href="/create">
            Create Token
            <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
          <span className="cta-note">no sign-up&nbsp;·&nbsp;network fees paid in BNB</span>
        </div>
      </div>
    </div>
  </section>

    </>
  );
}
