/**
 * Syncs contract ABIs from Hardhat artifacts into lib/token/abi/ for
 * Phase 6C consumption. Run: npm run contracts:artifacts
 * (compiles first, so ABIs can never drift from the sources).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = join(root, "contracts", ".artifacts", "contracts");
const outDir = join(root, "lib", "token", "abi");

const CONTRACTS = ["BNBTokenMakerToken", "TokenFactory"];

mkdirSync(outDir, { recursive: true });
for (const name of CONTRACTS) {
  const file =
    name === "TokenFactory"
      ? join(artifacts, "TokenFactory.sol", "TokenFactory.json")
      : join(artifacts, "BNBTokenMakerToken.sol", "BNBTokenMakerToken.json");
  const artifact = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(artifact.abi)) throw new Error(`no ABI in ${file}`);
  writeFileSync(
    join(outDir, `${name}.json`),
    `${JSON.stringify({ name, abi: artifact.abi }, null, 2)}\n`
  );
  console.log(`wrote lib/token/abi/${name}.json`);
}
