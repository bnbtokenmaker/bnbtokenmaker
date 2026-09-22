import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { CONTACT_WEBSITE } from "../../lib/schema";
import { ContactForm } from "../../components/ContactForm";

export const metadata: Metadata = {
  title: "Contact | BNB Token Maker",
  description: "Contact BNB Token Maker for platform questions, technical support, deployment issues and security enquiries.",
  alternates: { canonical: "https://bnbtokenmaker.com/contact" },
  openGraph: {
    title: "Contact | BNB Token Maker",
    description: "Contact BNB Token Maker for platform questions, technical support, deployment issues and security enquiries.",
    url: "https://bnbtokenmaker.com/contact",
    siteName: "BNB Token Maker",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Contact | BNB Token Maker",
    description: "Contact BNB Token Maker for platform questions, technical support, deployment issues and security enquiries.",
  },
};

export default function Page() {
  return (
    <>
      <JsonLd data={CONTACT_WEBSITE} />


  <section className="page" id="top">
    <div className="container">
      <header className="page-head reveal is-in">
        <div className="kicker"><span className="dot"></span>Contact</div>
        <h1>Get in touch.</h1>
        <p className="lede">Have a question about BNB Token Maker, token deployment or the platform? Send us a message.</p>
      </header>

      <div className="ct-grid">
        <div className="ct-help reveal is-in">
          <h2 className="ct-help-title">How can we help?</h2>
          <p className="ct-help-sub">Choose the topic that fits best and the team will pick it up from there.</p>
          <ul className="ct-topics">
            <li>
              <span className="ti" aria-hidden="true"><i className="fa-solid fa-comments"></i></span>
              <div>
                <h3>General questions</h3>
                <p>Questions about BNB Token Maker.</p>
              </div>
            </li>
            <li>
              <span className="ti" aria-hidden="true"><i className="fa-solid fa-screwdriver-wrench"></i></span>
              <div>
                <h3>Technical support</h3>
                <p>Issues while configuring or deploying a token.</p>
              </div>
            </li>
            <li>
              <span className="ti" aria-hidden="true"><i className="fa-solid fa-shield-halved"></i></span>
              <div>
                <h3>Security</h3>
                <p>Report suspicious behavior or a potential security issue.</p>
              </div>
            </li>
            <li>
              <span className="ti" aria-hidden="true"><i className="fa-solid fa-handshake"></i></span>
              <div>
                <h3>Partnerships</h3>
                <p>Business or integration enquiries.</p>
              </div>
            </li>
          </ul>
          <div className="ct-security">
            <i className="fa-solid fa-shield" aria-hidden="true"></i>
            <p><b>Never share your seed phrase or private key.</b> BNB Token Maker support will never ask you to send a seed phrase or private key through this form.</p>
          </div>
        </div>

        <ContactForm />
      </div>

      <section className="ct-quick">
        <h2>Looking for a quick answer?</h2>
        <p>Check the FAQ or Documentation before contacting support.</p>
        <div className="ct-actions">
          <a className="btn btn-dark" href="/faq">View FAQ</a>
          <a className="btn btn-ghost" href="/docs">Documentation</a>
        </div>
      </section>
    </div>
  </section>

    </>
  );
}
