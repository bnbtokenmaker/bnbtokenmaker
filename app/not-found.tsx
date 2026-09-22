import type { Metadata } from "next";
import Link from "next/link";
import "./site-chrome.css";
import "./not-found.css";

/**
 * Branded 404. Rendered by Next.js with HTTP 404 (no redirect), inside the
 * shared layout. Imports the shared site shell explicitly so a direct hard
 * load of an unknown URL is fully styled without relying on CSS leaked from
 * a previously visited route.
 */
export const metadata: Metadata = {
  title: "Page not found — BNB Token Maker",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <section className="app" id="top" aria-labelledby="nf-title">
      <div className="container nf-wrap">
        <div className="kicker">
          <span className="dot"></span>BNB Token Maker
        </div>
        <p className="nf-code" aria-hidden="true">
          404
        </p>
        <h1 id="nf-title">Page not found</h1>
        <p className="nf-lede">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="nf-ctas">
          <Link className="btn btn-primary" href="/">
            Back to home
          </Link>
          <Link className="btn btn-ghost" href="/create">
            Create a token
          </Link>
        </div>
      </div>
    </section>
  );
}
