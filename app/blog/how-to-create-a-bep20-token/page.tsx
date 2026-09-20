import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../../components/JsonLd";
import { BPST_ARTICLE } from "../../../lib/schema";
import { BPST_WEBSITE } from "../../../lib/schema";

export const metadata: Metadata = {
  title: "How to Create a BEP-20 Token on BNB Smart Chain | BNB Token Maker",
  description: "A practical guide to the steps involved in configuring and deploying a BEP-20 token on BNB Smart Chain: token details, contract features, fees, deployment and security.",
  robots: "index, follow, max-image-preview:large",
  alternates: { canonical: "https://bnbtokenmaker.com/blog/how-to-create-a-bep20-token" },
  openGraph: {
    title: "How to Create a BEP-20 Token on BNB Smart Chain | BNB Token Maker",
    description: "A practical guide to the steps involved in configuring and deploying a BEP-20 token on BNB Smart Chain: token details, contract features, fees, deployment and security.",
    url: "https://bnbtokenmaker.com/blog/how-to-create-a-bep20-token",
    siteName: "BNB Token Maker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "How to Create a BEP-20 Token on BNB Smart Chain | BNB Token Maker",
    description: "A practical guide to the steps involved in configuring and deploying a BEP-20 token on BNB Smart Chain: token details, contract features, fees, deployment and security.",
  },
};

