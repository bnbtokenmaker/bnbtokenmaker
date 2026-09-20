import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { SEC_ARTICLE } from "../../lib/schema";
import { SEC_FAQ } from "../../lib/schema";
import { SEC_WEBSITE } from "../../lib/schema";

export const metadata: Metadata = {
  title: "BEP-20 Token Security Checklist | BNB Token Maker",
  description: "A launch-day checklist for reviewing a BEP-20 token before deployment: network, token details, minting, ownership, limits, wallet security and the final signing step.",
  robots: "index, follow, max-image-preview:large",
  alternates: { canonical: "https://bnbtokenmaker.com/bep20-token-security-checklist" },
  openGraph: {
    title: "BEP-20 Token Security Checklist | BNB Token Maker",
    description: "A launch-day checklist for reviewing a BEP-20 token before deployment: network, token details, minting, ownership, limits, wallet security and the final signing step.",
    url: "https://bnbtokenmaker.com/bep20-token-security-checklist",
    siteName: "BNB Token Maker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BEP-20 Token Security Checklist | BNB Token Maker",
    description: "A launch-day checklist for reviewing a BEP-20 token before deployment: network, token details, minting, ownership, limits, wallet security and the final signing step.",
  },
};

export default function Page() {
  return (
    <>
<JsonLd data={SEC_ARTICLE} />
<JsonLd data={SEC_FAQ} />
<JsonLd data={SEC_WEBSITE} />


  <section className="page" id="top">
    <div className="container">
      <header className="post-head reveal is-in">
        <a className="kicker" href="/blog" aria-label="Back to the blog" style={{textDecoration:"none"}}><span className="dot"></span>Guide · BNB Token Maker Blog</a>
        <h1>BEP-20 Token Security Checklist: What to Verify Before Launch</h1>
        <p className="lede">A launch-day review of the things that determine who can control your token — from network selection to ownership — before you sign the deployment.</p>
      </header>

      <div className="post-wrap">
        <aside className="post-toc reveal is-in" aria-label="Table of contents">
          <p className="post-toc-title"><i className="fa-solid fa-list" aria-hidden="true"></i>Table of contents</p>
          <button className="post-toc-btn" id="post-toc-btn" type="button" aria-expanded="false" aria-controls="post-toc-list"><span>On this page</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></button>
          <div className="post-toc-list" id="post-toc-list">
          <ol>
            <li><a href="#what-this-is"><span className="tno">01</span>What this checklist is and how to use it</a></li>
            <li><a href="#verify-network"><span className="tno">02</span>Verify the network before everything else</a></li>
            <li><a href="#token-details"><span className="tno">03</span>Check name, symbol, supply and decimals</a></li>
            <li><a href="#minting"><span className="tno">04</span>Review minting and burning permissions</a></li>
            <li><a href="#ownership"><span className="tno">05</span>Ownership: keep, transfer or renounce</a></li>
            <li><a href="#limits"><span className="tno">06</span>Max Transaction and Max Wallet settings</a></li>
            <li><a href="#lists"><span className="tno">07</span>Blacklist and Whitelist trade-offs</a></li>
            <li><a href="#wallet-security"><span className="tno">08</span>Wallet security before you sign</a></li>
            <li><a href="#final-review"><span className="tno">09</span>Final review: fees and the signing step</a></li>
            <li><a href="#after-deployment"><span className="tno">10</span>After deployment: your first checks</a></li>
            <li><a href="#faq"><span className="tno">11</span>Frequently asked questions</a></li>
          </ol>
          </div>
        </aside>

        <article className="post-body">
          <section className="post-sec" id="what-this-is">
            <h2><span className="no">01</span>What this checklist is and how to use it</h2>
            <p>This checklist walks through the settings and habits that determine <b>who can control your token</b> after deployment. It&apos;s a review list, not a test: no single item makes a token &quot;secure&quot;, and no setting can promise that. The goal is to enter the deployment transaction with clear answers to every question below.</p>
            <p>Each item maps to something you can verify in the <a href="/create">BNB Token Maker builder</a> or in your wallet before you sign. For the deeper security trade-offs, our <a href="/verify-bep20-token">contract verification guide</a> explains what a verified contract does and doesn&apos;t mean.</p>
          </section>

          <section className="post-sec" id="verify-network">
            <h2><span className="no">02</span>Verify the network before everything else</h2>
            <p>A token exists on the network where it&apos;s deployed. Deploying on the wrong network is the easiest irreversible mistake to make.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>BNB Smart Chain mainnet</b> is Chain ID <b>56</b> and uses BNB. This is where a public token should go.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Testnet</b> is Chain ID <b>97</b>. Useful for validating a configuration, but testnet tokens carry no value.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Check the network shown inside your wallet before every signature — a wallet can be connected to a different chain than you expect.</span></li>
            </ul>
            <p>Reference the exact values on our <a href="/docs#network-reference">network reference</a> page and confirm them against your wallet&apos;s view of the chain.</p>
          </section>

          <section className="post-sec" id="token-details">
            <h2><span className="no">03</span>Check name, symbol, supply and decimals</h2>
            <p>These values are written into the contract at deployment and cannot be changed afterwards. Verify each one on the configuration screen as if it were final — because it is.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Name and symbol.</b> No typos, no order errors — the ticker and name are what wallets and explorers will show.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Total supply.</b> Confirm the exact number and digits you intend to mint.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Decimals.</b> 18 is the BEP-20 default and the most compatible choice.</span></li>
            </ul>
            <p>For guidance on how these choices interact, see <a href="/bep20-tokenomics">BEP-20 tokenomics</a> before you finalize them.</p>
          </section>

          <section className="post-sec" id="minting">
            <h2><span className="no">04</span>Review minting and burning permissions</h2>
            <p>Minting and burning are the two features that directly change supply. Whoever holds the owner role holds both — so these questions matter twice as much.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Mintable.</b> If enabled, more supply can be created at any time by the owner. Ask: who is the owner, and what happens to that authority later?</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Burnable.</b> If enabled, supply can be permanently removed by the owner. Burns are one-way, so any burn plan should be deliberate.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Pausable.</b> Transfers can be halted by the owner. Consider what it means if a pause is ever triggered unexpectedly.</span></li>
            </ul>
            <p>The <a href="/features#supply-controls">supply controls</a> section of the features page lists exactly what each enabled feature does.</p>
          </section>

          <section className="post-sec" id="ownership">
            <h2><span className="no">05</span>Ownership: keep, transfer or renounce</h2>
            <p>The deploying wallet is the owner by default and controls every enabled feature. Decide what happens to that role before launch, and state it out loud.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Keep.</b> The owner keeps full control of enabled functions. Simple, but the authority stays centralized in one wallet.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Transfer.</b> Ownership moves to another address — useful if operations and the deploying wallet are separate.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Renounce.</b> The owner role is given up. See the next section for what renouncing does and does not mean.</span></li>
            </ul>
            <p>Ownership is a feature you can review in the builder. The precise mechanics are documented in our <a href="/docs#ownership">ownership documentation</a>.</p>
          </section>

          <section className="post-sec" id="limits">
            <h2><span className="no">06</span>Max Transaction and Max Wallet settings</h2>
            <p>These limits cap how much a transaction can move and how much one wallet can hold, expressed as a share of total supply.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Max Transaction.</b> A cap per transfer. Good for pacing, but remember it also applies to your own distribution moves.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Max Wallet.</b> A cap per wallet balance. Holders who need to receive or move large amounts will hit it.</span></li>
            </ul>
            <p>Pick percentages that match how the tokens will actually move. There is no universal value — a limit that fits one distribution plan can break another.</p>
          </section>

          <section className="post-sec" id="lists">
            <h2><span className="no">07</span>Blacklist and Whitelist trade-offs</h2>
            <p>List-based features give the owner live control over addresses that can use the token. That flexibility is also centralization.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Blacklist.</b> The owner can add addresses that can no longer transfer. It&apos;s a moderation tool with a compliance cost — and it&apos;s owner-dependent.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Whitelist.</b> The owner can restrict transfers to approved addresses. Useful for gated launches, fully at the owner&apos;s discretion.</span></li>
            </ul>
            <p>Whichever you choose, recognize that <b>the owner can change the lists</b>. That is the point, and it is also the trade-off. The <a href="/features#access-controls">access controls</a> section describes both options.</p>
          </section>

          <section className="post-sec" id="wallet-security">
            <h2><span className="no">08</span>Wallet security before you sign</h2>
            <p>The most security-sensitive asset in the entire process is your wallet&apos;s private key. No contract setting protects it.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Keep your seed phrase offline and private. Nobody — including BNB Token Maker support — will ever ask for it.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Deploy from a dedicated wallet you fully control, not one you share or access casually.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Confirm every request your wallet shows you before signing — network, recipient, amount and fee.</span></li>
            </ul>
            <p>For wallet-facing steps after launch, our <a href="/add-bep20-token-to-wallet">add a BEP-20 token to your wallet</a> guide covers the display side without ever touching keys.</p>
          </section>

          <section className="post-sec" id="final-review">
            <h2><span className="no">09</span>Final review: fees and the signing step</h2>
            <p>Deployment asks for two separate costs, and both must be clear to you before anything is signed:</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Platform fee.</b> Shown in the create flow in BNB before you connect your wallet. Always review it on your own screen.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Network gas.</b> Set by BNB Smart Chain, paid in BNB. Your wallet displays the exact gas before you confirm.</span></li>
            </ul>
            <p>Break down both values before you start in our <a href="/bep20-token-cost">BEP-20 token cost guide</a>. When the wallet prompt appears, check the network (Chain ID 56), the fee and the contract details one final time.</p>
          </section>

          <section className="post-sec" id="after-deployment">
            <h2><span className="no">10</span>After deployment: your first checks</h2>
            <p>Once the transaction confirms, run a short verification pass on the result:</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Contract address.</b> Save it. It&apos;s the token&apos;s identity on-chain.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Balance check.</b> Confirm your deploying wallet shows the expected initial supply at the expected decimals.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Source verification.</b> Deploying and verifying are different steps; see our <a href="/verify-bep20-token">BscScan verification guide</a> for the optional transparency step that follows deployment.</span></li>
            </ul>
            <p>If anything in the configuration looks wrong after deployment, remember that most values cannot be changed — the checklist is why this matters.</p>
          </section>

          <section className="post-sec" id="faq">
            <h2><span className="no">11</span>Frequently asked questions</h2>
            <div className="faq-root">
              <div className="faq-list">
                <details className="faq-item">
                  <summary>Does verifying a contract on a block explorer make it secure?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
                  <div className="a">No. Verification publishes the source code of the deployed contract so anyone can read it. It is a transparency step, not a security audit and not a guarantee that the code behaves well.</div>
                </details>
                <details className="faq-item">
                  <summary>Does renouncing ownership make my token safe?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
                  <div className="a">No single setting makes a token safe. Renouncing removes the owner control functions, which can reduce centralization risk, but the actual contract behavior is what matters - review the code and the settings you enabled before launch.</div>
                </details>
                <details className="faq-item">
                  <summary>Should I ever share my seed phrase?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
                  <div className="a">No. Your seed phrase belongs only to you, and no legitimate party - including BNB Token Maker support - will ever ask for it. Anyone who asks is trying to access your wallet.</div>
                </details>
              </div>
            </div>
          </section>
          <div className="post-cta reveal is-in">
            <h2>Launch with your checklist done</h2>
            <p>Keep this checklist in your launch notes, then configure every setting and deploy from your own wallet on BNB Smart Chain.</p>
            <div className="ct-actions">
              <a className="btn btn-dark btn-lg" href="/create">
                Create Token
                <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </a>
              <a className="btn btn-plain" href="/features">Review the feature list</a>
            </div>
          </div>

          <nav className="related reveal is-in" aria-label="Related guides">
            <h2>Related guides</h2>
            <div className="related-grid">
              <a className="rd-card" href="/verify-bep20-token">
                <span className="blg-cat">Guide</span>
                <h3>How to Verify a BEP-20 Token on BscScan</h3>
                <span className="rd-cta">Read guide <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
              </a>
              <a className="rd-card" href="/bep20-tokenomics">
                <span className="blg-cat">Token Design</span>
                <h3>BEP-20 Tokenomics: Planning Supply, Distribution and Decimals</h3>
                <span className="rd-cta">Read guide <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
              </a>
              <a className="rd-card" href="/add-bep20-token-to-wallet">
                <span className="blg-cat">Guide</span>
                <h3>How to Add a BEP-20 Token to Your Wallet</h3>
                <span className="rd-cta">Read guide <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
              </a>
            </div>
          </nav>
        </article>
      </div>
    </div>
  </section>

    </>
  );
}
