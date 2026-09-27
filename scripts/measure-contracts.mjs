/**
 * Production bytecode measurement (reproducible).
 * Run: npm run contracts:compile && node scripts/measure-contracts.mjs
 * Reads contracts/.artifacts built by hardhat.config.ts
 * (solc 0.8.28, optimizer runs 200, EVM paris, ipfs metadata).
 * Hard gate: TokenFactory deployed < 23,000 B. Target: <= 22,500 B.
 */
import { readFileSync, existsSync } from "node:fs";

const EIP170 = 24576;
const GATE = 23000;

function load(contractFile, contractName) {
  const path = `contracts/.artifacts/contracts/${contractFile}.sol/${contractName}.json`;
  if (!existsSync(path)) return null;
  const artifact = JSON.parse(readFileSync(path, "utf8"));
  const deployed = (artifact.deployedBytecode || "0x").replace(/^0x/, "");
  const init = (artifact.bytecode || "0x").replace(/^0x/, "");
  return {
    name: contractName,
    deployedBytes: deployed.length / 2,
    initBytes: init.length / 2,
  };
}

let gateOk = true;
for (const [file, name] of [
  ["SwapLib", "SwapLib"],
  ["BNBTokenMakerToken", "BNBTokenMakerToken"],
  ["TokenFactory", "TokenFactory"],
]) {
  const info = load(file, name);
  if (!info) {
    console.log(`${name}: MISSING ARTIFACT`);
    gateOk = false;
    continue;
  }
  const pct = ((info.deployedBytes / EIP170) * 100).toFixed(1);
  const headroom170 = EIP170 - info.deployedBytes;
  let extra = `EIP-170 headroom=${headroom170}B${headroom170 < 0 ? " OVER LIMIT" : ""}`;
  if (name === "TokenFactory") {
    const gateHeadroom = GATE - info.deployedBytes;
    extra += ` | gate(23000) headroom=${gateHeadroom}B${gateHeadroom <= 0 ? " GATE BREACH" : ""}`;
    if (gateHeadroom <= 0) gateOk = false;
  }
  console.log(
    `${name}: deployed=${info.deployedBytes}B init=${info.initBytes}B (${pct}% of EIP-170, ${extra})`
  );
}
process.exit(gateOk ? 0 : 1);
