# 7D-F Stage A — Testnet Deployment Preparation (DO NOT DEPLOY YET)

Stage-B approval is REQUIRED before any command here touches chain 97.
Stage A delivers: audited script, env plan, estimates, verification plan,
E2E matrix. Nothing below has been executed against any live chain.

## 1. Freeze pre-flight (all green in Stage A)

- `npx hardhat compile --force` clean; factory **22,843 B** (gate +157 B).
- `node scripts/freeze-manifest.mjs` regenerates byte-identical manifest.
- Hardhat suite 109 passing + 1 pending (live-fork smoke, still env-gated).
- Unit suite 630/630. Deploy script fail-closed gates validated locally
  (missing-env refusal, dead-RPC refusal, ephemeral-chain refusal).

## 2. Deployment architecture

`SwapLib` → link exact address → `TokenFactory(feeRecipient, quoteSigner,
MAX_FEE_WEI)` on BSC Testnet (97). Frozen sources only; no mocks, no spike
code, no Phase-6 factory. Script: `scripts/deploy-testnet-v1.ts`
(idempotent via `testnet-deployments/v1-manifest.json`, resumes verified
steps, never repeats them; constructor-parameter changes fail closed).

## 3. Environment (NAMES ONLY — no values committed, none in this repo)

| Variable | Purpose |
|---|---|
| `TESTNET_DEPLOYER_KEY` | Dedicated TESTNET deployer key (0x hex). Funds: tBNB only. |
| `TESTNET_DEPLOYER_ADDRESS` | Expected deployer address — the run aborts unless the key derives exactly this (wrong-key catch). |
| `TESTNET_FEE_RECIPIENT` | Factory fee recipient (any test address; testnet fees are zero). |
| `TESTNET_QUOTE_SIGNER` | EIP-712 quote signer ADDRESS (must equal the server key's address). |
| `TESTNET_MAX_FEE_WEI` | MAX_FEE_WEI cap, canonical wei string (recommend `500000000000000000` = 0.5 BNB; zero-fee quotes always pass any cap). |
| `BSC_TESTNET_RPC_URL` | Testnet RPC endpoint (existing hardhat `bscTestnet` network). |

Server env (separate, for the quote service under test):
`DEPLOY_QUOTE_SIGNER_KEY` (the key itself — server only, never committed),
`DEPLOY_QUOTE_SIGNER_ADDRESS`, `DEPLOY_QUOTE_FACTORY_ADDRESS` (= deployed
factory), `DEPLOY_QUOTE_CHAIN_ID=97`, `DEPLOY_QUOTE_ZERO_FEE=true`.

Generate a FRESH testnet-only key locally when provisioning (never reuse
any other key, never print an existing one):
`node -e "console.log('0x'+require('node:crypto').randomBytes(32).toString('hex'))"`
Store it immediately in the operator secret store; this terminal output is
the only place it ever appears.

## 4. tBNB requirement

Measured local gas: SwapLib deploy 982,035 + factory 5,034,915 ≈ 6.02M
total (script budgets 7M). At 3–10 gwei that is ~0.02–0.06 tBNB.
**Require ≥ 0.05 tBNB on the deployer before running; recommend 0.1**
(standard faucet amounts cover this). The script aborts below its
estimate — it never sends an underfunded transaction.

## 5. Testnet pricing/DB plan (staging-isolated, production untouched)

Chosen approach: **separate staging database** (Option A).

1. Provision a staging Postgres (separate Neon project/database — never
   the production connection string).
2. `DATABASE_URL=<staging> npm run db:migrate` (applies 0001→0004;
   0004 adds the three NULLABLE V1 fee columns — no rewrites).
3. `DATABASE_URL=<staging> npm run pricing:bootstrap` (seeds WITH all
   eleven V1 fees from the canonical dev values).
4. Point the test deployment env at staging `DATABASE_URL`; keep
   production Neon credentials out of every test machine.
5. Commercial fee stays zero on testnet regardless of displayed prices
   (`DEPLOY_QUOTE_ZERO_FEE=true` signs `feeWei = 0`; factory call sends
   `msg.value = 0`).

Production v7 is never mutated to fake V1 support.

## 6. Verification plan (BscScan Testnet)

- SwapLib: `npx hardhat verify --network bscTestnet <SWAPLIB> contracts/SwapLib.sol:SwapLib`
  (needs `BSCSCAN_API_KEY`; blank = verify later via the BscScan UI).
- Factory: flattened sources + exact settings (solc 0.8.28, runs 200,
  paris) + constructor args (recipient, signer, maxFeeWei) + library
  linkage `contracts/SwapLib.sol:SwapLib:<SWAPLIB>`; confirm the linkage
  display, `GENERATOR`, `MAX_FEE_WEI` and `feeRecipient` on the verified page.
- Factory-created tokens: verify via BscScan UI with flattened
  `BNBTokenMakerToken.sol`, the 22-field TokenConfig constructor args
  (ABI-encoded from the creation tx input), and the same library address.
- Post-deploy freeze check: record deployed codehash in the manifest and
  compare lengths/hashes against `contracts/freeze/manifest.json`,
  accounting for the linked address + constructor immutables (exact
  runtime match is expected to differ ONLY in those regions; BscScan
  source verification is the deterministic proof).
- Verification failure NEVER triggers redeploy — report separately.

## 7. PancakeSwap TESTNET infrastructure (validate, never assume)

Mainnet DEX addresses MUST NOT be assumed on testnet. Before any
liquidity E2E, validate live on chain 97 (read-only):

1. `router.factory()` → record the testnet factory; `router.WETH()` →
   record testnet WBNB. (Canonical testnet Router02 is widely listed, but
   the on-chain query is authoritative, not memory.)
2. Wrap a dust amount via `WBNB.deposit()`, create the pair via
   `factory.createPair(token, WBNB)`, confirm `getPair` round-trips.
3. Only then proceed with add-liquidity E2E.

If no reliable testnet DEX exists, SKIP the liquidity E2E leg and report
it separately — 7D-D already proves the real mainnet-bytecode DEX path,
and frozen contracts must not change for it.

## 8. E2E matrix (Stage B, real wallet on chain 97)

TEST TOKEN A (basic): name/symbol/supply/decimals, no advanced features.
TEST TOKEN B (full V1): burn, mint + capped max supply, pause, ONE of
blacklist/whitelist, maxTx, maxWallet, trading (buy/sell tax + marketing
wallet), antiBot, autoLiquidity.

Per token (§11): Create UI → pricing display → review → wallet session →
authorize (configHash, signature, nonce, expiry, feeWei=0, factory, chain
97) → wallet confirmation → submission → receipt → TokenCreated +
DeploymentPaid → token address → persistence → success → Manage Token link.
Never success-on-hash-alone.

Manager on TEST TOKEN B (§12): mint within cap, over-cap rejection, burn,
pause + transfer-while-paused check, unpause, list management, marketing
change, exemptions, pair registration, enableTrading one-way, swapBack
toggle, ownership transfer. Renounce ONLY on a disposable TEST TOKEN C
(or last on a sacrificed token).

Security regression on real chain (§14): factory/signer/fee-recipient/
stranger cannot manage; user controls token; fee exactly zero; consumed
quote replay fails; expired quote fails; wrong payer/config/value/chain/
factory all fail.

Gas/cost recording (§15): SwapLib deploy, factory deploy, token A/B
creation, representative manager actions — gas units + tBNB spent (never
extrapolated to mainnet pricing).

## 9. Exact Stage-B commands (run ONLY after explicit approval)

```sh
# 0. Preflight (no chain contact beyond compile/tests)
npx hardhat compile --force && node scripts/measure-contracts.mjs && node scripts/freeze-manifest.mjs

# 1. Fund + verify deployer (address printed by the script itself on abort paths)

# 1b. Key→address cross-check + signing self-proof (READ-ONLY, no spend):
#     prints the derived deployer address, proves the signing stack with a
#     local message-signature self-check, then shows live chain + balance.
TESTNET_DEPLOYER_KEY=0x... \
npx hardhat run scripts/testnet-whoami.ts --network bscTestnet

# 2. Deploy (idempotent; safe to re-run — completed steps are skipped)
TESTNET_DEPLOYER_KEY=0x... \
TESTNET_DEPLOYER_ADDRESS=0x... \
TESTNET_FEE_RECIPIENT=0x... \
TESTNET_QUOTE_SIGNER=0x... \
TESTNET_MAX_FEE_WEI=500000000000000000 \
BSC_TESTNET_RPC_URL=https://... \
npx hardhat run scripts/deploy-testnet-v1.ts --network bscTestnet

# 3. Inspect the manifest (public data only)
cat testnet-deployments/v1-manifest.json

# 4. Verify sources (after filling real addresses)
npx hardhat verify --network bscTestnet <SWAPLIB> contracts/SwapLib.sol:SwapLib

# 5. Staging pricing (isolated database only — never production)
DATABASE_URL=<staging> npm run db:migrate
DATABASE_URL=<staging> npm run pricing:bootstrap
```

## 10. Known blockers / open items for Stage B

- Testnet deployer funding (tBNB faucet) — operator action.
- Testnet quote signer generation + server env wiring — operator action.
- Staging database provisioning — operator action.
- PancakeSwap testnet DEX availability — validate live in Stage B (§7).
- `BSCSCAN_API_KEY` for contract verification (optional; UI fallback exists).
