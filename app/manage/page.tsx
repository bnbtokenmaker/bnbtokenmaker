import type { Metadata } from "next";

import "../site-chrome.css";
import "../deploy/page.css";
import "../create/page.css";
import "./page.css";
import { ManageLanding } from "../../components/manage/ManageLanding";

export const metadata: Metadata = {
  title: "Token Manager — BNB Token Maker",
  description:
    "Manage tokens created with BNBTokenMaker: supply, pause, lists, trading, pairs, launch, liquidity and ownership. Every action signed by your wallet.",
};

export default function ManagePage() {
  return (
    <section className="app" id="top">
      <div className="container">
        <header className="app-head">
          <div className="kicker">
            <span className="dot"></span>Token Manager
          </div>
          <h1>Manage your token.</h1>
          <p className="intro">
            Inspect any token, manage the ones you own. Free for tokens created
            with BNBTokenMaker — you pay only network gas.
          </p>
        </header>
        <ManageLanding />
      </div>
    </section>
  );
}
