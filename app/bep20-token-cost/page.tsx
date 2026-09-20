import type { Metadata } from "next";
import Link from "next/link";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { COST_FAQ } from "../../lib/schema";
import { COST_ORG } from "../../lib/schema";
import { COST_BREAD } from "../../lib/schema";
import { COST_SOFT } from "../../lib/schema";

export const metadata: Metadata = {
  title: "BEP-20 Token Creation Cost & BNB Chain Fees | BNB Token Maker",
  description: "The cost to create a BEP-20 token on BNB Smart Chain has two parts: the BNB Token Maker platform fee and the BNB network gas. See what affects them and what you pay before deploy.",
  robots: "index, follow, max-image-preview:large",
  alternates: { canonical: "https://bnbtokenmaker.com/bep20-token-cost" },
  openGraph: {
    title: "BEP-20 Token Creation Cost & BNB Chain Fees | BNB Token Maker",
    description: "The cost to create a BEP-20 token on BNB Smart Chain has two parts: the BNB Token Maker platform fee and the BNB network gas. See what affects them and what you pay before deploy.",
    url: "https://bnbtokenmaker.com/bep20-token-cost",
    siteName: "BNB Token Maker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BEP-20 Token Creation Cost & BNB Chain Fees | BNB Token Maker",
    description: "The cost to create a BEP-20 token on BNB Smart Chain has two parts: the BNB Token Maker platform fee and the BNB network gas. See what affects them and what you pay before deploy.",
  },
};

