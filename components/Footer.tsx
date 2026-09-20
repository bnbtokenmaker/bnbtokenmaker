import Link from "next/link";

function FooterMark() {
  return (
    <svg
      className="mark"
      viewBox="0 0 40 40"
      width={24}
      height={24}
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="12.5"
        y="12.5"
        width="15"
        height="15"
        rx="3"
        transform="rotate(45 20 20)"
        stroke="currentColor"
        strokeWidth="2.4"
      ></rect>
      <path
        d="M30.4 30.4 34 34"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      ></path>
      <rect
        x="28.75"
        y="28.75"
        width="7.5"
        height="7.5"
        rx="2"
        transform="rotate(45 32.5 32.5)"
        fill="currentColor"
      ></rect>
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="brand" href="/" aria-label="BNB Token Maker home">
              <FooterMark />
              <span className="brand-name">
                BNB <span className="brand-m">Token&nbsp;Maker</span>
              </span>
            </Link>
            <p className="motto">
              A BEP-20 token generator for BNB Smart Chain. Configure, connect
              and deploy — without writing smart contracts.
            </p>
            <p className="footer-indep">
              BNB Token Maker is an independent tool and is not affiliated with
              or endorsed by BNB Chain.
            </p>
          </div>
          <nav aria-label="Product">
            <h4>Product</h4>
            <ul>
              <li>
                <Link href="/create">Create Token</Link>
              </li>
              <li>
                <Link href="/features">Features</Link>
              </li>
              <li>
                <Link href="/how-it-works">How It Works</Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Resources">
            <h4>Resources</h4>
            <ul>
              <li>
                <Link href="/docs">Documentation</Link>
              </li>
              <li>
                <Link href="/blog">Blog</Link>
              </li>
              <li>
                <Link href="/faq">FAQ</Link>
              </li>
            </ul>
            <h4 style={{ marginTop: "1.5rem" }}>Guides</h4>
            <ul>
              <li>
                <Link href="/bep20-token-generator">BEP-20 Token Generator</Link>
              </li>
              <li>
                <Link href="/create-bep20-token">Create a BEP-20 Token</Link>
              </li>
              <li>
                <Link href="/bnb-token-generator">BNB Token Generator</Link>
              </li>
              <li>
                <Link href="/create-token-on-bnb-chain">
                  Create Token on BNB Chain
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Support">
            <h4>Support</h4>
            <ul>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </ul>
          </nav>
          <div>
            <h4>Network</h4>
            <p className="net-info">
              <span className="net-row">
                <img
                  className="net-ico"
                  src="/logo-bnb-chain.svg"
                  alt=""
                  width={13}
                  height={13}
                />
                <span>
                  <b>BNB Smart Chain</b>
                </span>
              </span>
              <br />
              Standard&nbsp;·&nbsp;<b>BEP-20</b>
              <br />
              Mainnet&nbsp;·&nbsp;<b>Chain ID 56</b>
            </p>
          </div>
          <nav aria-label="Legal">
            <h4>Legal</h4>
            <ul>
              <li>
                <Link href="/terms">Terms</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy</Link>
              </li>
              <li>
                <Link href="/disclaimer">Disclaimer</Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© 2026 BNB Token Maker. An independent tool for BNB Smart Chain.</span>
          <span>BEP-20&nbsp;·&nbsp;BNB Smart Chain</span>
        </div>
      </div>
    </footer>
  );
}