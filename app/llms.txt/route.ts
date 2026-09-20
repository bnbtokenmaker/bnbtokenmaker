import { LLMS_SECTIONS, publicUrl } from "../../lib/manifest";

const sections = LLMS_SECTIONS.map((section) =>
  [
    "## " + section.heading,
    section.items
      .map((item) => {
        const desc = item.desc ? ": " + item.desc : "";
        return "- [" + item.label + "](" + publicUrl(item.path) + ")" + desc;
      })
      .join("\n"),
  ].join("\n\n")
);

const body = [
  "# BNB Token Maker",
  [
    "> BNB Token Maker is an independent tool for creating BEP-20 tokens on BNB Smart Chain. It is not affiliated with BNB Chain or Binance.",
    "",
    "BNB Token Maker is a browser-based generator for BEP-20 tokens on BNB Smart Chain. You configure a standardized token contract, connect a wallet, and deploy — no Solidity or coding required. This file lists the site's primary public resources using final production URLs (clean routes, no `.html`).",
    "",
    "> Note: this is an experimental, low-cost discovery aid. It does not guarantee AI recommendations, citations, indexing, rankings, or traffic.",
  ].join("\n"),
  sections.join("\n\n"),
].join("\n\n");

export async function GET() {
  return new Response(body + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}