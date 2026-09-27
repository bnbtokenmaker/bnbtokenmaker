# Production / Testnet Readiness Checklist (7D-E4 — no rollout executed)

Legend: [ ] open · [x] done. Nothing below has been executed in E4.

## A. 7D-D — archive-RPC Pancake fork test

- [ ] Provision an archive-capable BSC RPC endpoint (full historical state
  for `eth_getBalance`/`eth_getCode` at arbitrary blocks, sustained
  hundreds of requests per run without throttling). Public dataseeds return
  `missing trie node` and are unsuitable.
- [ ] Set `BSC_FORK_URL` to that endpoint (local env only, never committed).
- [ ] Run the env-gated suite: `BSC_FORK_URL=… npx hardhat test
  contracts/test/fork-pancake.test.ts` — must be fully green.
- [ ] Record the endpoint capability + block/time in the 7D-D report.

## B. 7D-F — Final-V1 BSC Testnet deployment + E2E

- [ ] Deploy `SwapLib` from the frozen source (`contracts/SwapLib.sol`,
  manifest `sourceSha256 4656a0f6…`) on chain 97. Record the address.
- [ ] Link EXACTLY that address into token + factory bytecode; recompile
  with the pinned toolchain (solc 0.8.28, runs 200, paris, ipfs, no viaIR).
- [ ] Verify `creationBytecodeSha256`/`deployedBytecodeSha256` against
  `contracts/freeze/manifest.json` (factory deployed must remain 22,843 B).
- [ ] Deploy `TokenFactory(recipient, initialSigner, MAX_FEE_WEI)` from the
  platform deployer wallet (becomes factory owner; use the offline/hardware
  key that will own rotation).
- [ ] Set `NEXT_PUBLIC_V1_FACTORY_ADDRESS` to the deployed factory (testnet
  env only). The V1 create/deploy UI activates; legacy factory is never
  substituted.
- [ ] Provision the TESTNET quote signer: generate a fresh key offline,
  set `DEPLOY_QUOTE_SIGNER_KEY` / `DEPLOY_QUOTE_SIGNER_ADDRESS` /
  `DEPLOY_QUOTE_FACTORY_ADDRESS` / `DEPLOY_QUOTE_CHAIN_ID=97` /
  `DEPLOY_QUOTE_ZERO_FEE=true` in the testnet server env. Verify the
  address cross-check passes on boot (mismatch fails closed by design).
- [ ] Publish a testnet pricing version over the admin API (or bootstrap),
  including all three V1 capability fees.
- [ ] End-to-end: create → authorize → deploy (zero-fee signed quote) →
  receipt verify → record → Token Manager full action pass on the new token.
- [ ] Verify token + factory sources on BscScan Testnet with the linked
  SwapLib address; confirm linkage display, GENERATOR, MAX_FEE_WEI.

## C. Production migration / pricing rollout

- [ ] Backup production Neon (snapshot/export) and record the restore point.
- [ ] Apply `db/migrations/0004_phase7de1_pricing_v1.sql` via
  `DATABASE_URL=… npm run db:migrate` (reviewed: additive NULLABLE
  columns + CHECKs only; no rewrites; rollback = DROP COLUMNs while no
  version relies on them).
- [ ] Verify columns + CHECK constraints in `pricing_versions`.
- [ ] Deploy the E1 application build (migrations are never auto-applied).
- [ ] Publish the FIRST production pricing version with all eleven fees
  (admin API validates; audit event recorded). Never mutate v7 to fake V1
  support — pre-migration rows stay NULL (= not offered) by design.
- [ ] Verify a commercial quote end-to-end (staging signer, test factory):
  fee math, campaign binding, expiry, nonce uniqueness.

## D. Mainnet SwapLib + Factory deployment

- [ ] Repeat B with mainnet parameters (chain 56): fresh SwapLib deploy,
  link, freeze-verify against the SAME manifest hashes, factory deploy
  with production recipient + production MAX_FEE_WEI.
- [ ] Factory owner = offline/hardware multisig (rotation + lifecycle only).

## E. Source verification

- [ ] Verify SwapLib, TokenFactory and a sample generated token on BscScan
  mainnet with exact settings + library linkage; confirm public display.

## F. Chain-56 activation

- [ ] ONLY after A–E plus testnet E2E are green: enable 56 in app config
  (`v1FactoryAddress` already hard-disables 56 in code — activation is an
  explicit, reviewed code+config change, never an env accident).
- [ ] Provision the PRODUCTION quote signer (fresh key, same env shape,
  `DEPLOY_QUOTE_ZERO_FEE` absent/false, `DEPLOY_QUOTE_CHAIN_ID=56`).

## G. Final smoke tests

- [ ] Commercial quote → authorize → deploy on mainnet (smallest scope):
  exact fee, DeploymentPaid reconciliation, record persistence, manager
  read + one owner write.
- [ ] Admin overview shows the deployment with correct fee/flags/revenue.
- [ ] Fork suite re-run pinned to a recent mainnet block (documents live
  router compatibility at launch).
