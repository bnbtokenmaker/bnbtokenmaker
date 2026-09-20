import type { Metadata } from "next";
import "./page.css";
import { JsonLd } from "../../components/JsonLd";
import { BLOG_WEBSITE } from "../../lib/schema";
import { BlogFilter } from "../../components/BlogFilter";

export const metadata: Metadata = {
  title: "BEP-20 & BNB Smart Chain Guides | BNB Token Maker Blog",
  description: "Learn how BEP-20 tokens work, explore BNB Smart Chain token features, and read practical guides about creating and deploying tokens.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "BEP-20 & BNB Smart Chain Guides | BNB Token Maker Blog",
    description: "Learn how BEP-20 tokens work, explore BNB Smart Chain token features, and read practical guides about creating and deploying tokens.",
    url: "https://bnbtokenmaker.com/blog",
    siteName: "BNB Token Maker",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BEP-20 & BNB Smart Chain Guides | BNB Token Maker Blog",
    description: "Learn how BEP-20 tokens work, explore BNB Smart Chain token features, and read practical guides about creating and deploying tokens.",
  },
};

export default function Page() {
  return (
    <>
      <JsonLd data={BLOG_WEBSITE} />


  <section className="page" id="top">
    <div className="container">
      <header className="blog-head reveal is-in">
        <div className="kicker"><span className="dot"></span>BNB Token Maker Blog</div>
        <h1>Learn about BEP-20 tokens and BNB Smart Chain.</h1>
        <p className="lede">Practical guides for creating, deploying and understanding BEP-20 tokens on BNB Smart Chain.</p>
      </header>

      <section className="featured reveal is-in" aria-labelledby="featured-title">
        <div className="feat-inner">
          <span className="blg-cat">Guide</span>
          <h2 id="featured-title">How to Create a BEP-20 Token on BNB Smart Chain</h2>
          <p>A practical introduction to configuring and deploying a BEP-20 token without writing Solidity.</p>
          <a className="go" href="/blog/how-to-create-a-bep20-token">Read guide <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        </div>
      </section>

      <div className="latest-head">
        <h2>Latest Guides</h2>
      </div>
      <div className="blog-tools">
        <div className="blog-filters" data-filters="" aria-label="Filter articles by category">
          <button className="is-active" type="button" data-filter='all'>All</button>
          <button type="button" data-filter='guide'>Guide</button>
          <button type="button" data-filter='token-design'>Token Design</button>
          <button type="button" data-filter='security'>Security</button>
          <button type="button" data-filter='deployment'>Deployment</button>
          <button type="button" data-filter='comparison'>Comparison</button>
        </div>
        <div className="blg-search" role="search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <label className="visually-hidden" htmlFor="blg-search">Search articles</label>
          <input type="search" id="blg-search" name="blg-search" placeholder="Search articles…" autoComplete="off" />
        </div>
      </div>
      <p className="blg-meta" id="blg-meta" aria-live="polite">Showing 9 of 9 articles</p>

      <div className="blog-grid" id="blog-grid">
        <a className="blg-card" href="/blog/how-to-create-a-bep20-token" data-cat='guide'>
          <span className="blg-cat">Guide</span>
          <h3>How to Create a BEP-20 Token on BNB Smart Chain</h3>
          <p>A practical introduction to configuring and deploying a BEP-20 token without writing Solidity.</p>
          <span className="go">Read guide <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </a>
        <a className="blg-card" href="/bep20-tokenomics" data-cat='token-design'>
          <span className="blg-cat">Token Design</span>
          <h3>BEP-20 Tokenomics: Planning Supply, Distribution and Decimals</h3>
          <p>Decide supply, minting, distribution, decimals and burn before you deploy — decision-focused, not hype.</p>
          <span className="go">Plan the supply <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </a>
        <a className="blg-card" href="/bep20-token-security-checklist" data-cat='security'>
          <span className="blg-cat">Security</span>
          <h3>BEP-20 Token Security Checklist</h3>
          <p>The settings and habits to review before signing the deployment — network, ownership, limits and wallet.</p>
          <span className="go">Run the checklist <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </a>
        <a className="blg-card" href="/verify-bep20-token" data-cat='deployment'>
          <span className="blg-cat">Deployment</span>
          <h3>How to Verify a BEP-20 Token on BscScan</h3>
          <p>What source-code verification does, how it differs from an audit, and how to verify your token.</p>
          <span className="go">Start verifying <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </a>
        <a className="blg-card" href="/add-bep20-token-to-wallet" data-cat='deployment'>
          <span className="blg-cat">Deployment</span>
          <h3>How to Add a BEP-20 Token to Your Wallet</h3>
          <p>Add your token to MetaMask or Trust Wallet with the right address, network and decimals.</p>
          <span className="go">Add the token <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </a>
        <a className="blg-card" href="/meme-coin-tokenomics" data-cat='token-design'>
          <span className="blg-cat">Token Design</span>
          <h3>Meme Coin Tokenomics: Supply Strategy for Community Tokens</h3>
          <p>How supply, distribution, limits and ownership fit a community-driven token.</p>
          <span className="go">Design the strategy <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </a>
        <a className="blg-card" href="/bep20-token-cost" data-cat='guide'>
          <span className="blg-cat">Guide</span>
          <h3>How Much Does It Cost to Create a BEP-20 Token?</h3>
          <p>A breakdown of the platform fee and network gas — the two costs behind every deployment.</p>
          <span className="go">See the costs <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </a>
        <a className="blg-card" href="/create-meme-coin-bnb-chain" data-cat='guide'>
          <span className="blg-cat">Guide</span>
          <h3>Create a Meme Coin on BNB Smart Chain</h3>
          <p>A no-code walkthrough for community tokens — supply, controls and what&apos;s coming to the builder.</p>
          <span className="go">Launch a meme coin <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </a>
        <a className="blg-card" href="/bep20-vs-erc20" data-cat='comparison'>
          <span className="blg-cat">Comparison</span>
          <h3>BEP-20 vs ERC-20: What&apos;s the Difference?</h3>
          <p>Two similar standards, two different chains. The practical differences you should know before you choose.</p>
          <span className="go">Compare the standards <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </a>
      </div>

      <div className="blg-empty" id="blg-empty">
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <h3>No articles match your search</h3>
        <p>Try a different term, or clear the search to see everything.</p>
      </div>
    </div>
  </section>

  <section className="section" style={{paddingTop:"clamp(1rem,3vw,2rem)"}}>
    <div className="container">
      <div className="cta-band reveal is-in">
        <div className="cta-inner">
          <div className="cta-kicker">Skip ahead</div>
          <h2>Prefer to get started directly?</h2>
          <p>Configure the details, choose your features and deploy from your wallet on BNB Smart Chain.</p>
        </div>
        <div className="cta-action">
          <a className="btn btn-dark btn-lg" href="/create">
            Create Token
            <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
          <a className="btn btn-plain" href="/features">Explore the features</a>
        </div>
      </div>
    </div>
  </section>

      <BlogFilter />

    </>
  );
}
