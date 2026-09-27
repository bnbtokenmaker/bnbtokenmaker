import type { Metadata } from "next";

import "../../../site-chrome.css";
import "../../../deploy/page.css";
import "../../../create/page.css";
import "../../page.css";
import { TokenDashboard } from "../../../../components/manage/TokenDashboard";

export const metadata: Metadata = {
  title: "Token Dashboard — BNB Token Maker",
  description: "Inspect and manage a token contract on BNB Smart Chain.",
};

export default async function ManageTokenPage({
  params,
}: {
  params: Promise<{ chainId: string; tokenAddress: string }>;
}) {
  const { chainId, tokenAddress } = await params;
  const parsedChain = Number(chainId);
  return (
    <section className="app" id="top">
      <div className="container">
        <header className="app-head">
          <div className="kicker">
            <span className="dot"></span>Token Manager
          </div>
          <h1>Token dashboard.</h1>
          <p className="intro">
            Live on-chain state below. On-chain owner decides what you may do.
          </p>
        </header>
        <TokenDashboard
          chainId={Number.isInteger(parsedChain) ? parsedChain : NaN}
          tokenAddress={tokenAddress ?? ""}
        />
      </div>
    </section>
  );
}
