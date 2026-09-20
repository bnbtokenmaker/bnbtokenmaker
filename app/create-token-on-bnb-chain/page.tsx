import type { Metadata } from "next";
import Link from "next/link";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { CTB_FAQ } from "../../lib/schema";
import { CTB_SOFT } from "../../lib/schema";
import { CTB_BREAD } from "../../lib/schema";
import { CTB_ORG } from "../../lib/schema";

export const metadata: Metadata = {
  title: "Create a Token on BNB Smart Chain | BNB Token Maker",
  description: "How to create a token on BNB Smart Chain: the deployment flow from configuration to contract address, what you need before you launch, and a pre-launch checklist.",
  robots: "index, follow, max-image-preview:large",
  alternates: { canonical: "https://bnbtokenmaker.com/create-token-on-bnb-chain" },
  openGraph: {
    title: "Create a Token on BNB Smart Chain | BNB Token Maker",
    description: "How to create a token on BNB Smart Chain: the deployment flow from configuration to contract address, what you need before you launch, and a pre-launch checklist.",
    url: "https://bnbtokenmaker.com/create-token-on-bnb-chain",
    siteName: "BNB Token Maker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Create a Token on BNB Smart Chain | BNB Token Maker",
    description: "How to create a token on BNB Smart Chain: the deployment flow from configuration to contract address, what you need before you launch, and a pre-launch checklist.",
  },
};

