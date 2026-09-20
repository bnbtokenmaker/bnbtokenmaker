import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { DISC_WEBSITE } from "../../lib/schema";

export const metadata: Metadata = {
  title: "Disclaimer | BNB Token Maker",
  description: "Important disclaimers about BNB Token Maker, token deployment and blockchain transactions.",
  robots: "index, follow, max-image-preview:large",
  alternates: { canonical: "https://bnbtokenmaker.com/disclaimer" },
  openGraph: {
    title: "Disclaimer | BNB Token Maker",
    description: "Important disclaimers about BNB Token Maker, token deployment and blockchain transactions.",
    url: "https://bnbtokenmaker.com/disclaimer",
    siteName: "BNB Token Maker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Disclaimer | BNB Token Maker",
    description: "Important disclaimers about BNB Token Maker, token deployment and blockchain transactions.",
  },
};

export default function Page() {
  return (
    <>
<JsonLd data={DISC_WEBSITE} />


  <section className="page" id="top">
    <div className="container">
      <header className="page-head reveal is-in">
        <div className="kicker"><span className="dot"></span>Legal</div>
        <h1>Disclaimer</h1>
        <p className="lede">Please read this disclaimer before using BNB Token Maker.</p>
        <span className="legal-status"><i className="fa-solid fa-circle-info" aria-hidden="true"></i>Prototype build — final legal details to be confirmed before public release</span>
      </header>
      <div className="legal-doc">
<p>Please read this disclaimer before using BNB Token Maker.</p>

<section className="legal-sec">
  <h2><span className="lno">01</span>Independent Service</h2>
  <p>BNB Token Maker is an independent tool and is not affiliated with or endorsed by <b>BNB Chain</b> or <b>Binance</b>. Any references to BNB, BBNB Smart Chain or BEP-20 on this site identify the networks and standards the tool works with; they do not imply any partnership or endorsement.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">02</span>No Affiliation</h2>
  <p>BNB Token Maker is a separate product from BNB Chain, Binance and their related companies. We do not control, and are not responsible for, any of those platforms or their services.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">03</span>No Financial Advice</h2>
  <p>Nothing on BNB Token Maker constitutes financial, investment, legal or tax advice. We make <b>no guarantee that a token created with the Service will gain value, be listed, be tradeable, or produce any return</b>. Crypto assets can lose all of their value. Do your own research and consult a professional adviser where appropriate.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">04</span>User Responsibility</h2>
  <p>You are responsible for every decision you make when using the Service, including token configuration, deployment and any later interaction with a contract you create. You must not rely on BNB Token Maker to protect you from mistakes, losses or unlawful activity.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">05</span>Smart Contracts and Blockchain Risk</h2>
  <p>Smart contracts, like all software, may contain bugs or behave unexpectedly even when generated from a standardised template. Blockchain networks carry technology, security and market risks. BNB Token Maker provides the deployment tool; it does not provide guarantees about the behaviour of any deployed contract.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">06</span>Irreversible Transactions</h2>
  <p>Once a transaction is broadcast and recorded on BNB Smart Chain, it is generally <b>final and irreversible</b>. You approve transactions at your own risk. Verify names, symbols, supply, features and fees carefully before confirming anything in your wallet.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">07</span>Token Features</h2>
  <p>Optional features such as minting, burning, pausing, transaction limits and wallet limits change how a contract behaves. Some features, once enabled, can be very difficult or impossible to reverse — including renouncing ownership. Read the documentation for each feature before enabling it.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">08</span>Third-Party Wallets and Networks</h2>
  <p>BNB Token Maker works with third-party wallets and blockchain networks that we do not operate. We are not responsible for bugs, outages, fees, security or behaviour of those third parties. Always use an official wallet, keep your seed phrase private and never share it with anyone.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">09</span>Network Fees</h2>
  <p>You pay a platform fee to BNB Token Maker and network gas to BNB Smart Chain, both in <b>BNB</b>. Network gas is determined by the blockchain and can change at any time. We do not control network gas and we cannot refund it once a transaction is broadcast.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">10</span>Regulatory Considerations</h2>
  <p>Laws around crypto assets, tokens and smart contracts differ widely and change over time. It is your responsibility to make sure your use of the Service and any token you create complies with the laws applicable to you. BNB Token Maker does not provide legal guidance.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">11</span>Availability and Errors</h2>
  <p>This website and the Service are provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any kind. Content may contain errors or become out of date. We may change or suspend features without notice.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">12</span>Contact</h2>
  <p>If you have questions about these disclaimers, reach us through the contact page.</p>
</section>
        <p className="legal-contact">Questions about this disclaimer? <a href="/contact">Contact us <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a></p>
      </div>
    </div>
  </section>

    </>
  );
}
