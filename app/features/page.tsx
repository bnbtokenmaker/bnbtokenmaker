import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import {
  FEATURES_WEBSITE
} from "../../lib/schema";

export const metadata: Metadata = {
  title: "BEP-20 Token Features | BNB Token Maker",
  description: "BEP-20 token features explained: supply, transfer, access and ownership controls. See what ships in every BNB Token Maker contract and what you can add.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "BEP-20 Token Features | BNB Token Maker",
    description: "BEP-20 token features explained: supply, transfer, access and ownership controls. See what ships in every BNB Token Maker contract and what you can add.",
    url: "https://bnbtokenmaker.com/features",
    siteName: "BNB Token Maker",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BEP-20 Token Features | BNB Token Maker",
    description: "BEP-20 token features explained: supply, transfer, access and ownership controls. See what ships in every BNB Token Maker contract and what you can add.",
  },
};

export default function Page() {
  return (
    <>
      <JsonLd data={FEATURES_WEBSITE} />


  <section className="page" id="top">
    <div className="container">
      <header className="page-head reveal is-in">
        <div className="kicker"><span className="dot"></span>Features</div>
        <h1>Every control your BEP-20 token can have.</h1>
        <p className="lede">Every token is generated from a standardized BEP-20 smart contract template on BNB Smart Chain. Here&apos;s what ships in every contract — and what you can add at the flip of a switch. Read the <a href="/docs">full documentation</a> for each option.</p>
        <div className="idbar" role="group" aria-label="Network identity">
          <img className="net-ico" src="/logo-bnb-chain.svg" alt="BNB Smart Chain (BSC)" width="16" height="16" />
          <span className="idbar-tag">BEP-20</span>
          <span className="idbar-sep" aria-hidden="true"></span>
          <span className="idbar-tag">BNB Smart Chain</span>
          <span className="idbar-sep" aria-hidden="true"></span>
          <span className="idbar-tag"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i>Non-custodial</span>
        </div>
      </header>

      <div className="feat-page-body">

        <section className="content-sec reveal is-in" id="bep20-foundation">
          <div className="cat-row"><span className="idx">01</span><h2>BEP-20 foundation <span className="small-note">included in every contract</span></h2></div>
          <p className="sec-lede">Every token is generated from a standardized BEP-20 smart contract template. It follows the standard interface, so it can be listed, traded, bridged and read by any wallet or explorer that supports BEP-20. These four building blocks ship in every contract — see how the generator puts them together in the <a href="/bep20-token-generator">BEP-20 token generator</a>.</p>
          <div className="flist">
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-layer-group"></i></span>
              <div>
                <h3>Standard BEP-20</h3>
                <p>Full standard interface — name, symbol, decimals, total supply, balances, transfers and approvals. Any wallet or explorer that reads BEP-20 can read your token.</p>
              </div>
              <span className="fc-tag in">included</span>
            </div>
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-lock"></i></span>
              <div>
                <h3>Fixed Initial Supply</h3>
                <p>The exact number you set is minted once, at deployment. The total is locked in unless you deliberately enable the mintable feature.</p>
              </div>
              <span className="fc-tag in">included</span>
            </div>
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-sort-numeric-down"></i></span>
              <div>
                <h3>18 Decimals default</h3>
                <p>18 decimals is the BEP-20 standard and matches the rest of the ecosystem. You can set fewer, but 18 keeps your token familiar to wallets and explorers.</p>
              </div>
              <span className="fc-tag in">included</span>
            </div>
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-user-gear"></i></span>
              <div>
                <h3>Ownership Controls</h3>
                <p>Every contract ships with an owner. The owner controls the features you enable, and ownership can be transferred or renounced after launch.</p>
              </div>
              <span className="fc-tag in">included</span>
            </div>
          </div>
        </section>

        <section className="content-sec reveal" id="supply-controls">
          <div className="cat-row"><span className="idx">02</span><h2>Supply Controls</h2></div>
          <p className="sec-lede">Decide whether the supply can change after launch — or whether it stays locked forever.</p>
          <div className="flist">
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-fire"></i></span>
              <div>
                <h3>Burnable</h3>
                <p>Permanently remove tokens from circulation. Common uses include deflationary supply, post-launch supply reductions and compliance moves. Once burned, those tokens can never be restored.</p>
              </div>
              <span className="fc-tag">add-on</span>
            </div>
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-arrow-trend-up"></i></span>
              <div>
                <h3>Mintable</h3>
                <p>Create additional supply after launch, under owner control. Typical uses are staking rewards, community incentives or reserve growth. Mintable and Fixed Supply are mutually exclusive.</p>
              </div>
              <span className="fc-tag">add-on</span>
            </div>
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-lock"></i></span>
              <div>
                <h3>Fixed Supply</h3>
                <p>The total supply is locked in at launch. Nothing can mint new tokens, ever.</p>
              </div>
              <span className="fc-tag in">included</span>
            </div>
          </div>
          <div className="callout">
            <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
            <span><b>Mintable vs Fixed Supply.</b> Mintable lets the owner create new supply at any time; Fixed Supply locks the total forever. The two can&apos;t coexist in a single contract, so you choose one when configuring.</span>
          </div>
          <div className="callout">
            <i className="fa-solid fa-link" aria-hidden="true"></i>
            <span><b>Launching a community token?</b> See how a typical high-supply setup combines these controls in the <a href="/create-meme-coin-bnb-chain">meme coin on BNB Smart Chain</a> walkthrough, and design the numbers with the <a href="/meme-coin-tokenomics">meme coin tokenomics guide</a>.</span>
          </div>
          <div className="callout">
            <i className="fa-solid fa-link" aria-hidden="true"></i>
            <span>Still deciding on the numbers? The <a href="/bep20-tokenomics">BEP-20 tokenomics guide</a> walks through supply, distribution, decimals and burn before you configure anything.</span>
          </div>
        </section>

        <section className="content-sec reveal" id="transfer-controls">
          <div className="cat-row"><span className="idx">03</span><h2>Transfer Controls</h2></div>
          <p className="sec-lede">Put guardrails on how tokens move — useful for anti-whale setups and launch-window protection.</p>
          <div className="flist">
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-circle-pause"></i></span>
              <div>
                <h3>Pausable</h3>
                <p>Pause and resume all transfers instantly. A common safety valve for emergency response during a launch window.</p>
              </div>
              <span className="fc-tag">add-on</span>
            </div>
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-arrow-right-arrow-left"></i></span>
              <div>
                <h3>Max Transaction Limit</h3>
                <p>Cap the maximum amount a single transfer can move. Useful for anti-whale or liquidity-protection setups — set as a share of the total supply.</p>
              </div>
              <span className="fc-tag">add-on</span>
            </div>
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-wallet"></i></span>
              <div>
                <h3>Max Wallet Limit</h3>
                <p>Cap the maximum amount any single wallet can hold, so one address can&apos;t dominate the supply.</p>
              </div>
              <span className="fc-tag">add-on</span>
            </div>
          </div>
          <div className="callout is-warn">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <span><b>Configure limits carefully.</b> Aggressive transfer limits can impact normal trading, block integrations or lock tokens unexpectedly. Validate your assumptions on testnet before a production launch.</span>
          </div>
        </section>

        <section className="content-sec reveal" id="access-controls">
          <div className="cat-row"><span className="idx">04</span><h2>Access Controls</h2></div>
          <p className="sec-lede">Control which wallets can hold and move the token.</p>
          <div className="flist">
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-ban"></i></span>
              <div>
                <h3>Blacklist</h3>
                <p>Block specific wallets from transferring or holding the token. The list is managed by the owner.</p>
              </div>
              <span className="fc-tag">add-on</span>
            </div>
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-user-check"></i></span>
              <div>
                <h3>Whitelist</h3>
                <p>Restrict transfers to a pre-approved set of wallets. Every other address is blocked.</p>
              </div>
              <span className="fc-tag">add-on</span>
            </div>
          </div>
          <div className="callout">
            <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
            <span>In the current create flow, Blacklist and Whitelist are mutually exclusive — you can enable one or the other, not both.</span>
          </div>
        </section>

        <section className="content-sec reveal" id="ownership">
          <div className="cat-row"><span className="idx">05</span><h2>Ownership</h2></div>
          <p className="sec-lede">You stay in control of the contract until you decide otherwise.</p>
          <div className="flist">
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-share-nodes"></i></span>
              <div>
                <h3>Transfer Ownership</h3>
                <p>Move owner rights to a multisig, a DAO or another wallet at any time. The new owner takes over contract control instantly.</p>
              </div>
              <span className="fc-tag in">included</span>
            </div>
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-user-slash"></i></span>
              <div>
                <h3>Renounce Ownership</h3>
                <p>Lock the contract to its final form. After renouncing, no one can change the contract — not even you.</p>
              </div>
              <span className="fc-tag in">included</span>
            </div>
          </div>
          <div className="callout is-warn">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <span>Renouncing ownership is irreversible once confirmed on-chain. After that, no one — not even you — can restore control or change the contract.</span>
          </div>
          <div className="callout">
            <i className="fa-solid fa-link" aria-hidden="true"></i>
            <span>Going through the full picture before you sign? Run the <a href="/bep20-token-security-checklist">BEP-20 token security checklist</a> — it covers ownership, limits and wallet security in one place.</span>
          </div>
        </section>

        <section className="content-sec reveal" id="security-transparency">
          <div className="cat-row"><span className="idx">06</span><h2>Security &amp; transparency</h2></div>
          <p className="sec-lede">Your wallet stays in control.</p>
          <div className="flist">
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-key"></i></span>
              <div>
                <h3>Non-custodial</h3>
                <p>Your private keys and seed phrase never leave your wallet. BNB Token Maker can&apos;t see them, store them or move your funds.</p>
              </div>
              <span className="fc-tag in">always</span>
            </div>
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-pen-ruler"></i></span>
              <div>
                <h3>You sign, you deploy</h3>
                <p>The contract is built in your browser, and the deployment transaction is signed and broadcast from your own wallet.</p>
              </div>
              <span className="fc-tag in">always</span>
            </div>
            <div className="fcard">
              <span className="fc-ic" aria-hidden="true"><i className="fa-solid fa-hashtag"></i></span>
              <div>
                <h3>Contract address after deployment</h3>
                <p>Your new contract address is shown right after deployment confirms, so you can share it and read it on a block explorer.</p>
              </div>
              <span className="fc-tag in">always</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  </section>

  <section className="section" style={{paddingTop:"clamp(1rem,3vw,2rem)"}}>
    <div className="container">
      <div className="cta-band reveal">
        <div className="cta-inner">
          <div className="cta-kicker">Ready when you are</div>
          <h2>Ready to create your BEP-20 token?</h2>
          <p>Configure the details, choose your features and deploy from your wallet on BNB Smart Chain.</p>
        </div>
        <div className="cta-action">
          <a className="btn btn-dark btn-lg" href="/create">
            Create Token
            <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
          <a className="btn btn-plain" href="/how-it-works">How deployment works</a>
        </div>
      </div>
    </div>
  </section>

    </>
  );
}
