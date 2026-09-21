"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import {
  HeaderWalletButton,
  HeaderWalletLink,
} from "./wallet/HeaderWallet";

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
      <circle
        cx="20"
        cy="20"
        r="11"
        stroke="currentColor"
        strokeWidth="3.4"
      ></circle>
      <path
        d="M20 12.5v15M12.5 20h15"
        stroke="currentColor"
        strokeWidth="4.6"
        strokeLinecap="round"
      ></path>
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
          <HeaderWalletLink />
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <HeaderWalletButton />
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