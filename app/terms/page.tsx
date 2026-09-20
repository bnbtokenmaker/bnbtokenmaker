import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { TERMS_WEBSITE } from "../../lib/schema";

export const metadata: Metadata = {
  title: "Terms of Service | BNB Token Maker",
  description: "Terms governing access to and use of BNB Token Maker.",
  robots: "index, follow, max-image-preview:large",
  alternates: { canonical: "https://bnbtokenmaker.com/terms" },
  openGraph: {
    title: "Terms of Service | BNB Token Maker",
    description: "Terms governing access to and use of BNB Token Maker.",
    url: "https://bnbtokenmaker.com/terms",
    siteName: "BNB Token Maker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service | BNB Token Maker",
    description: "Terms governing access to and use of BNB Token Maker.",
  },
};

export default function Page() {
  return (
    <>
<JsonLd data={TERMS_WEBSITE} />


  <section className="page" id="top">
    <div className="container">
      <header className="page-head reveal is-in">
        <div className="kicker"><span className="dot"></span>Legal</div>
        <h1>Terms of Service</h1>
        <p className="lede">Terms governing access to and use of BNB Token Maker.</p>
        <span className="legal-status"><i className="fa-solid fa-circle-info" aria-hidden="true"></i>Prototype build — final legal details to be confirmed before public release</span>
      </header>
      <div className="legal-doc">
{/*  TODO(pre-production): confirm the operating entity, legal structure and governing law before these Terms are finalised.  */}
<p>Please read these Terms of Service carefully before using BNB Token Maker.</p>

<section className="legal-sec">
  <h2><span className="lno">01</span>Acceptance of Terms</h2>
  <p>By accessing or using BNB Token Maker (&quot;the Service&quot;), you agree to these Terms. If you do not agree with any part of these Terms, you should not use the Service. Continued use of the Service after changes are published means you accept the changes.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">02</span>Description of the Service</h2>
  <p>BNB Token Maker is a web-based tool that helps you configure and generate <b>BEP-20 smart contracts</b> for deployment on <b>BNB Smart Chain</b>. You choose a token&apos;s details and features in the browser, and the Service prepares a contract for you to deploy. The Service is a <b>tool only</b>. It does not operate, control or endorse any token created using it, and it does not hold custody of your funds or assets.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">03</span>Wallets and Blockchain Transactions</h2>
  <p>Deploying a token happens through <b>your own wallet</b>. BNB Token Maker is <b>non-custodial</b>: we never access, store or ask you to provide your seed phrase, private keys or passwords. You are solely responsible for safeguarding your wallet credentials and for authorising wallet actions such as connecting, signing or broadcasting transactions.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">04</span>Platform Fees and Network Fees</h2>
  <p>Deploying a token requires payment in <b>BNB</b>, which covers two separate costs: a <b>platform fee</b> for the Service and the <b>network gas</b> charged by BNB Smart Chain for the deployment transaction. Fees are shown before deployment. Network gas is set by the blockchain and may change at any time; it is not controlled by the Service.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">05</span>User Responsibilities</h2>
  <p>You are responsible for:</p>
  <ul>
    <li>providing accurate configuration details for your token (name, symbol, decimals, supply and features);</li>
    <li>making sure you have the legal right and authority to create and deploy a token for your chosen purposes;</li>
    <li>keeping your wallet and private keys secure at all times;</li>
    <li>understanding the tax, legal and regulatory consequences of creating and holding a token in your jurisdiction.</li>
  </ul>
</section>

<section className="legal-sec">
  <h2><span className="lno">06</span>Token Configuration</h2>
  <p>When you configure a token, the options you select — such as name, symbol, decimals, initial supply and contract features — are written directly into the generated contract. You should review every setting before deployment, because the configuration becomes part of an immutable, publicly recorded contract on the blockchain.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">07</span>Smart Contract Deployment</h2>
  <p>The Service generates a smart contract and provides the interface to deploy it using your wallet. The deployment is a blockchain transaction broadcast by you. BNB Token Maker is not the operator of any contract you deploy, and we accept no responsibility for how a deployed contract behaves after launch.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">08</span>Irreversible Transactions</h2>
  <p>Blockchain transactions are generally <b>irreversible</b>. Once a deployment, transfer or configuration is recorded on the network, it usually cannot be undone, even if it was a mistake. You are responsible for verifying details before you approve any transaction in your wallet.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">09</span>Ownership and Control</h2>
  <p>Control of a deployed token depends on the configuration you choose, including whether ownership features are enabled and whether they are later renounced. Some features and ownership actions may be <b>irreversible</b>. Read the documentation and confirm what each feature does before deployment.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">10</span>Prohibited Use</h2>
  <p>You must not use the Service to:</p>
  <ul>
    <li>engage in any fraudulent, deceptive or unlawful activity;</li>
    <li>create tokens that are designed to defraud or deceive others;</li>
    <li>violate any applicable law, regulation or third-party right.</li>
  </ul>
  <p>We may restrict or deny access to the Service if we reasonably believe it is being used for prohibited purposes.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">11</span>Third-Party Services</h2>
  <p>The Service interacts with third-party tools and networks outside our control, including your wallet provider, blockchain nodes and explorers. Their terms, privacy practices and availability are their own responsibility. BNB Token Maker is not liable for the behaviour of any third-party service.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">12</span>Availability of the Service</h2>
  <p>The Service is provided on an <b>&quot;as is&quot;</b> and <b>&quot;as available&quot;</b> basis. We may update, suspend or discontinue features, or the Service as a whole, at any time and without notice. We do not guarantee that the Service will be available, error-free or uninterrupted.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">13</span>No Financial or Investment Advice</h2>
  <p>Nothing on BNB Token Maker is financial, investment or legal advice. We do not make any representation that a token created using the Service will increase in value, be listed, be tradeable or produce any return. Anyone creating or interacting with a token does so entirely at their own risk and should obtain independent advice where needed.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">14</span>Limitation of Liability</h2>
  <p>To the maximum extent permitted by law, BNB Token Maker and its operators shall not be liable for any indirect, incidental, special or consequential loss, or for any loss of funds, profits, data or goodwill, arising from your use of the Service, any smart contract, or any blockchain transaction. Your sole remedy is to stop using the Service.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">15</span>Changes to the Service</h2>
  <p>We may add, change or remove features, fees or behaviour of the Service from time to time. Where changes materially affect you, we will try to make them visible on this website, but we are not required to provide individual notice.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">16</span>Changes to These Terms</h2>
  <p>We may update these Terms from time to time. The latest version will always be published on this page with a revised date. Your continued use of the Service after changes are published constitutes acceptance of the updated Terms.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">17</span>Contact</h2>
  <p>If you have any questions about these Terms, you can reach us through the contact page.</p>
</section>
        <p className="legal-contact">Questions about these terms? <a href="/contact">Contact us <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a></p>
      </div>
    </div>
  </section>

    </>
  );
}
