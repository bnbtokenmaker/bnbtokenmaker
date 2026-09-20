import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import {
  PRIVACY_WEBSITE
} from "../../lib/schema";

export const metadata: Metadata = {
  title: "Privacy Policy | BNB Token Maker",
  description: "How information is handled when you use BNB Token Maker.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | BNB Token Maker",
    description: "How information is handled when you use BNB Token Maker.",
    url: "https://bnbtokenmaker.com/privacy",
    siteName: "BNB Token Maker",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | BNB Token Maker",
    description: "How information is handled when you use BNB Token Maker.",
  },
};

export default function Page() {
  return (
    <>
      <JsonLd data={PRIVACY_WEBSITE} />


  <section className="page" id="top">
    <div className="container">
      <header className="page-head reveal is-in">
        <div className="kicker"><span className="dot"></span>Legal</div>
        <h1>Privacy Policy</h1>
        <p className="lede">How information is handled when you use BNB Token Maker.</p>
        <span className="legal-status"><i className="fa-solid fa-circle-info" aria-hidden="true"></i>Prototype build — final legal details to be confirmed before public release</span>
      </header>
      <div className="legal-doc">
{/*  TODO(pre-production): confirm the entity, providers and infrastructure before this policy is finalised.  */}
<p>This policy explains what information BNB Token Maker may handle when you use the Service, and how we treat it. It is written for a prototype build: as the service matures, this page will be updated to reflect how information is actually processed.</p>

<section className="legal-sec">
  <h2><span className="lno">01</span>Overview</h2>
  <p>BNB Token Maker is designed to be <b>non-custodial</b> and to keep most of the token creation process running on your own device. In general, the less information that passes through our systems, the better. This policy describes what little information may be involved.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">02</span>Information You Provide</h2>
  <p>If the contact form is enabled, you may choose to provide your <b>name, email address, selected topic and message</b> when contacting us. You are under no obligation to provide this information, and the contact form does not collect it unless you submit it.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">03</span>Wallet Information</h2>
  <p>BNB Token Maker <b>never asks users to provide seed phrases or private keys</b>. When you use a wallet or create using a connected wallet, only the actions that need your wallet — such as approving a deployment — are initiated by you. We do not collect, store or access your private key or seed phrase, and you should never share them with us or anyone else.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">04</span>Blockchain Data</h2>
  <p>When a token is deployed, the <b>configuration of the contract and the public address of the deploying wallet</b> are recorded on the blockchain. This data is <b>public and permanent</b>. Anyone can read deployed contracts and transaction history through an explorer. On-chain records cannot be deleted.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">05</span>Technical Information</h2>
  <p>Like most websites, the infrastructure serving this site may process basic technical data such as IP addresses, browser type and request logs for security and operational purposes. Any such data is handled as operational data and is not used to build profiles of visitors.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">06</span>Cookies and Local Storage</h2>
  <p>The Service uses your browser&apos;s <b>local storage</b> to remember your theme preference (light or dark) under a single key. This stays on your device and is not transmitted. We do not currently use advertising cookies or third-party tracking cookies.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">07</span>Analytics</h2>
  <p>At present, the prototype does not use any analytics tooling. If analytics are added in the future, this policy will be updated to explain exactly what is collected and how it is used.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">08</span>Contact Form Data</h2>
  <p>As of this prototype build, the contact form <b>does not send or store messages anywhere</b>. It exists to validate input and demonstrate the intended flow. When message delivery and storage are connected to production infrastructure, this section will be updated to describe how contact messages are transmitted, stored and retained.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">09</span>How Information Is Used</h2>
  <p>Any information handled is used only for the purposes for which it was provided: to operate the Service, to respond to enquiries, to keep the site working and secure, and to comply with legal obligations. We do not sell personal information.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">10</span>Data Sharing</h2>
  <p>We do not sell or rent personal information. We may share information only (i) with service providers needed to run the Service, (ii) where required by law, or (iii) with your consent. Blockchain data shared is inherently public and cannot be recalled.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">11</span>Data Retention</h2>
  <p>We keep information only as long as needed for the purposes described in this policy or as required by law. Data already recorded on the blockchain, including deployed contract configurations and transaction history, is permanent by design of the network.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">12</span>Security</h2>
  <p>We follow reasonable technical and organisational measures to protect the Service. Because the token creation flow is built to run in your browser and transactions are approved by you, the exposure of sensitive data through the Service is minimised. No method of storage or transmission is fully secure, and we cannot guarantee absolute security.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">13</span>Third-Party Services</h2>
  <p>You may, in the course of using the Service, interact with third parties such as wallet providers, blockchain nodes, explorers or exchanges. Their privacy practices are governed by their own policies, not this one.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">14</span>Your Choices</h2>
  <ul>
    <li><b>Theme preference:</b> stored locally on your device; clear it with your browser settings.</li>
    <li><b>Contact form:</b> only you choose whether to fill it in.</li>
    <li><b>Binding information:</b> be aware that anything you put on the blockchain, including a token&apos;s configuration, is public and permanent.</li>
  </ul>
</section>

<section className="legal-sec">
  <h2><span className="lno">15</span>Changes to This Policy</h2>
  <p>We may update this policy as the Service evolves, especially once production hosting and infrastructure are finalised. The latest version is always published on this page.</p>
</section>

<section className="legal-sec">
  <h2><span className="lno">16</span>Contact</h2>
  <p>For questions about this policy, reach us through the contact page.</p>
</section>
        <p className="legal-contact">Questions about this policy? <a href="/contact">Contact us <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a></p>
      </div>
    </div>
  </section>

    </>
  );
}
