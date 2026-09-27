/**
 * Phase 7D-F Stage B5: launch Next.js with the testnet operator env.
 *
 * Why this exists: `.env.testnet.local` holds shell-sensitive characters
 * (notably inside DATABASE_URL), so `set -a; source ...` is UNSAFE and
 * forbidden. This loader parses the file with node builtins only — no shell
 * expansion, no eval — and spawns `next dev` with the variables in its
 * environment. Values are NEVER printed (only key names on hard errors).
 *
 * Usage: node scripts/dev-testnet.mjs [-- extra next args]
 * The file path defaults to ./.env.testnet.local (override: TESTNET_ENV_FILE).
 */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const ENV_FILE = (process.env.TESTNET_ENV_FILE ?? "").trim() || "./.env.testnet.local";

function parseEnvFile(text) {
  const out = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`refusing to load: malformed key name for entry starting "${key.slice(0, 32)}"`);
    }
    let value = line.slice(i + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    } else if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

let fileVars;
try {
  fileVars = parseEnvFile(readFileSync(ENV_FILE, "utf8"));
} catch (error) {
  console.error(`dev-testnet: cannot load ${ENV_FILE} (${error instanceof Error ? error.message : String(error)})`);
  process.exit(1);
}

const required = [
  "DATABASE_URL",
  "DEPLOY_QUOTE_SIGNER_KEY",
  "DEPLOY_QUOTE_SIGNER_ADDRESS",
  "DEPLOY_QUOTE_FACTORY_ADDRESS",
  "DEPLOY_QUOTE_CHAIN_ID",
  "DEPLOY_QUOTE_ZERO_FEE",
  "NEXT_PUBLIC_V1_FACTORY_ADDRESS",
];
const missing = required.filter((k) => !(k in fileVars) || fileVars[k].length === 0);
if (missing.length > 0) {
  console.error(`dev-testnet: ${ENV_FILE} is missing required keys: ${missing.join(", ")}`);
  process.exit(1);
}

const child = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
  env: { ...process.env, ...fileVars },
  stdio: "inherit",
});
child.on("exit", (code) => {
  process.exit(typeof code === "number" ? code : 1);
});
