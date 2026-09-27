/**
 * Generates the V1 contract freeze manifest (reproducible).
 * Run: npm run contracts:compile && node scripts/freeze-manifest.mjs
 * Writes contracts/freeze/manifest.json containing compiler settings (from
 * the actual Hardhat build-info), source/ABI/bytecode hashes and sizes, so a
 * future deployment can be proven byte-identical to the approved code.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcesDir = join(root, "contracts");
const artifactsDir = join(root, "contracts", ".artifacts", "contracts");
const buildInfoDir = join(root, "contracts", ".artifacts", "build-info");
const outDir = join(root, "contracts", "freeze");

const sha256hex = (data) =>
  createHash("sha256").update(data).digest("hex");
const bytesOf = (hex) => (hex.replace(/^0x/, "").length / 2);

function buildSettings() {
  const files = readdirSync(buildInfoDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) throw new Error("no build-info found; compile first");
  files.sort();
  const info = JSON.parse(
    readFileSync(join(buildInfoDir, files[files.length - 1]), "utf8")
  );
  return {
    solcVersion: info.solcVersion,
    optimizer: info.input?.settings?.optimizer ?? null,
    evmVersion: info.input?.settings?.evmVersion ?? null,
    metadata: info.input?.settings?.metadata ?? null,
    viaIR: info.input?.settings?.viaIR ?? false,
  };
}

function freezeContract(sourceBase, contractName) {
  const sourcePath = join(sourcesDir, `${sourceBase}.sol`);
  const source = readFileSync(sourcePath, "utf8");
  const artifactPath = join(artifactsDir, `${sourceBase}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  const deployed = (artifact.deployedBytecode || "0x").replace(/^0x/, "");
  const creation = (artifact.bytecode || "0x").replace(/^0x/, "");
  const abiCanonical = JSON.stringify(artifact.abi);
  return {
    contract: contractName,
    source: `${sourceBase}.sol`,
    sourceSha256: sha256hex(source),
    abiSha256: sha256hex(abiCanonical),
    abiFunctions: artifact.abi.filter((e) => e.type === "function").length,
    abiEvents: artifact.abi.filter((e) => e.type === "event").length,
    deployedBytes: bytesOf(deployed),
    creationBytes: bytesOf(creation),
    deployedBytecodeSha256: sha256hex(deployed),
    creationBytecodeSha256: sha256hex(creation),
    linkReferences: artifact.linkReferences ?? {},
  };
}

const settings = buildSettings();
const manifest = {
  schema: "bnbtokenmaker-contract-freeze/1",
  toolchain: {
    solc: settings.solcVersion,
    optimizer: settings.optimizer,
    evmVersion: settings.evmVersion,
    metadata: settings.metadata,
    viaIR: settings.viaIR,
    openzeppelin: "5.4.0",
  },
  gate: { factoryDeployedMaxBytes: 23000, eip170MaxBytes: 24576 },
  contracts: [
    freezeContract("SwapLib", "SwapLib"),
    freezeContract("BNBTokenMakerToken", "BNBTokenMakerToken"),
    freezeContract("TokenFactory", "TokenFactory"),
  ],
};

const factory = manifest.contracts.find((c) => c.contract === "TokenFactory");
if (factory.deployedBytes >= manifest.gate.factoryDeployedMaxBytes) {
  console.error(
    `GATE BREACH: factory ${factory.deployedBytes}B >= ${manifest.gate.factoryDeployedMaxBytes}B`
  );
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
for (const c of manifest.contracts) {
  console.log(
    `${c.contract}: src=${c.sourceSha256.slice(0, 12)}… abi=${c.abiSha256.slice(0, 12)}… ` +
      `deployed=${c.deployedBytes}B (${c.deployedBytecodeSha256.slice(0, 12)}…) ` +
      `creation=${c.creationBytes}B (${c.creationBytecodeSha256.slice(0, 12)}…)`
  );
}
console.log(`wrote contracts/freeze/manifest.json (factory gate OK)`);
