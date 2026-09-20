import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { FAQ_WEBSITE } from "../../lib/schema";
import { FaqFilter } from "../../components/FaqFilter";

export const metadata: Metadata = {
  title: "BEP-20 Token Generator FAQ | BNB Token Maker",
  description: "Frequently asked questions about creating BEP-20 tokens on BNB Smart Chain with BNB Token Maker: token details, features, fees, wallet security and more.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "BEP-20 Token Generator FAQ | BNB Token Maker",
    description: "Frequently asked questions about creating BEP-20 tokens on BNB Smart Chain with BNB Token Maker: token details, features, fees, wallet security and more.",
    url: "https://bnbtokenmaker.com/faq",
    siteName: "BNB Token Maker",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BEP-20 Token Generator FAQ | BNB Token Maker",
    description: "Frequently asked questions about creating BEP-20 tokens on BNB Smart Chain with BNB Token Maker: token details, features, fees, wallet security and more.",
  },
};

export default function Page() {
  return (
    <>
      <JsonLd data={FAQ_WEBSITE} />


  <section className="page" id="top">
    <div className="container">
      <header className="page-head reveal is-in">
        <div className="kicker"><span className="dot"></span>FAQ</div>
        <h1>Frequently asked questions about creating BEP-20 tokens.</h1>
        <p className="lede">Short, straight answers about creating, configuring, deploying and managing BEP-20 tokens on BNB Smart Chain.</p>
        <div className="idbar" role="group" aria-label="Network identity">
          <img className="net-ico" src="/logo-bnb-chain.svg" alt="BNB Smart Chain (BSC)" width="16" height="16" />
          <span className="idbar-tag">BEP-20</span>
          <span className="idbar-sep" aria-hidden="true"></span>
          <span className="idbar-tag">BNB Smart Chain</span>
          <span className="idbar-sep" aria-hidden="true"></span>
          <span className="idbar-tag"><i className="fa-solid fa-shield-halved" aria-hidden="true"></i>Non-custodial</span>
        </div>
        <div className="faq-search" role="search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <label className="visually-hidden" htmlFor="faq-search">Search frequently asked questions</label>
          <input type="search" id="faq-search" name="faq-search" placeholder="Search questions…" autoComplete="off" />
        </div>
        <p className="faq-meta" id="faq-meta" aria-live="polite">Showing all 25 questions</p>
      </header>

      <div className="faq-list">
        <section className="faq-cat" data-cat='getting-started'>
          <h2 className="faq-cat-title">Getting Started <span className="fc-count">4</span></h2>
          <div className="faq-item">
            <details>
              <summary><span>What is a BEP-20 token?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>A BEP-20 token is a token created using the BEP-20 standard on BNB Smart Chain. The standard defines a common interface — name, symbol, decimals, balances, transfers and approvals — so any wallet or explorer that supports BEP-20 can read and move the token. BNB Token Maker generates exactly this kind of contract. Learn more in our <a href="/bep20-token-generator">BEP-20 token generator guide</a>.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>Do I need to know how to code?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>No. BNB Token Maker is a visual generator: you set the name, symbol, decimals and supply, toggle the contract features you want, and deploy from your wallet. The Solidity contract comes from a standardized template — you don&apos;t write or read any code.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>Which network do tokens live on?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>Tokens generated here are BEP-20 tokens on BNB Smart Chain (mainnet Chain ID 56). The flow can also preview your configuration on BSC Testnet (Chain ID 97), which is a good way to test before a real launch. For the full deployment overview, see <a href="/create-token-on-bnb-chain">Create a Token on BNB Smart Chain</a>.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>How long does deployment take?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>Deployment is a single network transaction. Once the network confirms it, your contract is live. This is usually quick but varies with network conditions, so there&apos;s no guaranteed time — check your wallet and the explorer for the current status.</p></div>
            </details>
          </div>
        </section>
        <section className="faq-cat" data-cat='token-creation'>
          <h2 className="faq-cat-title">Token Creation <span className="fc-count">4</span></h2>
          <div className="faq-item">
            <details>
              <summary><span>What information do I need to create a token?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>A name, a symbol, a decimal setting and an initial supply. Beyond that, you can enable the contract features you want before you connect your wallet.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>What decimals should I use?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>18 decimals is the BEP-20 default and what most of the ecosystem expects — it keeps your token familiar to wallets and explorers. You can set fewer (down to 0) if you intentionally want whole-number units.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>Can I change the name or symbol after deployment?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>No. The name and symbol are written into the contract at deployment and can never be changed afterwards. Decide on them before you deploy.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>Can the supply change after launch?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>Only if you enabled the Mintable feature — the owner can then create new supply at any time. With Fixed Supply, the total is permanently locked. A Burnable token&apos;s supply can only go down, never up.</p></div>
            </details>
          </div>
        </section>
        <section className="faq-cat" data-cat='features'>
          <h2 className="faq-cat-title">Features <span className="fc-count">7</span></h2>
          <div className="faq-item">
            <details>
              <summary><span>What&apos;s the difference between Mintable and Fixed Supply?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>Mintable lets the owner create additional supply after launch; Fixed Supply locks the total forever. The two are mutually exclusive, so you choose one when configuring.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>What does Burnable mean?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>Burnable lets the owner permanently remove tokens from circulation. Burned tokens can never be restored, so it permanently reduces the available supply.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>What is Pausable used for?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>Pausable lets the owner stop and resume all transfers instantly. It&apos;s a common emergency valve to pause trading during a launch window or an incident.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>What are the Max Transaction and Max Wallet limits?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>They cap how tokens move. Max Transaction Limit caps the amount any single transfer can move; Max Wallet Limit caps the amount any single wallet can hold. Both are set as a share of the total supply during configuration.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>Can I use Blacklist and Whitelist together?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>No — they&apos;re mutually exclusive. Blacklist blocks specific addresses from holding or transferring; Whitelist restricts holding and transferring to only approved addresses.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>What does Renounce Ownership do?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>It permanently locks the contract. After renouncing, no one — not even you — can change the contract, use owner functions or restore control. The action is irreversible once confirmed.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>Can I transfer ownership later?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>Yes. Ownership can be handed to a multisig, a DAO or any other wallet at any time, and the new owner inherits every owner-only function.</p></div>
            </details>
          </div>
        </section>
        <section className="faq-cat" data-cat='wallet-fees'>
          <h2 className="faq-cat-title">Wallet &amp; Fees <span className="fc-count">5</span></h2>
          <div className="faq-item">
            <details>
              <summary><span>Do I need BNB to create a token?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>Yes. You need BNB on the deploying wallet to cover two costs: the BNB Token Maker platform fee for generating the contract, and the network gas the chain charges to deploy it.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>What is the platform fee?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>It&apos;s the one-time fee for generating your BEP-20 contract through BNB Token Maker. You see the exact amount in the create flow before you connect your wallet, and it&apos;s charged in BNB. For the full picture of platform fee vs network gas, see <a href="/bep20-token-cost">BEP-20 token creation costs</a>.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>What is network gas?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>Network gas is the fee BNB Smart Chain charges to confirm your deployment transaction. It&apos;s paid in BNB, set by the network, and your wallet always shows the amount before you sign.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>Why does the fee vary?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>Network gas moves with demand and congestion — busy times cost more, quiet times cost less. Your wallet shows the current network fee before you approve. If it&apos;s higher than you&apos;d like, you can wait and try again.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>Does BNB Token Maker hold my funds?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>No — the platform is non-custodial. BNB Token Maker never holds or moves your BNB. Fees are paid through signed wallet transactions, and everything else stays under your control.</p></div>
            </details>
          </div>
        </section>
        <section className="faq-cat" data-cat='security'>
          <h2 className="faq-cat-title">Security <span className="fc-count">4</span></h2>
          <div className="faq-item">
            <details>
              <summary><span>Are my private keys safe?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>Yes — and they never leave your wallet. BNB Token Maker runs in your browser and only sees the public address you choose to connect. Your seed phrase and private keys are never transmitted anywhere.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>What does connecting my wallet give the site access to?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>Only the public address you approve, plus the ability to request a signature for the deployment transaction. BNB Token Maker can&apos;t see your keys, move your funds or spend for you — every action is signed deliberately inside your wallet.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>Who controls the token after deployment?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>The deploying wallet is the owner and controls every owner-only function of the features you enabled. You can transfer that control to another wallet or a DAO, or renounce it permanently so nobody has it.</p></div>
            </details>
          </div>
          <div className="faq-item">
            <details>
              <summary><span>Where can I see my contract after deployment?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>Your contract address is shown on BNB Token Maker right after deployment confirms. Paste it into any public block explorer that reads BNB Smart Chain to view the token, its supply and its contract code.</p></div>
            </details>
          </div>
        </section>
        <section className="faq-cat" data-cat='bnb-chain'>
          <h2 className="faq-cat-title">BNB Chain <span className="fc-count">1</span></h2>
          <div className="faq-item">
            <details>
              <summary><span>Is BNB Token Maker affiliated with BNB Chain?</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
              <div className="faq-a"><p>No. BNB Token Maker is an independent tool and is not affiliated with, endorsed by or sponsored by BNB Chain or its ecosystem entities.</p></div>
            </details>
          </div>
        </section>
      </div>

      <div className="no-results" id="no-results">
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <h3>No questions match your search</h3>
        <p>Try a different word, like &quot;gas&quot;, &quot;supply&quot; or &quot;ownership&quot;.</p>
      </div>
    </div>
  </section>

  <section className="section" style={{paddingTop:"clamp(.5rem,2vw,1.5rem)"}}>
    <div className="container">
      <div className="cta-band reveal is-in">
        <div className="cta-inner">
          <div className="cta-kicker">Ready when you are</div>
          <h2>Still have questions?</h2>
          <p>Read the full walkthrough in the documentation, then create your first BEP-20 token on BNB Smart Chain.</p>
        </div>
        <div className="cta-action">
          <a className="btn btn-dark btn-lg" href="/create">
            Create Token
            <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
          <a className="btn btn-plain" href="/docs">Open the documentation</a>
        </div>
      </div>
    </div>
  </section>

  <p className="block-nudge"><a href="/contact">Still need help? Contact support <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a></p>

      <FaqFilter />

    </>
  );
}