export default function Page() {
  return (
    <>
<JsonLd data={CTB_FAQ} />
<JsonLd data={CTB_SOFT} />
<JsonLd data={CTB_BREAD} />
<JsonLd data={CTB_ORG} />


<section className="hero land-hero" id="top">
    <div className="hero-bg" aria-hidden="true"></div>
    <div className="container">
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span className="sep" aria-hidden="true">/</span><span>Create a Token on BNB Smart Chain</span></nav>
      <div className="kicker"><span className="dot" aria-hidden="true"></span>Create a token&nbsp;&nbsp;&middot;&nbsp;&nbsp;<img className="net-ico" src="/logo-bnb-chain.svg" alt="" width="16" height="16" />&nbsp;BNB Smart Chain</div>
      <h1>Create a Token on BNB Smart Chain.</h1>
      <p className="lede">From configuration to a confirmed contract address &mdash; here is the deployment flow for a BEP-20 token on BNB Smart Chain (Chain ID 56), and what you need before you launch.</p>
      <div className="hero-ctas">
        <a className="btn btn-primary btn-lg" href="/create">Create Token on BNB Smart Chain <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        <a className="btn btn-ghost btn-lg" href="/docs#quick-start">Read the Documentation</a>
      </div>
      <ul className="land-facts">
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Standard BEP-20</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Chain ID 56</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Non-custodial</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Verifiable on BscScan</li>
      </ul>
    </div>
  </section>

  <section className="section reveal is-in" id="overview">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Overview</div>
        <h2>Creating tokens on BNB Smart Chain.</h2>
      </div>
      <div className="guide-sec">
        <p>All tokens on BNB Smart Chain are smart contracts deployed to the network. When you &ldquo;create a token&rdquo;, you are really deploying a contract that follows the BEP-20 standard &mdash; this is what gives the token its balances, transfers and approvals.</p>
        <p>You may see the network referred to as <strong>BSC</strong> (BNB Smart Chain) or <strong>BNB Chain</strong> &mdash; they describe the same network, launched in 2020 as Binance Smart Chain and later <a href="https://www.bnbchain.org/en/blog/bsc-is-now-bnb-chain-the-infrastructure-for-the-metafi-universe">rebranded by the official BNB Chain announcement</a>. On all these names, the token standard is BEP-20 and the chain ID is 56, so a token created through this flow is compatible with the wallets, exchanges and explorers that already support BSC.</p>
        <p>BNB Token Maker handles the contract for you. You provide the configuration, and your wallet deploys the result to BNB Smart Chain. Ownership of the deployed contract belongs to the wallet that deploys it. For a full step-by-step, see <a href="/create-bep20-token">how to create a BEP-20 token</a>; for terminology, the <a href="/bnb-token-generator">BNB token generator</a> page explains BNB vs BEP-20. Looking to launch a community token instead? See <a href="/create-meme-coin-bnb-chain">how to create a meme coin on BNB Smart Chain</a>.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="deploy-flow">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Deployment flow</div>
        <h2>What happens when you deploy a token.</h2>
      </div>
      <div className="guide-sec">
        <p>Each step below is visible on-chain or in your wallet &mdash; nothing happens outside your control:</p>
        <ol>
          <li><strong>Configuration</strong> &mdash; the token name, symbol, supply, decimals and optional controls are set before anything is signed.</li>
          <li><strong>Smart contract</strong> &mdash; the generator assembles a BEP-20 contract that exactly reflects the configuration.</li>
          <li><strong>Wallet signature</strong> &mdash; your wallet reviews and signs the deployment. No keys leave the wallet.</li>
          <li><strong>Transaction</strong> &mdash; the signed deployment is broadcast to BNB Smart Chain, with the network fee paid in BNB.</li>
          <li><strong>Network confirmation</strong> &mdash; BNB Smart Chain processes and confirms the transaction, writing the contract to the chain.</li>
          <li><strong>Contract address</strong> &mdash; the token is live at a public address, ready for source verification on BscScan.</li>
        </ol>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="network-requirements">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Before you launch</div>
        <h2>What you need before deploying.</h2>
      </div>
      <ul className="check-list">
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span>A <strong>wallet</strong> connected to BNB Smart Chain (Chain ID 56) that can sign transactions.</span></li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span>Enough <strong>BNB</strong> to cover the deployment network fee.</span></li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span>A finalized <strong>configuration</strong> &mdash; name, symbol, supply, decimals and controls.</span></li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span>Decisions on <strong>minting, pausing and ownership</strong> for the contract&rsquo;s lifecycle.</span></li>
      </ul>
      <p className="note">Full technical requirements are listed in the <a href="/docs#network-requirements">network requirements</a> section of the documentation. For the exact platform fee and how network gas is charged, see <a href="/bep20-token-cost">what it costs to create a BEP-20 token</a>.</p>
    </div>
  </section>

  <section className="section reveal is-in" id="features">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Features</div>
        <h2>Token features on BNB Smart Chain.</h2>
      </div>
      <div className="guide-sec">
        <p>Aside from standard BEP-20 transfers, a deployed token can include optional controls: <strong>minting</strong> to create more supply, <strong>burning</strong> to remove supply permanently, <strong>pausing</strong> to stop transfers in an emergency, and <strong>ownership management</strong> for the contract&rsquo;s admin role.</p>
        <p>Keep in mind that a feature only exists if it is enabled in the configuration &mdash; the contract contains exactly what you choose. Browse the <a href="/features">full feature reference</a> before deploying. Community projects often combine a large supply with max-transaction and max-wallet limits; a typical setup is shown in the <a href="/create-meme-coin-bnb-chain">meme coin configuration example</a>.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="security">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Security</div>
        <h2>Ownership and security after deployment.</h2>
      </div>
      <div className="guide-sec">
        <p>Once deployed, the token lives entirely on-chain. The generator is no longer involved &mdash; your wallet owns and controls the contract. This means wallet security is your responsibility: guard the private key, keep the seed phrase offline, and never share it.</p>
        <ul>
          <li><strong>Ownership</strong> &mdash; the deploying wallet holds the owner role and can transfer or renounce it. See <a href="/docs#ownership">ownership controls</a>.</li>
          <li><strong>Wallet security</strong> &mdash; protect the signing wallet; a lost key can mean lost control. See <a href="/docs#wallet-security">wallet security best practices</a>.</li>
          <li><strong>Verification</strong> &mdash; verify the contract source on BscScan so anyone can inspect what was deployed. See the <a href="/docs#deployment">deployment documentation</a>, or follow the step-by-step <a href="/verify-bep20-token">BscScan verification guide</a>.</li>
          <li><strong>Wallet display</strong> &mdash; your token won&apos;t appear in a wallet until you add its address. See <a href="/add-bep20-token-to-wallet">how to add a BEP-20 token to your wallet</a>.</li>
        </ul>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="checklist">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Launch checklist</div>
        <h2>Review this before you launch.</h2>
      </div>
      <div className="guide-sec">
        <p>A final pass before confirming the deployment transaction:</p>
        <ul>
          <li><strong>Token name &amp; symbol</strong> &mdash; correct spelling and formatting, as they will be shown publicly.</li>
          <li><strong>Total supply &amp; decimals</strong> &mdash; the amounts in your configuration are what get minted.</li>
          <li><strong>Minting</strong> &mdash; decided whether supply can be increased after launch.</li>
          <li><strong>Ownership</strong> &mdash; decided who holds it after deployment, and whether to keep or renounce.</li>
          <li><strong>Wallet balance</strong> &mdash; confirmed the wallet holds enough BNB for the network fee.</li>
        </ul>
        <p>The documentation&rsquo;s <a href="/docs#before-you-deploy">pre-deployment checklist</a> mirrors these points in more detail.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="faq">
    <div className="container faq-root">
      <div className="sec-head">
        <div className="kicker">FAQ</div>
        <h2>Deployment questions.</h2>
      </div>
      <div className="faq-list">
        <details className="faq-item">
          <summary>What does ‘deploy a token’ mean?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">Deploying creates the token&rsquo;s smart contract on BNB Smart Chain. Once confirmed, the contract has a permanent address and the token exists on-chain.</div>
        </details>
        <details className="faq-item">
          <summary>Which network are tokens deployed on?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">BNB Smart Chain (Chain ID 56), using the BEP-20 standard. Deployment transactions are paid for in BNB.</div>
        </details>
        <details className="faq-item">
          <summary>How is the deployment transaction signed?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">By your wallet. BNB Token Maker prepares the deployment, and your wallet signs and broadcasts the transaction. Your private key never leaves your wallet.</div>
        </details>
        <details className="faq-item">
          <summary>What do I need before deploying?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">A wallet connected to BNB Smart Chain, enough BNB to cover the network fee, and your token configuration &mdash; name, symbol, supply, decimals and optional controls.</div>
        </details>
        <details className="faq-item">
          <summary>How do I know my token was deployed correctly?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">After confirmation, the contract receives a public address. The generated source is available for verification on BscScan, so you can inspect the contract yourself.</div>
        </details>
      </div>
      <p className="faq-more"><a href="/faq">View all FAQs <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a></p>
    </div>
  </section>

  <section className="section reveal is-in" id="create">
    <div className="container">
      <div className="cta-band">
        <div className="cta-inner">
          <div className="cta-kicker">Launch your token</div>
          <h2>Deploy a token on BNB Smart Chain today.</h2>
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
