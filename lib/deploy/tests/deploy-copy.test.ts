import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  deployGasAssetName,
  deployIntroCopy,
  deployNetworkName,
  deployNetworkSummary,
} from "../deploy-copy";
import { BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID } from "../chains";
import { DeployPage } from "../../../components/DeployPage";

const here = dirname(fileURLToPath(import.meta.url));
const readRepo = (rel: string): string => readFileSync(join(here, "..", "..", "..", rel), "utf8");

/** Render the real /deploy component with a given intended chain configured. */
function renderDeployPage(chainId: string | null): string {
  const key = "NEXT_PUBLIC_DEPLOY_CHAIN_ID";
  const previous = process.env[key];
  if (chainId === null) delete process.env[key];
  else process.env[key] = chainId;
  try {
    return renderToStaticMarkup(createElement(DeployPage));
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
}

describe("deploy copy — network names come from the intended chain id", () => {
  it("chain 56 renders 'BNB Smart Chain' and never 'BNB Smart Chain Testnet'", () => {
    assert.equal(deployNetworkName(BSC_MAINNET_CHAIN_ID), "BNB Smart Chain");
    assert.equal(
      deployIntroCopy(BSC_MAINNET_CHAIN_ID),
      "Check everything once — limits can't change later. " +
        "Your wallet will ask you to confirm one transaction on BNB Smart Chain.",
    );
    assert.ok(!deployIntroCopy(BSC_MAINNET_CHAIN_ID).includes("Testnet"));
    assert.equal(deployNetworkSummary(BSC_MAINNET_CHAIN_ID), "BNB Smart Chain (56)");
  });

  it("chain 97 renders 'BNB Smart Chain Testnet'", () => {
    assert.equal(deployNetworkName(BSC_TESTNET_CHAIN_ID), "BNB Smart Chain Testnet");
    assert.equal(
      deployIntroCopy(BSC_TESTNET_CHAIN_ID),
      "Check everything once — limits can't change later. " +
        "Your wallet will ask you to confirm one transaction on BNB Smart Chain Testnet.",
    );
    assert.equal(deployNetworkSummary(BSC_TESTNET_CHAIN_ID), "BNB Smart Chain Testnet (97)");
  });

  it("gas asset copy separates real BNB from worthless testnet BNB", () => {
    assert.equal(deployGasAssetName(BSC_MAINNET_CHAIN_ID), "BNB");
    assert.equal(deployGasAssetName(BSC_TESTNET_CHAIN_ID), "testnet BNB");
  });
});

describe("deploy copy — the real /deploy page renders the intended network", () => {
  it("renders mainnet intro copy on chain 56", () => {
    const html = renderDeployPage("56");
    assert.match(html, /confirm one transaction on BNB Smart Chain\./);
    assert.ok(!html.includes("BNB Smart Chain Testnet"), "chain 56 must not show testnet copy");
  });

  it("renders testnet intro copy on chain 97", () => {
    const html = renderDeployPage("97");
    assert.match(html, /confirm one transaction on BNB Smart Chain Testnet\./);
  });

  it("defaults to mainnet copy when no chain is configured (production default)", () => {
    const html = renderDeployPage(null);
    assert.match(html, /confirm one transaction on BNB Smart Chain\./);
    assert.ok(!html.includes("BNB Smart Chain Testnet"));
  });

  it("keeps the non-network parts of the intro copy intact", () => {
    const html = renderDeployPage("56");
    assert.match(html, /Check everything once/);
    assert.match(html, /limits can&#x27;t change later|limits can't change later/);
    assert.match(html, /Your wallet will ask you/);
  });
});

describe("deploy copy — regression guards", () => {
  it("no unconditional 'BNB Smart Chain Testnet' literal remains on /deploy surfaces", () => {
    const surfaces = [
      "components/DeployPage.tsx",
      "components/DeployFlow.tsx",
      "app/deploy/page.tsx",
      "lib/deploy/errors.ts",
    ];
    for (const rel of surfaces) {
      const lines = readRepo(rel).split("\n");
      for (const [index, line] of lines.entries()) {
        if (!line.includes("BNB Smart Chain Testnet")) continue;
        // Every remaining occurrence must be gated on the intended chain.
        const gated =
          line.includes("BSC_MAINNET_CHAIN_ID") ||
          line.includes("BSC_TESTNET_CHAIN_ID") ||
          line.includes("deployNetworkName") ||
          line.includes("deployNetworkSummary");
        assert.ok(gated, `${rel}:${index + 1} unconditional testnet copy: ${line.trim()}`);
      }
    }
  });

  it("display copy cannot be inferred from balance, pricing, hostname or fee", () => {
    // Comments legitimately explain the rule, so guard the executable code only.
    const code = readRepo("lib/deploy/deploy-copy.ts")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    assert.ok(!/balance/i.test(code), "copy must not read wallet balance");
    assert.ok(
      !/pric|fee|wei|host|location|window|navigator/i.test(code),
      "copy must not read pricing, fee or hostname",
    );
    // It may only depend on the chain registry, never on deployment logic.
    const imports = code.match(/^import .*$/gm) ?? [];
    assert.ok(imports.length > 0, "expected the chain registry imports");
    for (const line of imports) {
      assert.ok(
        /from "\.\/chains"|from "\.\.\/wallet\/chains"/.test(line),
        `unexpected dependency in deploy-copy: ${line}`,
      );
    }
  });
});
