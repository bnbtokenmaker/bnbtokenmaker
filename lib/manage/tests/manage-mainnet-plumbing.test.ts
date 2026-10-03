import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { manageNetworkLabel, manageNetworkSummary } from "../copy";
import { networkLabel } from "../../wallet/chains";
import { v1ChainDescriptor } from "../../deploy/chains";
import {
  BSC_MAINNET_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
} from "../../deploy/chains";

/**
 * Regression cover for the C23 mainnet plumbing defects:
 *  - manager reads/receipts were pinned to a hardcoded testnet client;
 *  - the /manage landing advertised "Testnet (97) only";
 *  - the post-deploy CTA linked to /manage/97 unconditionally.
 *
 * Copy assertions run against the real production helpers. The plumbing
 * assertions are structural (source-level) guards, because the read/write
 * paths live inside React hooks that cannot be executed without a DOM.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function source(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const USE_MANAGER_TX = source("components/manage/useManagerTx.ts");
const TOKEN_DASHBOARD = source("components/manage/TokenDashboard.tsx");
const USE_TOKEN_DATA = source("components/manage/useTokenData.ts");
const MANAGE_LANDING = source("components/manage/ManageLanding.tsx");
const DEPLOY_FLOW = source("components/DeployFlow.tsx");

describe("manager copy — chain-aware network naming", () => {
  it("names mainnet and testnet distinctly", () => {
    assert.equal(manageNetworkLabel(BSC_MAINNET_CHAIN_ID), "BNB Smart Chain");
    assert.equal(
      manageNetworkLabel(BSC_TESTNET_CHAIN_ID),
      "BNB Smart Chain Testnet"
    );
  });

  it("appends the chain id in the summary form", () => {
    assert.equal(manageNetworkSummary(BSC_MAINNET_CHAIN_ID), "BNB Smart Chain (56)");
    assert.equal(
      manageNetworkSummary(BSC_TESTNET_CHAIN_ID),
      "BNB Smart Chain Testnet (97)"
    );
  });

  it("never renders an unsupported chain as if it were a supported one", () => {
    const supported = [
      manageNetworkSummary(BSC_MAINNET_CHAIN_ID),
      manageNetworkSummary(BSC_TESTNET_CHAIN_ID),
    ];
    for (const bad of [1, 137, 8453, 0]) {
      const summary = manageNetworkSummary(bad);
      assert.ok(
        !supported.includes(summary),
        `chain ${bad} must not be presented as a supported chain: ${summary}`
      );
      // Only 56/97 may carry the "(id)" summary suffix.
      assert.ok(
        !summary.endsWith("(56)") && !summary.endsWith("(97)"),
        `chain ${bad} must not carry a supported-chain id: ${summary}`
      );
      // Unsupported chains pass the registry label through untouched.
      assert.equal(summary, networkLabel(bad));
    }
  });

  it("delegates to the canonical wallet chain registry", () => {
    assert.equal(manageNetworkLabel(56), networkLabel(56));
    assert.equal(manageNetworkLabel(97), networkLabel(97));
  });

  it("agrees with the deploy chain registry naming", () => {
    for (const chainId of [BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID]) {
      assert.equal(
        manageNetworkLabel(chainId),
        v1ChainDescriptor(chainId)?.name
      );
    }
  });
});

describe("manager landing — no stale testnet-only copy", () => {
  it("drops the 'testnet only for now' claim", () => {
    assert.ok(!MANAGE_LANDING.includes("Testnet (97) only for now"));
  });

  it("drops the 'mainnet stays disabled' claim", () => {
    assert.ok(!MANAGE_LANDING.includes("Mainnet (56) stays disabled"));
    assert.ok(!MANAGE_LANDING.includes("until mainnet activation"));
  });

  it("drops the hardcoded 'BSC Testnet (97)' summary row", () => {
    assert.ok(!MANAGE_LANDING.includes("BSC Testnet (97)"));
  });

  it("renders the network through the chain-aware helpers", () => {
    assert.ok(MANAGE_LANDING.includes("manageNetworkSummary"));
    assert.ok(MANAGE_LANDING.includes("manageNetworkLabel"));
  });
});

describe("manager plumbing — one canonical client selector", () => {
  const SOURCES: Array<[string, string]> = [
    ["useManagerTx", USE_MANAGER_TX],
    ["TokenDashboard", TOKEN_DASHBOARD],
    ["useTokenData", USE_TOKEN_DATA],
  ];

  it("no manager read/write file builds its own viem client", () => {
    for (const [name, src] of SOURCES) {
      assert.ok(
        !src.includes("createPublicClient"),
        `${name} must not construct a public client; use managerPublicClient()`
      );
      assert.ok(
        !/from ["']viem\/chains["']/.test(src),
        `${name} must not import chain objects directly`
      );
    }
  });

  it("every manager read/write file resolves clients through managerPublicClient", () => {
    for (const [name, src] of SOURCES) {
      assert.ok(
        src.includes("managerPublicClient"),
        `${name} must resolve its client via managerPublicClient()`
      );
    }
  });

  it("no manager read/write file pins a single chain", () => {
    for (const [name, src] of SOURCES) {
      assert.ok(
        !src.includes("bscTestnet"),
        `${name} must not pin the testnet chain`
      );
    }
  });
});

describe("useManagerTx — receipt confirmation follows expectedChainId", () => {
  it("selects the receipt client from the expected chain", () => {
    assert.ok(
      USE_MANAGER_TX.includes("managerPublicClient(expectedChainId)"),
      "receipt client must be derived from expectedChainId"
    );
    assert.ok(
      USE_MANAGER_TX.includes("receiptClient.waitForTransactionReceipt"),
      "receipt must be awaited through the selected client"
    );
  });

  it("fails closed on an unsupported chain before broadcasting", () => {
    const guard = USE_MANAGER_TX.indexOf("managerPublicClient(expectedChainId)");
    const throwUnsupported = USE_MANAGER_TX.indexOf("unsupported-chain");
    const broadcast = USE_MANAGER_TX.indexOf("eth_sendTransaction");
    assert.ok(guard !== -1 && throwUnsupported !== -1 && broadcast !== -1);
    assert.ok(
      guard < throwUnsupported && throwUnsupported < broadcast,
      "unsupported chain must throw before eth_sendTransaction"
    );
  });

  it("still blocks a wallet-chain mismatch before broadcasting", () => {
    const mismatch = USE_MANAGER_TX.indexOf("liveChainId !== expectedChainId");
    const broadcast = USE_MANAGER_TX.indexOf("eth_sendTransaction");
    assert.ok(mismatch !== -1, "live chain guard must be present");
    assert.ok(
      mismatch < broadcast,
      "wrong-network guard must run before eth_sendTransaction"
    );
    assert.ok(USE_MANAGER_TX.includes("wrong-network"));
  });

  it("keeps the wallet submission path unchanged", () => {
    assert.ok(USE_MANAGER_TX.includes("useConnection"));
    assert.ok(USE_MANAGER_TX.includes('value: "0x0"'));
  });
});

describe("TokenDashboard — auxiliary reads follow the route chain", () => {
  it("PairInspector receives the chain id", () => {
    assert.ok(
      /function PairInspector\(\{[^}]*chainId/.test(TOKEN_DASHBOARD),
      "PairInspector must take chainId"
    );
    assert.ok(
      TOKEN_DASHBOARD.includes("<PairInspector token={token} chainId={chainId} />"),
      "PairInspector must be given the dashboard chain id"
    );
  });

  it("the block-number query is keyed and scoped to the chain id", () => {
    assert.ok(
      TOKEN_DASHBOARD.includes('queryKey: ["manager-block", chainId]'),
      "block query must be keyed by chainId"
    );
    assert.ok(
      /queryFn:[\s\S]{0,400}managerPublicClient\(chainId\)[\s\S]{0,400}getBlockNumber/.test(
        TOKEN_DASHBOARD
      ),
      "block query must read via managerPublicClient(chainId)"
    );
  });

  it("the whitelist-enforced read uses the chain id and re-runs when it changes", () => {
    assert.ok(
      /function WhitelistEnforceSection\([\s\S]{0,200}chainId/.test(TOKEN_DASHBOARD),
      "WhitelistEnforceSection must take chainId"
    );
    assert.ok(
      /setEnforced\(null\)[\s\S]{0,400}whitelistEnforced/.test(TOKEN_DASHBOARD) ||
        /whitelistEnforced[\s\S]{0,400}setEnforced/.test(TOKEN_DASHBOARD),
      "whitelist read must be present"
    );
    assert.ok(
      TOKEN_DASHBOARD.includes("[token, chainId, revision]"),
      "whitelist effect must depend on chainId"
    );
  });
});

describe("deploy flow — manager link is chain-aware", () => {
  it("builds the manager route from intendedChainId", () => {
    assert.ok(DEPLOY_FLOW.includes("href={`/manage/${intendedChainId}/${token}`}"));
  });

  it("contains no hardcoded testnet manager route", () => {
    assert.ok(!DEPLOY_FLOW.includes("/manage/97"));
  });
});

describe("TokenDashboard — manage verification section", () => {
  it("reuses the shared verification badge instead of duplicating logic", () => {
    assert.ok(
      TOKEN_DASHBOARD.includes('import { VerificationBadge } from "../VerificationBadge"'),
      "must reuse the shared badge"
    );
    assert.ok(
      TOKEN_DASHBOARD.includes("<VerificationBadge chainId={chainId} txHash={txHash} token={token} />"),
      "badge must receive the resolved deployment txHash"
    );
  });

  it("shows verification only for proven V1 tokens", () => {
    assert.ok(
      TOKEN_DASHBOARD.includes('{classification.kind === "own-v1" ? ('),
      "verification section must be gated on own-v1 classification"
    );
    assert.ok(
      TOKEN_DASHBOARD.includes("<ManageVerificationSection chainId={chainId} token={token} />"),
      "section must be mounted for own-v1 tokens"
    );
  });

  it("resolves the deployment txHash server-side from the contract address", () => {
    assert.ok(
      TOKEN_DASHBOARD.includes("/api/deployments/by-contract?chainId=${chainId}&contractAddress=${token}"),
      "txHash must come from the server lookup, never user input"
    );
    assert.ok(
      !/ManageVerificationSection[\s\S]{0,2000}eth_sendTransaction/.test(TOKEN_DASHBOARD),
      "resolution must involve no blockchain writes"
    );
  });

  it("explains unavailable verification without claiming unverified", () => {
    assert.ok(
      TOKEN_DASHBOARD.includes("no deployment record was found for this token"),
      "missing records must render an unavailable note, not a negative verdict"
    );
  });
});
