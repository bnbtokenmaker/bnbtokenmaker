import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { DOCS_WEBSITE } from "../../lib/schema";
import { DocsNav } from "../../components/DocsNav";

export const metadata: Metadata = {
  title: "BNB Token Maker Documentation | BEP-20 Token Creator",
  description: "Documentation for creating and managing BEP-20 tokens on BNB Smart Chain with BNB Token Maker: token details, contract features, fees, deployment and ownership.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "BNB Token Maker Documentation | BEP-20 Token Creator",
    description: "Documentation for creating and managing BEP-20 tokens on BNB Smart Chain with BNB Token Maker: token details, contract features, fees, deployment and ownership.",
    url: "https://bnbtokenmaker.com/docs",
    siteName: "BNB Token Maker",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BNB Token Maker Documentation | BEP-20 Token Creator",
    description: "Documentation for creating and managing BEP-20 tokens on BNB Smart Chain with BNB Token Maker: token details, contract features, fees, deployment and ownership.",
  },
};

export default function Page() {
  return (
    <>
      <JsonLd data={DOCS_WEBSITE} />


  <section className="page" id="top">
    <div className="container">
      <header className="page-head reveal is-in">
        <div className="kicker"><span className="dot"></span>Documentation</div>
        <h1>BNB Token Maker Documentation.</h1>
        <p className="lede">Everything you need to create, deploy and manage a BEP-20 token on BNB Smart Chain — from token details to contract features, fees, deployment and ownership.</p>
        <div className="idbar" role="group" aria-label="Network identity">
          <img className="net-ico" src="/logo-bnb-chain.svg" alt="BNB Smart Chain (BSC)" width="16" height="16" />
          <span className="idbar-tag">BEP-20</span>
          <span className="idbar-sep" aria-hidden="true"></span>
          <span className="idbar-tag">BNB Smart Chain</span>
          <span className="idbar-sep" aria-hidden="true"></span>
          <span className="idbar-tag">Chain ID 56</span>
        </div>
      </header>

      <div className="doc-layout">
        <aside className="docs-nav" aria-label="Documentation sections">
          <button className="docs-nav-btn" id="docs-nav-btn" type="button" aria-expanded="false" aria-controls="docs-nav-list"><span>On this page</span><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></button>
          <p className="docs-nav-title">On this page</p>
          <div className="docs-nav-list" id="docs-nav-list">
          <ul>
            <li><a href="#introduction">01 · Introduction</a></li>
            <li><a href="#quick-start">02 · Quick start</a></li>
            <li><a href="#network-requirements">03 · Network requirements</a></li>
            <li><a href="#token-details">04 · Token details</a></li>
            <li><a href="#token-features">05 · Token features</a></li>
            <li><a href="#pricing-gas">06 · Pricing and gas</a></li>
            <li><a href="#deployment">07 · Deployment</a></li>
            <li><a href="#supply-controls">08 · Supply controls</a></li>
            <li><a href="#transfer-controls">09 · Transfer controls</a></li>
            <li><a href="#access-controls">10 · Access controls</a></li>
            <li><a href="#ownership">11 · Ownership</a></li>
            <li><a href="#wallet-security">12 · Wallet security</a></li>
            <li><a href="#non-custodial">13 · Non-custodial</a></li>
            <li><a href="#before-you-deploy">14 · Before you deploy</a></li>
            <li><a href="#network-reference">15 · Network reference</a></li>
            <li><a href="#bep20-standard">16 · BEP-20 standard</a></li>
            <li><a href="#chain-ids">17 · Chain IDs</a></li>
          </ul>
          </div>
        </aside>

        <div className="doc-body">
          <section className="doc-sec" id="introduction">
            <span className="doc-idx">01</span>
            <h2>Introduction</h2>
            <p><b>BNB Token Maker</b> is a browser-based generator for <b>BEP-20 tokens</b> on BNB Smart Chain. You configure the token details, choose the contract features you want and deploy from your own wallet — without writing Solidity.</p>
            <p>Every token is generated from a standardized BEP-20 contract template. It&apos;s built in your browser, and the deployment transaction is signed and broadcast from your wallet. Everything is non-custodial: your private keys and seed phrase never leave your device.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>You keep the keys.</b> BNB Token Maker never sees or stores your private keys.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Standard contract.</b> The template follows the BEP-20 interface most wallets and explorers already read.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>You control ownership.</b> The deploying wallet becomes the owner and controls the features you enabled.</span></li>
            </ul>
          </section>

          <section className="doc-sec" id="quick-start">
            <span className="doc-idx">02</span>
            <h2>Quick start</h2>
            <p>Getting a BEP-20 token deployed takes four steps:</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Configure.</b> Open the <a href="/create">create page</a> and set your token name, symbol, decimals and initial supply.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Choose features.</b> Enable the contract features you need — an add-on is only included if you turn it on.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Connect.</b> Connect a BNB Smart Chain wallet with enough BNB to cover the platform fee and network gas.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Deploy.</b> Review the contract summary, sign the transaction and confirm. Your contract address appears once the network confirms.</span></li>
            </ul>
          </section>

          <section className="doc-sec" id="network-requirements">
            <span className="doc-idx">03</span>
            <h2>Network requirements</h2>
            <p>BNB Token Maker deploys BEP-20 tokens on BNB Smart Chain and its test network. Contracts can&apos;t be deployed to other chains.</p>
            <dl className="dl-grid">
              <dt>Token standard</dt><dd>BEP-20</dd>
              <dt>Mainnet</dt><dd>BNB Smart Chain · Chain ID 56</dd>
              <dt>Testnet</dt><dd>BSC Testnet · Chain ID 97</dd>
              <dt>Native token</dt><dd>BNB (for fees and gas)</dd>
            </dl>
            <p>Your wallet must be connected to the correct network before you deploy. Most wallets prompt you to switch networks automatically; always double-check the network shown in the wallet prompt against <a href="#chain-ids">Chain IDs</a>.</p>
          </section>

          <section className="doc-sec" id="token-details">
            <span className="doc-idx">04</span>
            <h2>Token details</h2>
            <p>These details are written into the contract at deployment and become the token&apos;s public identity.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Name.</b> The full token name (for example, &quot;My Token&quot;). It can include letters, numbers and spaces.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Symbol.</b> The short ticker (for example, &quot;MYT&quot;). Keep it short — it&apos;s what most wallets display.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Decimals.</b> The smallest unit the token supports (0–18). 18 is the BEP-20 default and the most compatible choice.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Initial supply.</b> The total amount minted at deployment. For an 18-decimal token, decimals count against the total — so a supply of 1,000,000 means 1,000,000 × 10<sup>18</sup> base units if you enter it in full.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Owner.</b> The deploying wallet becomes the contract owner automatically.</span></li>
            </ul>
            <p>The <b>name and symbol can&apos;t be changed</b> after deployment — they&apos;re locked into the contract. Decide on them carefully before you deploy.</p>
          </section>

          <section className="doc-sec" id="token-features">
            <span className="doc-idx">05</span>
            <h2>Token features</h2>
            <p>Beyond the BEP-20 foundation, you can enable optional features during configuration. Every contract also ships with <b>transfer ownership</b> and <b>renounce ownership</b> built in.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Burnable</b> — permanently remove tokens from circulation; the owner can reduce the total supply.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Mintable</b> — the owner can create additional supply after launch. <i>Mutually exclusive with Fixed Supply.</i></span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Fixed Supply</b> — the total supply is locked forever; nothing can ever mint more.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Pausable</b> — pause and resume all transfers instantly.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Max Transaction Limit</b> — cap the amount a single transfer can move, as a share of the total supply.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Max Wallet Limit</b> — cap the amount any single wallet can hold, as a share of the total supply.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Blacklist</b> — block specific addresses from holding or transferring.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Whitelist</b> — restrict transfers to approved addresses. <i>Mutually exclusive with Blacklist.</i></span></li>
            </ul>
            <p><a href="/features">Explore the full feature list</a> for examples of where each feature is useful.</p>
          </section>
          <section className="doc-sec" id="pricing-gas">
            <span className="doc-idx">06</span>
            <h2>Pricing and gas</h2>
            <p>Deploying a token involves two separate costs, charged independently:</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Platform fee.</b> One fee for generating your contract through BNB Token Maker. It&apos;s shown in the create flow before you connect your wallet and is charged in BNB.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Network gas.</b> The fee your wallet pays the BNB Smart Chain network to confirm the deployment transaction. It&apos;s set by the network and paid in BNB.</span></li>
            </ul>
            <p>The two are never mixed. Your wallet shows the exact network fee before you sign, and the balance needed to cover both should be in BNB on the deploying wallet. For a full explanation of what moves each cost, see <a href="/bep20-token-cost">BEP-20 token creation costs</a>.</p>
          </section>

          <section className="doc-sec" id="deployment">
            <span className="doc-idx">07</span>
            <h2>Deployment</h2>
            <p>Deployment is a single signed transaction from your wallet:</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Review.</b> Check the contract summary — token name, symbol, supply and the features you enabled.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Connect.</b> Connect a BNB Smart Chain wallet, such as any standard browser or mobile wallet that supports BEP-20.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Approve.</b> Confirm the platform fee and network fee in your wallet, then sign the deployment transaction.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Confirm.</b> Wait for the network to include the transaction. How long this takes is usually quick but varies with network conditions — there&apos;s no guaranteed time.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Collect.</b> Your contract address is shown as soon as your transaction confirms. Keep it — it&apos;s your token&apos;s on-chain identity.</span></li>
            </ul>
            <div className="callout">
              <i className="fa-solid fa-link" aria-hidden="true"></i>
              <span><b>After deployment.</b> Verify the contract source on BscScan so anyone can inspect it — see the <a href="/verify-bep20-token">BscScan verification guide</a>. To display the token in MetaMask or Trust Wallet, follow <a href="/add-bep20-token-to-wallet">how to add a BEP-20 token to your wallet</a>.</span>
            </div>
          </section>

          <section className="doc-sec" id="supply-controls">
            <span className="doc-idx">08</span>
            <h2>Supply controls</h2>
            <p>You choose one way the supply behaves after launch.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Fixed Supply.</b> The total at deployment is the total forever. Nothing can ever create more.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Mintable.</b> The owner can mint new tokens after launch through dedicated owner-only functions. Once you enable minting, the supply is no longer fixed.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Burnable.</b> The owner can permanently destroy tokens, reducing the circulating supply. Burned tokens can never be restored or re-created.</span></li>
            </ul>
            <div className="callout">
              <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
              <span><b>Mintable and Fixed Supply are mutually exclusive.</b> You enable one or the other — never both in the same contract.</span>
            </div>
          </section>

          <section className="doc-sec" id="transfer-controls">
            <span className="doc-idx">09</span>
            <h2>Transfer controls</h2>
            <p>Optional guardrails on how tokens move between wallets.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Pausable.</b> The owner can pause and resume all transfers instantly — a common emergency valve during launches.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Max Transaction Limit.</b> Caps the amount any single transfer can move, set as a share of the total supply. Useful against large single moves.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Max Wallet Limit.</b> Caps the amount any single address can hold, set as a share of the total supply. Useful against whale concentration.</span></li>
            </ul>
            <div className="callout is-warn">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
              <span><b>Aggressive limits break normal use.</b> Tight caps can block legitimate transfers, break exchange integrations and lock tokens unexpectedly. Validate your numbers on testnet before a real launch.</span>
            </div>
          </section>

          <section className="doc-sec" id="access-controls">
            <span className="doc-idx">10</span>
            <h2>Access controls</h2>
            <p>Choose how strictly addresses are admitted:</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Blacklist.</b> Block specific wallets from holding or transferring the token. The owner manages the list.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Whitelist.</b> Restrict holding and transferring to a pre-approved set of wallets. Every other address is blocked.</span></li>
            </ul>
            <div className="callout">
              <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
              <span><b>Blacklist and Whitelist are mutually exclusive.</b> Enable one or the other, not both.</span>
            </div>
          </section>

          <section className="doc-sec" id="ownership">
            <span className="doc-idx">11</span>
            <h2>Ownership</h2>
            <p>Every contract ships with ownership built in. The deploying wallet starts as the owner.</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Transfer Ownership.</b> Hand control to a multisig, a DAO or another wallet at any time. The new owner inherits every owner-only function.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Renounce Ownership.</b> Permanently lock the contract to its current form. After renouncing, no one — not even the original owner — can change anything.</span></li>
            </ul>
            <div className="callout is-warn">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
              <span><b>Renouncing is irreversible.</b> Once confirmed on-chain, there is no way to restore ownership or change the contract. Only renounce when you&apos;re certain.</span>
            </div>
          </section>
          <section className="doc-sec" id="wallet-security">
            <span className="doc-idx">12</span>
            <h2>Wallet security</h2>
            <p>A few practices keep your deployment and post-launch control safe:</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Use a dedicated wallet.</b> Deploy from a wallet you control fully and keep your seed phrase offline and private.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Keep BNB for fees.</b> Ensure the wallet holds enough BNB to cover both the platform fee and the network gas before you start.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Verify before signing.</b> Text check: the network, the fee, the recipient (the deployment uses your own wallet) and the amount shown in the wallet prompt.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Store your contract address.</b> The address is the only way to point people at your token after launch.</span></li>
            </ul>
          </section>

          <section className="doc-sec" id="non-custodial">
            <span className="doc-idx">13</span>
            <h2>Non-custodial</h2>
            <p>BNB Token Maker never holds your funds or keys. The entire flow runs in your browser and your wallet:</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>Private keys stay local.</b> Seed phrases and keys never leave your wallet and are never transmitted to BNB Token Maker.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>You sign everything.</b> The deployment transaction is assembled locally and signed inside your wallet before broadcast.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span><b>No custody.</b> BNB Token Maker can&apos;t move your assets, change your contract without Owner functions, or access anything beyond the public address you choose to connect.</span></li>
            </ul>
          </section>

          <section className="doc-sec" id="before-you-deploy">
            <span className="doc-idx">14</span>
            <h2>Before you deploy</h2>
            <p>Go through this checklist before signing a mainnet deployment:</p>
            <ul>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Name, symbol and decimals are final — they can&apos;t be changed after deployment.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Initial supply is the number you actually want in circulation.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Mutually exclusive features (Mintable↔Fixed Supply, Blacklist↔Whitelist) are set the way you intend.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Transfer limits are wide enough for normal transfers, integrations and trading.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>Your wallet is on the correct network and holds enough BNB for the platform fee and network gas.</span></li>
              <li><i className="fa-solid fa-circle-check" aria-hidden="true"></i><span>You understand renouncing and only plan to do it on purpose, once.</span></li>
            </ul>
            <div className="callout">
              <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
              <span><b>Test before you launch.</b> Run your exact configuration on BSC Testnet (Chain ID 97) first. Network gas differs from mainnet, but the contract behavior and flow are the same.</span>
            </div>
          </section>

          <section className="doc-sec" id="network-reference">
            <span className="doc-idx">15</span>
            <h2>Network reference</h2>
            <p>The facts you&apos;ll need when adding a network to a fresh wallet or explaining your token:</p>
            <dl className="dl-grid">
              <dt>Network name</dt><dd>BNB Smart Chain (BSC)</dd>
              <dt>Mainnet Chain ID</dt><dd>56</dd>
              <dt>Testnet Chain ID</dt><dd>97</dd>
              <dt>Native currency</dt><dd>BNB</dd>
              <dt>Token standard</dt><dd>BEP-20</dd>
            </dl>
            <p>See how deployment works end to end in <a href="/create-token-on-bnb-chain">Create a Token on BNB Smart Chain</a>. For the authoritative technical documentation of the network, see the official <a href="https://docs.bnbchain.org/">BNB Chain documentation</a>.</p>
          </section>

          <section className="doc-sec" id="bep20-standard">
            <span className="doc-idx">16</span>
            <h2>BEP-20 standard</h2>
            <p>BEP-20 is the token standard used on BNB Smart Chain. It defines a common interface — name, symbol, decimals, total supply, balances, transfers and approvals — that wallets, explorers and exchanges read to work with any token automatically.</p>
            <p>Contracts generated by BNB Token Maker implement this standard interface. That means your token can be listed, traded, bridged and inspected with the same tools as any other BEP-20 token, without special code. Want to see it in action? Start with the <a href="/bep20-token-generator">BEP-20 token generator</a>. If you&apos;re comparing it against Ethereum, the <a href="/bep20-vs-erc20">BEP-20 vs ERC-20</a> page maps the two side by side.</p>
          </section>

          <section className="doc-sec" id="chain-ids">
            <span className="doc-idx">17</span>
            <h2>Chain IDs</h2>
            <p>Don&apos;t confuse the networks — a mainnet deployment is final.</p>
            <dl className="dl-grid">
              <dt>Mainnet</dt><dd>BNB Smart Chain · Chain ID 56</dd>
              <dt>Testnet</dt><dd>BSC Testnet · Chain ID 97</dd>
            </dl>
            <p>Double-check the chain shown in your wallet before you sign a deployment transaction. Deploying to the wrong network means your token lives somewhere you didn&apos;t intend — and a mainnet deployment can&apos;t be undone.</p>
          </section>
        </div>
      </div>
    </div>
  </section>

  <section className="section" style={{paddingTop:"clamp(.5rem,2vw,1.5rem)"}}>
    <div className="container">
      <div className="cta-band reveal is-in">
        <div className="cta-inner">
          <div className="cta-kicker">Ready when you are</div>
          <h2>Put the docs into practice.</h2>
          <p>Configure the details, choose your features and deploy from your wallet on BNB Smart Chain.</p>
        </div>
        <div className="cta-action">
          <a className="btn btn-dark btn-lg" href="/create">
            Create Token
            <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
          <a className="btn btn-plain" href="/faq">Browse the FAQ</a>
        </div>
      </div>
    </div>
  </section>

      <DocsNav />

    </>
  );
}
