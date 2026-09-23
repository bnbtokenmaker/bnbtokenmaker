import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DeploymentRow } from "../../../db/schema";

/**
 * Admin dashboard payload safety.
 *
 * Dashboard pages render `DeploymentRow` records fetched server-side. This
 * suite pins the exact serialized key surface: if a sensitive column (hash,
 * secret, credential) is ever added to the table, this test fails and
 * forces an explicit review before it can reach admin HTML/RSC payloads.
 */
const DEPLOYMENT_ROW_KEYS = [
  "id",
  "chainId",
  "txHash",
  "contractAddress",
  "factoryAddress",
  "deployerAddress",
  "tokenName",
  "tokenSymbol",
  "decimals",
  "initialSupplyBase",
  "featureConfig",
  "quoteSnapshot",
  "platformFeeWei",
  "status",
  "blockNumber",
  "confirmedAt",
  "createdAt",
  "schemaVersion",
] as const;

const FORBIDDEN_FRAGMENTS = [
  "password",
  "tokenhash",
  "sessionhash",
  "secret",
  "credential",
  "privatekey",
  "seed",
  "mnemonic",
  "rpc_url",
  "rpcurl",
  "database_url",
  "cookie",
  "authorization",
  "stack",
];

function fabricatedRow(): DeploymentRow {
  const now = new Date("2026-09-23T14:05:32.000Z");
  return {
    id: 7,
    chainId: 97,
    txHash:
      "0xaf52ed25e9ad10c0d22455c1bcda4bf0b095eadeceab9debf4d2e0c93203a45c",
    contractAddress: "0x1111111111111111111111111111111111111111",
    factoryAddress: "0x5357b13c30967197cf38b5ffae2088417c562187",
    deployerAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    tokenName: "Test Token",
    tokenSymbol: "TST",
    decimals: 18,
    initialSupplyBase: "1000000000000000000000000",
    featureConfig: { version: 1, burn: true, mint: false },
    quoteSnapshot: { pricingVersion: "dev-1", totalWei: "0", selectedFeatures: [] },
    platformFeeWei: "0",
    status: "confirmed",
    blockNumber: 42,
    confirmedAt: now,
    createdAt: now,
    schemaVersion: 1,
  };
}

describe("admin dashboard — payload key allowlist (no secrets to the client)", () => {
  it("serialized rows expose exactly the trusted allowlisted keys", () => {
    const row = fabricatedRow();
    assert.deepEqual(Object.keys(row).sort(), [...DEPLOYMENT_ROW_KEYS].sort());
  });

  it("serialized payloads contain no secret-like fragments", () => {
    const payload = JSON.stringify(fabricatedRow()).toLowerCase();
    for (const fragment of FORBIDDEN_FRAGMENTS) {
      assert.ok(
        !payload.includes(fragment),
        `dashboard payload must not contain "${fragment}"`
      );
    }
  });
});
