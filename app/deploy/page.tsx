import type { Metadata } from "next";
import "../site-chrome.css";
import "./page.css";
import { DeployPage } from "../../components/DeployPage";

/**
 * Dedicated deployment workflow page (application UI, not content).
 * Deliberately excluded from indexing and from the sitemap: it only makes
 * sense as the second step after configuring a token on /create.
 */
export const metadata: Metadata = {
  title: "Review & Deploy Token — BNB Token Maker",
  description: "Review your BEP-20 token configuration and deploy it to BNB Smart Chain Testnet from your wallet.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function Page() {
  return <DeployPage />;
}
