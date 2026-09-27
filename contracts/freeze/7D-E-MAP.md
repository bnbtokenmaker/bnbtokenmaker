# 7D-E Integration Map + Plans (7D-C — audit only, nothing implemented)

## 1. 7D-E integration map (files that WILL need changes)

Conventions: `TokenConfig` = §2 of V1-SPEC.md; bitmap = `lib/token/config.ts`
`FEATURE_BITS` (single source of truth — do not duplicate).

### A. Frontend
- `components/DeployFlow.tsx` — builder selections for new capabilities
  (tax bps, marketing wallet, antiBot blocks, autoLiquidity, maxSupply);
  quote flow (server-signed EIP-712 payload replacing the fixed preview);
  value-bearing `createToken(params, quote, signature)` write + simulate;
  receipt parsing already via `lib/token/factory.ts` (update for quote args).
- `app/create/page.tsx`, `app/deploy/page.tsx` — new inputs, review screen
  (fee from signed quote, exact `msg.value` display), post-deploy receipt view.
- `app/deployments/**` — persist + display new scalars (tax, wallet, cap,
  bitmap bits 7–9) from `TokenCreated` + quote metadata.

### B. Backend / API
- `lib/token/config.ts` — `toContractArgs` must emit the 10 new TokenConfig
  fields (currently Phase 6B shape); validation mirrors for tax/wallet/
  threshold/snipe/cap (contract remains final authority).
- `lib/deploy/phase6b.ts` + `lib/deploy/tx.ts` — value-bearing deployment
  machine: chain allowlist 97→56 sequencing, `msg.value == feeWei`
  enforcement pre-flight, quote attachment, simulation.
- `lib/deploy/quote-client.ts` — extend the pricing-quote DTO to the full
  EIP-712 `DeployQuote` (configHash/nonce/expiry/pricingVersion/signature);
  runtime validation fails closed (already the pattern).
- New server signer module (7D-E): holds the quote key, binds
  `keccak256(abi.encode(TokenParams))` + fee + chain + factory + nonce +
  expiry + pricingVersion; authoritative, never in client bundle.
- `lib/token/factory.ts` — `createToken` caller + `DeploymentPaid` parser
  (payment audit); factory address registry per chain (97 now, 56 later).

### C. DB / migration (NOT in this phase — map only)
- `db/migrations/0001_phase7a_foundation.sql` (+ `lib/db/schema.ts`) —
  deployments table needs: `fee_wei`, `pricing_version`, `quote_nonce`,
  `factory_address`, `chain_id` (56 enablement), extended `feature_config`
  (V1 bits 7–9 + tax/wallet/cap scalars → `FeatureConfigV1` v2 or new keys).
- `lib/deployments/validate.ts` — extend `FeatureConfigV1` + strict parser
  (version bump; old rows keep validating).

### D. Admin
- `lib/admin/*`, `app/admin/**` — feature filters for bits 7–9;
  `lib/admin/dashboard/format.ts` — display new flags (currently 7-key
  `FeatureConfigV1`; extend alongside C).
- Pricing: `lib/pricing/*` (`PaidFeatureId`, presets, campaigns) — new
  purchasable capabilities (trading/antiBot/autoLiquidity) + `MAX_FEE_WEI`
  alignment; quote endpoint signs the frozen EIP-712 schema.

### E. Token Manager (plan in §2, no UI in this phase)
- ABI source: `lib/token/abi/BNBTokenMakerToken.json` (already synced).

### F. Analytics
- Index `TokenCreated` (features bitmap → capabilities),
  `DeploymentPaid` (fee/pricingVersion/nonce), token config events
  (wallet/exemption/pair/list/trading/swapBack) for funnels + revenue.
  No new contract events needed (§4 V1-SPEC).

### G. Content / SEO
- No copy changes in this phase. Later: feature pages for tax,
  anti-bot, auto-liquidity, lifetime cap (lifetime-vs-current-supply
  explainer), quote/fee transparency page. No content touched now.