export default function Page() {
  return (
    <>
<JsonLd data={COST_FAQ} />
<JsonLd data={COST_ORG} />
<JsonLd data={COST_BREAD} />
<JsonLd data={COST_SOFT} />


<section className="hero land-hero" id="top">
    <div className="hero-bg" aria-hidden="true"></div>
    <div className="container">
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span className="sep" aria-hidden="true">/</span><span>BEP-20 Token Creation Cost</span></nav>
      <div className="kicker"><span className="dot" aria-hidden="true"></span>BEP-20 token costs&nbsp;&nbsp;&middot;&nbsp;&nbsp;<img className="net-ico" src="/logo-bnb-chain.svg" alt="" width="16" height="16" />&nbsp;BNB Smart Chain</div>
      <h1>How Much Does It Cost to Create a BEP-20 Token?</h1>
      <p className="lede">Two separate costs add up to your total: the BNB Token Maker platform fee for generating the contract and the BNB Smart Chain network gas for deploying it. They are charged independently, both in BNB. Here&rsquo;s what each one is and what affects it.</p>
      <div className="hero-ctas">
        <a className="btn btn-primary btn-lg" href="/create">See Price &amp; Create Token <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        <a className="btn btn-ghost btn-lg" href="/create-token-on-bnb-chain">How Deployment Works</a>
      </div>
      <ul className="land-facts">
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Two costs, never mixed</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Price shown before you connect</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Gas shown before you sign</li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i>Paid in BNB</li>
      </ul>
    </div>
  </section>

  <section className="section reveal is-in" id="cost-explained">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">BEP-20 token creation cost explained</div>
        <h2>Two separate buckets: platform fee and network gas.</h2>
        <p>If you&rsquo;re asking &ldquo;how much does a BEP-20 token cost&rdquo;, separate the answer into the fee you pay BNB Token Maker and the gas you pay BNB Smart Chain. Neither is hidden inside the other.</p>
      </div>
      <div className="config-grid">
        <div className="config-item"><span className="ic"><i className="fa-solid fa-file-contract" aria-hidden="true"></i></span><div><b>Platform fee</b><span>One fee for generating your BEP-20 contract through BNB Token Maker. You see it in the create flow before you connect your wallet. It is charged in BNB.</span></div></div>
        <div className="config-item"><span className="ic"><i className="fa-solid fa-gas-pump" aria-hidden="true"></i></span><div><b>Network gas</b><span>The fee BNB Smart Chain charges to confirm your deployment transaction. It is set by the network, paid in BNB and shown in your wallet before you sign.</span></div></div>
      </div>
      <p className="note">The platform fee covers only the contract generation service. Gas is always paid to BNB Smart Chain, not to BNB Token Maker.</p>
    </div>
  </section>

  <section className="section reveal is-in" id="price-breakdown">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Platform fee vs network gas</div>
        <h2>How the two costs compare.</h2>
        <p>This is how each cost behaves in the create flow, based on the pricing currently shown in the builder.</p>
      </div>
      <div className="def-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Cost Type</th>
              <th scope="col">Purpose</th>
              <th scope="col">Fixed or Variable</th>
              <th scope="col">Paid In</th>
              <th scope="col">When Charged</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="k">Platform fee &mdash; base</span></td>
              <td>Generating the standard BEP-20 contract with fixed supply and ownership controls.</td>
              <td>Fixed base price</td>
              <td>BNB</td>
              <td>Shown in the builder before you connect your wallet</td>
            </tr>
            <tr>
              <td><span className="k">Platform fee &mdash; add-ons</span></td>
              <td>Optional controls added to the contract (burnable, mintable, pausable, max transaction, max wallet, blacklist, whitelist).</td>
              <td>Variable &mdash; depends on which features you select</td>
              <td>BNB</td>
              <td>Added to your platform total as you configure</td>
            </tr>
            <tr>
              <td><span className="k">Network gas</span></td>
              <td>Paying BNB Smart Chain to confirm the deployment transaction.</td>
              <td>Variable &mdash; set by the network</td>
              <td>BNB</td>
              <td>Shown in your wallet just before you sign</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">Base and add-on prices are the values currently set in the create flow and can change. The add-on list is limited to the controls the builder supports today.</p>
    </div>
  </section>

  <section className="section reveal is-in" id="what-affects">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">What affects the cost?</div>
        <h2>Two inputs move your total: features and network demand.</h2>
      </div>
      <div className="guide-sec">
        <p><strong>The platform side.</strong> Your platform total starts from the base contract and grows only when you enable optional controls. In the current builder, the base BEP-20 contract is included at a base platform fee, and each add-on surcharge is shown next to the toggle so you know the exact amount before anything is signed.</p>
        <p><strong>The network side.</strong> The deployment fee is determined by BNB Smart Chain itself, not by the platform. It moves with demand and cannot be set from the builder.</p>
        <p>Want to preview the exact numbers for your configuration? Open the <a href="/create">token builder</a> and watch the platform total update as you toggle features.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="why-gas-changes">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Why can network gas change?</div>
        <h2>Gas is set by the chain, not by us.</h2>
      </div>
      <div className="guide-sec">
        <p>Every transaction on BNB Smart Chain pays a fee to the network. That fee follows supply and demand for block space &mdash; when many transactions compete, validators prioritize higher bids and the fee rises; when the chain is quiet, it falls.</p>
        <p>This is why we don&rsquo;t publish a specific gas number here: it is a live network value, not a fixed price. Your wallet always shows the exact amount before you approve, so you can compare, wait for a quieter moment or proceed if the fee is acceptable.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="need-bnb">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Do I need BNB?</div>
        <h2>Yes &mdash; BNB is the currency of BNB Smart Chain.</h2>
      </div>
      <div className="guide-sec">
        <p>BNB is the native asset of BNB Smart Chain. It is what wallets use to pay gas, and it is also how the platform fee is charged. Before you deploy, make sure the wallet you sign with holds enough BNB to cover both amounts.</p>
        <p>The two are never mixed: your wallet pays the platform fee and the network gas in the same confirmed flow, but they are separate transactions going to separate recipients &mdash; the platform service and the chain respectively.</p>
      </div>
    </div>
  </section>

  <section className="section reveal is-in" id="before-deploy">
    <div className="container">
      <div className="sec-head">
        <div className="kicker">Before you deploy</div>
        <h2>Review this before you pay anything.</h2>
      </div>
      <ul className="check-list">
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span><strong>Network</strong> &mdash; BNB Smart Chain (Chain ID 56) is selected in your wallet.</span></li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span><strong>Token configuration</strong> &mdash; name, symbol, supply and decimals are final.</span></li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span><strong>Selected features</strong> &mdash; you know which optional controls are in the contract.</span></li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span><strong>Platform fee</strong> &mdash; the total is confirmed in the builder summary.</span></li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span><strong>Estimated network gas</strong> &mdash; the amount shown in your wallet prompt matches your expectation.</span></li>
        <li><i className="fa-solid fa-check" aria-hidden="true"></i><span><strong>Wallet BNB balance</strong> &mdash; enough BNB to cover both costs is available.</span></li>
      </ul>
    </div>
  </section>

  <section className="section reveal is-in" id="faq">
    <div className="container faq-root">
      <div className="sec-head">
        <div className="kicker">FAQ</div>
        <h2>BEP-20 token cost questions.</h2>
      </div>
      <div className="faq-list">
        <details className="faq-item">
          <summary>How much does it cost to create a BEP-20 token?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">Creating a BEP-20 token involves two separate costs: the BNB Token Maker platform fee for generating the contract, and the BNB Smart Chain network gas for the deployment transaction. The platform fee is shown in the builder before you connect your wallet; the network gas is set by the chain and shown in your wallet before you sign.</div>
        </details>
        <details className="faq-item">
          <summary>Is network gas included in the platform fee?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">No. Network gas is a separate cost paid to BNB Smart Chain, not to BNB Token Maker. The platform fee covers generating your contract and the two are never mixed.</div>
        </details>
        <details className="faq-item">
          <summary>Why does BNB Smart Chain gas change?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">Network gas is set by the chain based on demand and congestion. Busy periods cost more, quieter periods cost less. Your wallet always shows the exact network fee before you approve the deployment, so you can wait and retry if it is higher than you want.</div>
        </details>
        <details className="faq-item">
          <summary>Do I need BNB in my wallet?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">Yes. BNB is the native currency of BNB Smart Chain, so your wallet needs enough BNB to cover both the platform fee and the network gas for the deployment transaction.</div>
        </details>
        <details className="faq-item">
          <summary>Can token features affect the platform fee?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">Yes. The base BEP-20 contract is included at a base platform price, and optional controls such as burn, mint, pause, max transaction, max wallet, blacklist and whitelist add a small per-feature surcharge. The exact total is shown in the builder as you configure.</div>
        </details>
        <details className="faq-item">
          <summary>Can I review the cost before deployment?<span className="plus"><i className="fa-solid fa-plus" aria-hidden="true"></i></span></summary>
          <div className="a">Yes. The builder shows your platform fee total as you select features, and your wallet shows the network gas amount just before you sign. You only pay after you explicitly confirm both.</div>
        </details>
      </div>
      <p className="faq-more"><a href="/faq">View all FAQs <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a></p>
    </div>
  </section>

  <section className="section reveal is-in" id="create">
    <div className="container">
      <div className="cta-band">
        <div className="cta-inner">
          <div className="cta-kicker">Ready to see your exact cost?</div>
          <h2>Open the builder and get an itemized price for your token.</h2>
          <p>Your platform total updates as you configure &mdash; no guesswork.</p>
        </div>
        <div className="cta-action">
          <a className="btn btn-dark btn-lg" href="/create">See Price &amp; Create Token <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
          <span className="cta-note">no sign-up&nbsp;&middot;&nbsp;platform fee and network gas in BNB</span>
        </div>
      </div>
    </div>
  </section>

    </>
  );
}
