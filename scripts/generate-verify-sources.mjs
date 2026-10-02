/**
 * Generate the tracked BscScan verification sources module.
 *
 * Reads the frozen contract sources + OpenZeppelin dependencies from disk,
 * asserts they are byte-identical to BOTH the contract freeze manifest and
 * the Hardhat build-info compiler input, then writes lib/verify/sources.ts
 * with the exact source paths solc was invoked with.
 *
 * Run: node scripts/generate-verify-sources.mjs
 * Any hash mismatch aborts loudly: tracked verification material must never
 * silently drift from the frozen production toolchain.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Exact source keys from the frozen Hardhat build-info compiler input.
// Only the transitive import closure of BNBTokenMakerToken is tracked:
// factory-only files (TokenFactory, EIP712/ECDSA, mocks) are excluded.
const SOURCE_PATHS = [
  "contracts/BNBTokenMakerToken.sol",
  "contracts/SwapLib.sol",
  "@openzeppelin/contracts/access/Ownable.sol",
  "@openzeppelin/contracts/token/ERC20/ERC20.sol",
  "@openzeppelin/contracts/token/ERC20/IERC20.sol",
  "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol",
  "@openzeppelin/contracts/utils/Context.sol",
  "@openzeppelin/contracts/interfaces/draft-IERC6093.sol",
];

function diskPath(sourceKey) {
  if (sourceKey.startsWith("contracts/")) return join(ROOT, sourceKey);
  return join(ROOT, "node_modules", sourceKey);
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fail(message) {
  console.error(`generate-verify-sources: FATAL: ${message}`);
  process.exit(1);
}

const freezeManifest = JSON.parse(
  readFileSync(join(ROOT, "contracts/freeze/manifest.json"), "utf8")
);
const freezeHashes = new Map(
  freezeManifest.contracts.map((c) => [c.source, c.sourceSha256])
);

const buildInfoDir = join(ROOT, "contracts/.artifacts/build-info");
let buildInfoPath = null;
try {
  const { readdirSync } = await import("node:fs");
  const files = readdirSync(buildInfoDir).filter((f) => f.endsWith(".json"));
  if (files.length !== 1) fail(`expected exactly one build-info file, found ${files.length}`);
  buildInfoPath = join(buildInfoDir, files[0]);
} catch (error) {
  fail(`cannot read build-info directory: ${error.message}`);
}
const buildInfo = JSON.parse(readFileSync(buildInfoPath, "utf8"));
const buildSources = buildInfo.input?.sources ?? null;
if (!buildSources) fail("build-info has no input.sources");

const entries = [];
for (const key of SOURCE_PATHS) {
  let content;
  try {
    content = readFileSync(diskPath(key), "utf8");
  } catch (error) {
    fail(`cannot read ${key}: ${error.message}`);
  }
  // Guard 1: local contracts must match the frozen source hashes.
  if (key.startsWith("contracts/")) {
    const localName = key.slice("contracts/".length);
    const expected = freezeHashes.get(localName);
    if (!expected) fail(`no freeze-manifest entry for ${localName}`);
    const actual = sha256Hex(content);
    if (actual !== expected) {
      fail(`freeze drift for ${key}: disk=${actual} frozen=${expected}`);
    }
  }
  // Guard 2: every tracked source must be byte-identical to the exact
  // compiler input Hardhat used (path keys AND content).
  const built = buildSources[key]?.content;
  if (built === undefined) fail(`build-info input.sources has no key ${key}`);
  if (built !== content) fail(`build-info drift for ${key}`);
  entries.push({ key, content, sha256: sha256Hex(content) });
}

const lines = [];
lines.push("/**");
lines.push(" * FROZEN BscScan verification sources (GENERATED — do not edit by hand).");
lines.push(" *");
lines.push(" * Produced by scripts/generate-verify-sources.mjs from the frozen");
lines.push(" * contract sources. Every entry is asserted byte-identical to BOTH");
lines.push(" * the contract freeze manifest and the Hardhat build-info compiler");
lines.push(" * input before this file is written. Source keys are the exact paths");
lines.push(" * solc was invoked with, so Standard JSON built from this module");
lines.push(" * reproduces the frozen toolchain byte-for-byte.");
lines.push(" *");
lines.push(" * Regenerate with: node scripts/generate-verify-sources.mjs");
lines.push(" */");
lines.push("");
lines.push("export const VERIFY_SOURCES: Record<string, string> = {");
for (const { key, content } of entries) {
  lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(content)},`);
}
lines.push("};");
lines.push("");
lines.push("export const VERIFY_SOURCE_HASHES: Record<string, string> = {");
for (const { key, sha256 } of entries) {
  lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(sha256)},`);
}
lines.push("};");
lines.push("");

writeFileSync(join(ROOT, "lib/verify/sources.ts"), lines.join("\n"));
console.log(
  `generate-verify-sources: wrote lib/verify/sources.ts (${entries.length} sources, ` +
    `freeze + build-info assertions passed)`
);
