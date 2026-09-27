# Phase 7D-B2 contracts — production V1 (NOT YET DEPLOYED)

> This phase is implementation + testing ONLY. No testnet/mainnet deployment,
> no BNB spent, no pricing/DB/frontend/backend wiring (those are later phases).

## Architecture (frozen V1)

Monolithic token + external immutable stateless SwapLib + single EIP-712
factory. No proxies, no upgradeability, no hidden admin, no hidden platform
tax, no backdoors.

- `contracts/SwapLib.sol` — stateless library: full config validation
  (`validateBasicConfig` / `validateAdvancedConfig`), PancakeSwap V2
  swap/liquidity execution (`executeSwap`, `pairHasLiquidity`). Zero storage,
  no owner/admin, no selfdestruct, no delegatecall of its own, no platform
  role. Marketing BNB can only flow to the explicit wallet parameter; LP is
  ALWAYS sent to the burn address.
- `contracts/BNBTokenMakerToken.sol` — the generated token. Frozen V1 set:
  ERC-20/BEP-20 base, burn, mint, maximum LIFETIME supply (cumulative
  issuance incl. initial supply, excl. burns; `maxSupply == 0` is an explicit
  immutable unlimited choice), pause, blacklist, whitelist, maxTx, maxWallet,
  buy/sell tax (<=10% each, AMM-pair sides only), marketing wallet, fee
  exemption, bounded anti-bot launch, auto-liquidity with recovery-only
  swapBack toggle, pair registry (pairs can never be blacklisted or
  tax-exempted), ownership transfer/renounce, on-chain provenance
  (`GENERATOR`) + immutable factory lineage (`FACTORY`).
  NO ERC-2612 Permit, NO Permit2 (excluded in 7D-B1.1: even permit-only
  pushed the factory past EIP-170).
- `contracts/TokenFactory.sol` — EIP-712 quoted deployment: server-signed
  `DeployQuote` (config hash, exact fee, chainId, factory, nonce, expiry,
  pricing version), immutable `MAX_FEE_WEI` cap, rotatable signer,
  immutable fee recipient, nonce/replay registry, `owner == msg.sender`
  structural guarantee, checked fee forwarding. Factory ownership covers
  signer rotation + ownership lifecycle ONLY — zero authority over tokens.
- `contracts/mocks/MockPancake.sol` — TEST ONLY helpers (mock router etched
  at the canonical address via `hardhat_setCode`, mock pair, atomic
  BatchBuyer). Never deployed by the factory or app.

## Linked-library deployment ceremony (REQUIRED)

SwapLib must be deployed FIRST standalone; its address is then LINKED into
the token AND factory bytecode at compile time (the factory embeds token
creation code, placeholders included); then the factory is deployed with the
linked bytecode. Direct Solidity calls (`SwapLib.f(...)`) compile to
DELEGATECALL, so execution always runs in the calling token's context.
The library can never be replaced for an existing token.

## Toolchain (pinned, reproducible)

- Solidity `0.8.28` (checked arithmetic, custom errors)
- OpenZeppelin Contracts `5.4.0` (`ERC20`, `Ownable`, `EIP712`, `ECDSA` — factory only)
- Hardhat `2.26.3` + `@nomicfoundation/hardhat-viem` `2.1.x`
- EVM target `paris` (safe for BSC mainnet/testnet)

## Commands

```sh
npm run contracts:compile    # compile (sources -> contracts/.artifacts, gitignored)
npm run contracts:test       # 107 in-process tests + 1 env-gated fork test (skipped)
node scripts/measure-contracts.mjs  # reproducible size gate (exit 1 on breach)
```

## Production sizes (measured, same toolchain)

- SwapLib: deployed 4,300 B / init 4,357 B (17.5% of EIP-170)
- BNBTokenMakerToken: deployed 10,862 B / init 16,810 B (44.2% of EIP-170)
- TokenFactory: deployed 22,843 B / init 24,222 B (92.9% of EIP-170,
  +1,733 B EIP headroom, **+157 B to the 23,000 B gate**)

Gate `<23,000 B`: PASS. Preferred target `<=22,500 B`: missed by 343 B —
full provenance retained (complete removal saves only ~192 B and is
disallowed merely for bytes; remaining honest levers cut debuggability).
Any V1.x change must re-run the measurement.

## Test battery (contracts/test, all in-process, no network, no secrets)

A. regression (base/features/combinations, incl. updated maxWallet
   exempt-leg semantics) · B. supply/lifetime cap · C. tax · D. pair
   controls · E. anti-bot · F. auto-liquidity (mock router) · G. platform
   isolation · H. EIP-712 quotes · I. ABI privilege allowlist · fork
   integration: env-gated (`BSC_FORK_URL`), skipped — public BSC endpoints
   return `missing trie node` for fork state (tried twice, not hammered);
   needs a provisioned archive endpoint in a later phase.