## 2. Token Manager implementation plan (no UI in this phase)

### A. BNBTokenMaker-created tokens
- Detect via `token.FACTORY()` ∈ known-factory registry AND
  `GENERATOR() == "BNBTokenMaker.com"` (informational; factory check is
  authoritative). Management UI free.
- Reads: full V1-SPEC §2 surface (state + `totalMinted` for cap headroom).
- Writes (user wallet only, user pays gas): mint, burn, burnFrom (with
  allowance), pause/unpause, blacklist/whitelist + enforcement, fee
  exemption, marketing wallet, AMM pair add/remove, swapBack toggle,
  enableTrading, transferOwnership, renounceOwnership. Gate each control on
  the corresponding immutable flag/bit (disabled ⇒ revert by design; hide
  or disable with reason).
- Authority check: `owner()` == connected wallet for owner-only calls;
  anyone may call views; burn/transfer work for holders as usual.

### B. External BEP-20 tokens (future, optional paid access)
- User supplies/selects contract address. Probe, never assume:
  1. Standard detection: `try/catch` (or `eth_call`) probes for
     `owner()`, `pause()`/`unpause()`/`paused()`, `mint(address,uint256)`,
     `burn(uint256)`, list setters — expose ONLY functions that resolve.
  2. Ownership/roles: `owner()` success ⇒ owner-gated model; failure ⇒
     treat as ownerless (views + holder actions only).
  3. Custom functions (tax knobs, limits, marketing): NOT safely inferable
     generically — never expose; supported-safe-function list only.
- Paid unlock: interface boundary only — entitlement check before exposing
  probed controls; no payment implementation in this phase.
- No platform token authority in either model: the manager never holds
  keys, never self-grants roles, never proxies calls.

## 3. Mainnet deployment ceremony (DO NOT EXECUTE — plan only)

1. `SwapLib` deploys from the frozen source (manifest `sourceSha256`
   `4656a0f6…`); record address.
2. Link EXACTLY that address into token + factory bytecode
   (`linkReferences` in manifest); recompile with the pinned toolchain
   (solc 0.8.28, runs 200, paris, ipfs metadata, no viaIR).
3. Freeze linked artifacts; verify `creationBytecodeSha256`/
   `deployedBytecodeSha256` match `manifest.json`.
4. Deploy `TokenFactory(recipient, initialSigner, MAX_FEE_WEI)` from the
   platform deployer wallet (deployer becomes factory owner).
5. Verify on BscScan: flattened/linked sources with the SAME settings;
   generated-token verification requires the linked SwapLib address
   (libraries section / `--libraries SwapLib:<addr>`); confirm BscScan
   shows library linkage, `GENERATOR`, and `MAX_FEE_WEI`/`feeRecipient`.
6. Configure production env (factory address, chain 56 RPC, signer
   service) — secrets in platform secret storage, never in repo.
7. Enable chain 56 in app config ONLY after: fork test green (archive
   endpoint, §4), testnet end-to-end green, pricing/quotes live.
- Factory signer rotation is controlled by the factory OWNER key: an
  offline/hardware platform wallet (multisig preferred), used ONLY for
  `setSigner` + ownership lifecycle. The hot quote-signing backend key
  holds funds never and authority nothing — compromise response is rotation.
- No private keys or secrets in this repo, now or ever.

## 4. Fork/test gap (blocker for mainnet, NOT for 7D-E)

`contracts/test/fork-pancake.test.ts` stays env-gated (`BSC_FORK_URL`) and
skipped by default. Public BSC endpoints (`bsc-dataseed`, `bsc-dataseed1`)
fail fork state reads (`missing trie node`, 2 attempts, not retried).
Required capability for 7D-D: archive-capable BSC RPC (full historical
state for `eth_getBalance`/`eth_getCode` at arbitrary blocks, sustained
~hundreds of requests per run without throttling). The test self-cleans
(`hardhat_reset` to ephemeral afterwards) and the helpers re-resolve the
library per chain, so enabling it later is a one-env-var change.
