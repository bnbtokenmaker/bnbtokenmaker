import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { ADDWT_ARTICLE } from "../../lib/schema";
import { ADDWT_FAQ } from "../../lib/schema";
import { ADDWT_WEBSITE } from "../../lib/schema";

export const metadata: Metadata = {
  title: "How to Add a BEP-20 Token to Your Wallet | BNB Token Maker",
  description: "A durable, wallet-agnostic walkthrough for adding a BEP-20 token to MetaMask or Trust Wallet: contract address, network, decimals and security.",
  robots: "index, follow, max-image-preview:large",
  alternates: { canonical: "https://bnbtokenmaker.com/add-bep20-token-to-wallet" },
  openGraph: {
    title: "How to Add a BEP-20 Token to Your Wallet | BNB Token Maker",
    description: "A durable, wallet-agnostic walkthrough for adding a BEP-20 token to MetaMask or Trust Wallet: contract address, network, decimals and security.",
    url: "https://bnbtokenmaker.com/add-bep20-token-to-wallet",
    siteName: "BNB Token Maker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "How to Add a BEP-20 Token to Your Wallet | BNB Token Maker",
    description: "A durable, wallet-agnostic walkthrough for adding a BEP-20 token to MetaMask or Trust Wallet: contract address, network, decimals and security.",
  },
};