## Safety rules (enforced by tests, not just docs)

- Factory requires `owner == msg.sender` + `msg.value == quote.feeWei` +
  valid rotatable-signer signature over the EXACT config hash; quotes carry
  nonce registry, expiry, chainId, factory address and fee cap.
- Pair cannot be blacklisted or fee-exempted; LP only to burn; swap failure
  never reverts holder transfers; pause precedes swap behavior.
- `receive()` accepts BNB only from the Pancake router.
- ABI allowlist test fails on any new privileged mutator.

---

# Phase 6B contracts — BSC Testnet deployment engine (HISTORICAL)

Single-implementation BEP-20 + fee-free factory. No proxies, no upgradeability,
no hidden admin, no taxes, no fees. Full feature semantics are documented in
`BNBTokenMakerToken.sol` NatSpec and covered by tests in `test/`.

## Toolchain (pinned)

- Solidity `0.8.28` (checked arithmetic, custom errors)
- OpenZeppelin Contracts `5.4.0` (`ERC20`, `Ownable` only)
- Hardhat `2.26.3` + `@nomicfoundation/hardhat-viem` `2.1.x`
- EVM target `paris` (safe for BSC mainnet/testnet)

## Commands

```sh
npm run contracts:compile    # compile (sources -> contracts/.artifacts, gitignored)
npm run contracts:test       # 56 in-process tests (no network, no secrets)
npm run contracts:artifacts  # compile + sync ABIs to lib/token/abi/*.json
```

## Testnet configuration (chain 97)

- Native token: tBNB · Explorer: https://testnet.bscscan.com
- RPC: `BSC_TESTNET_RPC_URL` env, else public default (reads only).
- Verification: `hardhat verify --network bscTestnet <addr> ...` once
  `BSCSCAN_API_KEY` is set. Never invent or commit a key.

## BSC Testnet Deployment (chain 97)

- Factory: `0x5357b13C30967197CF38b5FfAE2088417c562187` — source verified on
  BscScan Testnet (Remix/Sourcify build, solc 0.8.28, optimizer runs 200).
  Recorded as `NEXT_PUBLIC_TESTNET_FACTORY_ADDRESS` in `.env.example`.
- Test token via `createToken`: `0x5bea9f88D0699ad213bae63d28a0164c770c8dc8`
  ("BNB Token Maker Test", BTMTEST, 18 decimals, 1,000,000 supply, base
  config — optional features disabled).
- `createToken` tx `0xbef763b25b6f9b8363b0ef9361356d1b46890eaf88eb60d2721af3f383cb748`:
  SUCCESS, value 0 BNB (gas only — no platform fee by construction).
- Owner/deployer `0x8d3218A2cD42388CA627a9432e8b14F65d1c9990` received the
  full 1,000,000 BTMTEST; BscScan detects the token as BEP-20.
- Generated-token source verification is deferred to the automated Phase 6C+
  integration (intentional, not a failure).

## Manual re-deployment flow — wallet-signed only (reference)

This repo performs NO automated signing: `hardhat.config.ts` configures zero
accounts on purpose. There is deliberately no deploy script that accepts a
private key. The real test is done by a human, in a browser, on BSC Testnet:

1. Get tBNB from a BSC Testnet faucet.
2. The live factory address is recorded above and in `.env.example`.
3. Deploy `TokenFactory` from your wallet. Safest path is Remix
   (https://remix.ethereum.org) connected to BSC Testnet (chain 97):
   compile `TokenFactory.sol` + `BNBTokenMakerToken.sol` at Solidity 0.8.28
   with optimizer runs 200, deploy `TokenFactory` with 0 value attached.
4. In Remix (or BscScan Testnet "Write Contract"), call
   `createToken` with your test parameters and 0 value. Your wallet signs;
   your address becomes the token owner (`owner == msg.sender` is enforced).
5. Record the `TokenCreated` event (token address), verify on BscScan
   Testnet: name/symbol/decimals/supply/owner, a transfer, and that only
   gas (tBNB) was spent — no fee transfer exists.
6. Verify source on BscScan Testnet, then update
  `NEXT_PUBLIC_TESTNET_FACTORY_ADDRESS` in `.env.example` if the factory
  address changed (never commit a mainnet address here).

## Safety rules (enforced by tests, not just docs)

- `TokenFactory.createToken` is non-payable: ANY attached value reverts.
- Factory requires `owner == msg.sender`: ownership can never be diverted.
- `lib/deploy/phase6b.ts` fails closed unless the LIVE provider chain is 97.
- Never paste a private key / seed phrase anywhere in this repo or chat.
