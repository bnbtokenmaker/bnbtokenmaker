"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

function BrandMark({ size }: { size: number }) {
  return (
    <svg
      className="mark"
      viewBox="0 0 40 40"
      width={size}
      height={size}
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

export function Header() {
  const pathname = usePathname();
  const linkClass = (route: string) =>
    pathname === route ? "is-active" : "";

  return (
    <header className="site-header" id="site-header">
      <div className="container nav-inner">
        <Link className="brand" href="/" aria-label="BNB Token Maker home">
          <BrandMark size={26} />
          <span className="brand-name">
            BNB <span className="brand-m">Token&nbsp;Maker</span>
          </span>
        </Link>
        <nav className="nav-links" id="nav-links" aria-label="Primary">
          <Link className="nav-cta" href="/create">
            <i className="fa-solid fa-coins" aria-hidden="true"></i> Create
            Token
          </Link>
          <Link className={linkClass("/features")} href="/features">
            Features
          </Link>
          <Link className={linkClass("/how-it-works")} href="/how-it-works">
            How It Works
          </Link>
          <Link className={linkClass("/docs")} href="/docs">
            Documentation
          </Link>
          <Link className={linkClass("/blog")} href="/blog">
            Blog
          </Link>
          <Link className={linkClass("/faq")} href="/faq">
            FAQ
          </Link>
          <Link className={linkClass("/contact")} href="/contact">
            Contact
          </Link>
          <a className="nav-wallet-link" href="#">
            <i className="fa-solid fa-wallet" aria-hidden="true"></i>Connect
            Wallet
          </a>
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <button className="btn btn-primary btn-sm nav-wallet" type="button">
            <i className="fa-solid fa-wallet" aria-hidden="true"></i>Connect
            Wallet
          </button>
          <button
            className="nav-toggle"
            id="nav-toggle"
            aria-label="Open menu"
            aria-expanded="false"
            aria-controls="nav-links"
          >
            <i className="fa-solid fa-bars" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </header>
  );
}