export default function Page() {
  return (
    <>
<JsonLd data={ADDWT_ARTICLE} />
<JsonLd data={ADDWT_FAQ} />
<JsonLd data={ADDWT_WEBSITE} />


  <section className="page" id="top">
    <div className="container">
      <header className="post-head reveal is-in">
        <a className="kicker" href="/blog" aria-label="Back to the blog" style={{textDecoration:"none"}}><span className="dot"></span>Guide · BNB Token Maker Blog</a>
        <h1>How to Add a BEP-20 Token to Your Wallet</h1>
        <p className="lede">Adding a token to MetaMask or Trust Wallet is a display step, not a transfer: the wallet shows the balance held on that contract address. Here&apos;s the durable workflow, in any wallet.</p>
      </header>

      <div className="post-wrap">
        <aside className="post-toc reveal is-in" aria-label="Table of contents">
          <p className="post-toc-title"><i className="fa-solid fa-list" aria-hidden="true"></i>Table of contents</p>
          <button className="post-toc-btn" id="post-toc-btn" type="button" aria-expanded="false" aria-controls="post-toc-list"><span>On this page</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></button>
          <div className="post-toc-list" id="post-toc-list">
          <ol>
            <li><a href="#what-adding-does"><span className="tno">01</span>What adding a token actually does</a></li>
            <li><a href="#what-you-need"><span className="tno">02</span>What you need before you start</a></li>
            <li><a href="#find-address"><span className="tno">03</span>How to find the correct contract address</a></li>
            <li><a href="#metamask"><span className="tno">04</span>Add a BEP-20 token in MetaMask</a></li>
            <li><a href="#trust-wallet"><span className="tno">05</span>Add a BEP-20 token in Trust Wallet</a></li>
            <li><a href="#troubleshooting"><span className="tno">06</span>The token isn&apos;t showing — common fixes</a></li>
            <li><a href="#is-it-safe"><span className="tno">07</span>Is importing a token safe?</a></li>
            <li><a href="#faq"><span className="tno">08</span>Frequently asked questions</a></li>
          </ol>
          </div>
        </aside>

        <article className="post-body">
          <section className="post-sec" id="what-adding-does">
            <h2><span className="no">01</span>What adding a token actually does</h2>
            <p>Wallets don&apos;t automatically show every token that exists on BNB Smart Chain. Adding a token tells your wallet &quot;display the balance held by the contract at <b>this address</b> with <b>this symbol</b> and <b>these decimals</b>.&quot;</p>
            <p>Two facts that prevent most mistakes:</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Nothing moves.</b> Adding a token transfers nothing, costs nothing and doesn&apos;t lock anything. Your tokens stay where they are.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Nothing is verified.</b> As Trust Wallet&apos;s own guidance puts it, &quot;adding a custom token doesn&apos;t verify it&apos;s legitimate&quot; — it simply enables your wallet to display and interact with whatever contract address you provide.</span></li>
            </ul>
          </section>

          <section className="post-sec" id="what-you-need">
            <h2><span className="no">02</span>What you need before you start</h2>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>The contract address.</b> The exact, case-sensitive address of the token on BNB Smart Chain. This is the single most important input.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>The right network.</b> BNB Smart Chain mainnet, Chain ID <b>56</b>. A token contract only shows its real balance on the chain where it lives.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Optionally,</b> the token symbol and decimals. Most wallets auto-fill them from the contract when you paste the address.</span></li>
            </ul>
            <p>You do not need the seed phrase, a private key, or any transfer for this step — if a page asks for them to &quot;add a token&quot;, stop.</p>
          </section>

          <section className="post-sec" id="find-address">
            <h2><span className="no">03</span>How to find the correct contract address</h2>
            <p>Get the address from the token&apos;s creator or from an explorer you trust. A helpful pattern: open the <a href="https://bscscan.com">official BscScan explorer</a>, search the token&apos;s name, and copy the address from the contract&apos;s own page.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Prefer the address shown on the <b>official project communication</b> (creator, documentation or list they control).</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>If you created the token with BNB Token Maker, use the contract address shown after deployment.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Copy, don&apos;t retype. Contract addresses are case-sensitive and easy to mistype.</span></li>
            </ul>
            <p>The address is best copied from a block explorer record, exactly as it appears on-chain. Confirm it once more before pasting.</p>
          </section>

          <section className="post-sec" id="metamask">
            <h2><span className="no">04</span>Add a BEP-20 token in MetaMask</h2>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>1. Switch networks.</b> In the network dropdown at the top of MetaMask, select <b>BNB Smart Chain</b>. If it&apos;s missing, add it using the network RPC — mainnet is Chain ID 56.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>2. Open Import tokens.</b> In the assets/balance area, find the <b>import tokens</b> option.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>3. Paste the contract address.</b> Choose the custom token tab, paste the address. MetaMask usually fills in the token symbol and decimals automatically.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>4. Import.</b> Confirm the auto-filled details, then complete the import. The balance then appears under your assets on BNB Smart Chain.</span></li>
            </ul>
            <p>If the wallet shows the token on the wrong network, the balance will be empty — repeat with BNB Smart Chain selected. For current exact menus, MetaMask&apos;s official <a href="https://support.metamask.io/manage-crypto/tokens/how-to-display-tokens-in-metamask">guide to displaying tokens</a> covers the custom-token import flow.</p>
          </section>

          <section className="post-sec" id="trust-wallet">
            <h2><span className="no">05</span>Add a BEP-20 token in Trust Wallet</h2>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>1. Open Manage crypto.</b> In the wallet&apos;s main token list, find the <b>manage crypto</b> or add-token entry point.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>2. Select the network.</b> Choose <b>Smart Chain</b> (BNB Smart Chain) so the token is added in the right network tab.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>3. Paste the contract address.</b> Trust Wallet reads the token info from the contract and pre-fills the fields.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>4. Confirm the import.</b> The custom token appears in the Smart Chain list with its balance.</span></li>
            </ul>
            <p>Trust Wallet&apos;s official <a href="https://support.trustwallet.com/en/articles/717151-how-to-add-a-custom-token-to-trust-wallet">guide to adding a custom token</a> keeps the same custom-token workflow current across app updates.</p>
          </section>

          <section className="post-sec" id="troubleshooting">
            <h2><span className="no">06</span>The token isn&apos;t showing — common fixes</h2>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Wrong network.</b> The wallet must be on BNB Smart Chain (Chain ID 56), not another chain with the same-looking balance.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Wrong address.</b> A single wrong character points at a different contract. Re-copy the address from the explorer.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Decimals mismatch.</b> If the contract has, say, 18 decimals and you imported with 9, the balance displays wrong. Re-import with the contract&apos;s decimals.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Not confirmed on-chain.</b> If the balance was recently transferred, wait for the transaction to be confirmed before checking.</span></li>
            </ul>
            <p>Re-importing the same address is harmless. Removing a previously added token only stops it being displayed — it doesn&apos;t touch the underlying balance.</p>
          </section>

          <section className="post-sec" id="is-it-safe">
            <h2><span className="no">07</span>Is importing a token safe?</h2>
            <p>Importing a token is <b>generally safe to your funds</b> because the step alone moves nothing. The risk is elsewhere: what the contract behind that address does when you interact with it.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Adding a token doesn&apos;t approve spending, doesn&apos;t sign transfers, and doesn&apos;t ask for your keys.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>The danger is <b>interacting</b> with a malicious contract address — especially signing approvals or transfers with it.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Verify you have the real address. Scam projects often present look-alike addresses; the explorer record is the reference.</span></li>
            </ul>
            <p>For verifying that a contract is what it claims to be, source-code verification on BscScan is a useful first check — read <a href="/verify-bep20-token">How to Verify a BEP-20 Token on BscScan</a> before signing anything with a newly added token.</p>
          </section>

          <section className="post-sec" id="faq">
            <h2><span className="no">08</span>Frequently asked questions</h2>
            <div className="faq-root">
              <div className="faq-list">
                <details className="faq-item">
                  <summary>Does adding a token to my wallet move any of my tokens?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
                  <div className="a">No. Importing or adding a custom token only tells the wallet to display and interact with the contract at the address you provide. It does not move, transfer or lock anything.</div>
                </details>
                <details className="faq-item">
                  <summary>Does adding a custom token verify that it is legitimate?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
                  <div className="a">No. Adding a custom token does not verify that it is legitimate. It lets you display and interact with whatever contract address you provide, so always confirm the address from a trusted source.</div>
                </details>
                <details className="faq-item">
                  <summary>My balance is not showing. What should I check?<span className="plus" aria-hidden="true"><i className="fa-solid fa-plus"></i></span></summary>
                  <div className="a">Check three things: that the wallet is on BNB Smart Chain (Chain ID 56), that the contract address matches exactly, and that the decimals you entered match the token contract. A mismatch in any of them hides the balance.</div>
                </details>
              </div>
            </div>
          </section>
          <div className="post-cta reveal is-in">
            <h2>Just created a token? Add it in minutes</h2>
            <p>Deploy your BEP-20 token, copy the contract address, and follow the wallet steps above to see your balance.</p>
            <div className="ct-actions">
              <a className="btn btn-dark btn-lg" href="/create">
                Create Token
                <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </a>
              <a className="btn btn-plain" href="/verify-bep20-token">Next: verify on BscScan</a>
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
              <a className="rd-card" href="/bep20-token-security-checklist">
                <span className="blg-cat">Security</span>
                <h3>BEP-20 Token Security Checklist</h3>
                <span className="rd-cta">Read guide <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
              </a>
              <a className="rd-card" href="/create-token-on-bnb-chain">
                <span className="blg-cat">Guide</span>
                <h3>Create Token on BNB Chain</h3>
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