export default function Page() {
  return (
    <>
<JsonLd data={BPST_ARTICLE} />
<JsonLd data={BPST_WEBSITE} />


  <section className="page" id="top">
    <div className="container">
      <header className="post-head reveal is-in">
        <a className="kicker" href="/blog" aria-label="Back to the blog" style={{textDecoration:"none"}}><span className="dot"></span>Guide · BNB Token Maker Blog</a>
        <h1>How to Create a BEP-20 Token on BNB Smart Chain</h1>
        <p className="lede">A practical guide to understanding the steps involved in configuring and deploying a BEP-20 token.</p>
      </header>

      <div className="post-wrap">
        <aside className="post-toc reveal is-in" aria-label="Table of contents">
          <p className="post-toc-title"><i className="fa-solid fa-list" aria-hidden="true"></i>Table of contents</p>
          <button className="post-toc-btn" id="post-toc-btn" type="button" aria-expanded="false" aria-controls="post-toc-list"><span>On this page</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></button>
          <div className="post-toc-list" id="post-toc-list">
          <ol>
            <li><a href="#what-is-bep20"><span className="tno">01</span>What is a BEP-20 token?</a></li>
            <li><a href="#before-you-start"><span className="tno">02</span>What you need before you start</a></li>
            <li><a href="#configure"><span className="tno">03</span>Configure your token</a></li>
            <li><a href="#choose-features"><span className="tno">04</span>Choose token features</a></li>
            <li><a href="#connect-wallet"><span className="tno">05</span>Connect your wallet</a></li>
            <li><a href="#review-fees"><span className="tno">06</span>Review fees</a></li>
            <li><a href="#deploy"><span className="tno">07</span>Deploy</a></li>
            <li><a href="#after-deployment"><span className="tno">08</span>After deployment</a></li>
            <li><a href="#security"><span className="tno">09</span>Security considerations</a></li>
          </ol>
          </div>
        </aside>

        <article className="post-body">
          <section className="post-sec" id="what-is-bep20">
            <h2><span className="no">01</span>What is a BEP-20 token?</h2>
            <p>A BEP-20 token is a token created using the <b>BEP-20 standard</b> on <b>BNB Smart Chain</b>. The standard defines a common interface — name, symbol, decimals, balances, transfers and approvals — so any wallet or explorer that supports BEP-20 can read and move the token automatically.</p>
            <p>BNB Token Maker generates exactly this kind of contract from a standardized template. You configure the token&apos;s details and features in the browser, and the contract is built for you — no Solidity required. New to the concept? Read our <a href="/bep20-token-generator">BEP-20 token generator overview</a>.</p>
          </section>

          <section className="post-sec" id="before-you-start">
            <h2><span className="no">02</span>What you need before you start</h2>
            <p>A few things to have ready before you open the create flow:</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>A wallet</b> that supports BNB Smart Chain. Most browser and mobile wallets that handle BEP-20 work.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>BNB</b> on that wallet to cover the platform fee and the network gas for the deployment transaction.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>A clear token idea</b> — the name, symbol, decimals and initial supply you plan to use.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Optionally</b>, a testnet setup (Chain ID 97) where you can validate your configuration before a real launch.</span></li>
            </ul>
            <p>For a condensed version of these steps, see the <a href="/create-bep20-token">step-by-step creation guide</a>.</p>
          </section>

          <section className="post-sec" id="configure">
            <h2><span className="no">03</span>Configure your token</h2>
            <p>Four details define your token&apos;s identity. Each is written into the contract at deployment.</p>
            <h3 className="h4-sub">Name</h3>
            <p>The full token name, for example &quot;My Token&quot;. It&apos;s what wallets and explorers display first.</p>
            <h3 className="h4-sub">Symbol</h3>
            <p>The short ticker, for example &quot;MYT&quot;. Keep it short and memorable.</p>
            <h3 className="h4-sub">Initial supply</h3>
            <p>The total amount minted once, at deployment. For an 18-decimal token, decimals count against the total — a supply of 1,000,000 means 1,000,000 × 10<sup>18</sup> base units.</p>
            <h3 className="h4-sub">Decimals</h3>
            <p>18 is the BEP-20 default and the most compatible choice. You can set fewer, down to 0, if you want whole-number units.</p>
            <div className="callout">
              <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
              <span>The <b>name and symbol are locked forever</b> once the contract is deployed. Decide on them before you deploy.</span>
            </div>
          </section>

          <section className="post-sec" id="choose-features">
            <h2><span className="no">04</span>Choose token features</h2>
            <p>Beyond the BEP-20 foundation, you can enable optional contract features during configuration. Each one is only included if you turn it on. See the <a href="/features">full feature list</a> for details.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Burnable</b> — the owner can permanently remove tokens from circulation.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Mintable</b> — the owner can create additional supply after launch. Mutually exclusive with Fixed Supply.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Pausable</b> — the owner can pause and resume all transfers instantly.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Transaction limits</b> — a cap on the amount a single transfer can move, as a share of supply.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Wallet limits</b> — a cap on the amount any single wallet can hold.</span></li>
            </ul>
          </section>

          <section className="post-sec" id="connect-wallet">
            <h2><span className="no">05</span>Connect your wallet</h2>
            <p>BNB Token Maker is <b>non-custodial</b>. Connecting a wallet only shares the public address you approve — your private keys and seed phrase never leave your device.</p>
            <p>Every sensitive action, including the deployment itself, is a transaction you deliberately sign inside your own wallet. BNB Token Maker can&apos;t see your keys, move your funds or sign on your behalf.</p>
          </section>

          <section className="post-sec" id="review-fees">
            <h2><span className="no">06</span>Review fees</h2>
            <p>Deployment involves two separate costs, charged independently:</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Platform fee.</b> One fee for generating your contract through BNB Token Maker. It&apos;s shown in the create flow before you connect your wallet, and it&apos;s charged in BNB.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Network gas.</b> The fee BNB Smart Chain charges to confirm the deployment transaction. It&apos;s set by the network, paid in BNB, and your wallet always displays the exact amount before you sign.</span></li>
            </ul>
            <p>Make sure the deploying wallet holds enough BNB to cover both.</p>
          </section>

          <section className="post-sec" id="deploy">
            <h2><span className="no">07</span>Deploy</h2>
            <p>With the configuration reviewed, deployment is a single signed transaction:</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Wallet confirmation.</b> Your wallet asks you to confirm the network, the fee and the transaction details. Double-check the network against Chain ID 56.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>BNB Smart Chain transaction.</b> Once signed, the network processes the deployment. Confirmation is usually quick but varies with network conditions.</span></li>
            </ul>
          </section>

          <section className="post-sec" id="after-deployment">
            <h2><span className="no">08</span>After deployment</h2>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Contract address.</b> BNB Token Maker shows it the moment your transaction confirms — keep it, it&apos;s your token&apos;s identity.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Blockchain record.</b> The contract lives permanently on BNB Smart Chain and can be read on any public block explorer.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Enabled controls.</b> The deploying wallet is the owner and controls the features you enabled — unless you transfer or renounce ownership later.</span></li>
            </ul>
            <p>For the end-to-end deployment flow, see <a href="/create-token-on-bnb-chain">Create a Token on BNB Smart Chain</a>.</p>
          </section>

          <section className="post-sec" id="security">
            <h2><span className="no">09</span>Security considerations</h2>
            <p>Your seed phrase and private keys are the only way to control your wallet. Never share them with anyone — including customer support. BNB Token Maker support will never ask for them.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Keep your seed phrase offline and private.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Deploy from a dedicated wallet that you fully control.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Verify the network and fee shown in your wallet before signing.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Treat ownership carefully — renouncing locks the contract forever.</span></li>
            </ul>
          </section>
          <div className="post-cta reveal is-in">
            <h2>Ready to create your BEP-20 token?</h2>
            <p>Configure the details, choose your features and deploy from your wallet on BNB Smart Chain.</p>
            <div className="ct-actions">
              <a className="btn btn-dark btn-lg" href="/create">
                Create Token
                <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </a>
              <a className="btn btn-plain" href="/docs">Read the documentation</a>
            </div>
          </div>

          <nav className="related reveal is-in" aria-label="Related guides">
            <h2>Related guides</h2>
            <div className="related-grid">
              <a className="rd-card" href="/bep20-tokenomics">
                <span className="blg-cat">Token Design</span>
                <h3>BEP-20 Tokenomics: Planning Supply, Distribution and Decimals</h3>
                <span className="rd-cta">Read guide <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
              </a>
              <a className="rd-card" href="/bep20-token-security-checklist">
                <span className="blg-cat">Security</span>
                <h3>BEP-20 Token Security Checklist</h3>
                <span className="rd-cta">Read guide <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
              </a>
              <a className="rd-card" href="/verify-bep20-token">
                <span className="blg-cat">Guide</span>
                <h3>How to Verify a BEP-20 Token on BscScan</h3>
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
