# BNBTokenMaker Factory V1 — Frozen Interface Spec (7D-C)

Companion files: `manifest.json` (hashes/sizes/toolchain) and `vectors.json`
(deterministic EIP-712 fixtures). Canonical TS mirror of the bitmap:
`lib/token/config.ts` (`FEATURE_BITS`, `decodeFeatureBitmap` — bits 0–6
Phase 6B-compatible). Canonical ABIs: `lib/token/abi/*.json` (synced from
these exact artifacts via `npm run contracts:artifacts`).

## 1. Feature bitmap (uint256, `TokenCreated.features`)

| Bit | Name | Meaning |
|---|---|---|
| 0 | burn | `burn`/`burnFrom` enabled |
| 1 | mint | owner `mint` enabled (see maxSupply rules below) |
| 2 | pause | owner `pause`/`unpause` enabled |
| 3 | maxTx | `maxTxAmount > 0` enforced on non-exempt plain transfers |
| 4 | maxWallet | `maxWalletAmount > 0` enforced on credits to non-owners/non-pairs |
| 5 | blacklist | owner list management enabled |
| 6 | whitelist | owner list management enabled |
| 7 | trading | buy/sell tax capability (`buyTaxBps>0 \|\| sellTaxBps>0`); includes marketing wallet + fee exemption |
| 8 | antiBot | deterministic bounded launch protection enabled |
| 9 | autoLiquidity | PancakeSwap V2 auto-liquidity (burn-only LP) enabled |

Maximum Supply is configuration of `mint` (bit 1), not a separate bit.
Marketing wallet + fee exemption are part of bit 7 (no separate bits).

## 2. TokenConfig V1 shape (Solidity `BNBTokenMakerToken.TokenConfig`)

Field order is ABI-significant (EIP-712 `configHash` binds this exact order).

| # | Field | Solidity | Frontend | Validation | Mutability | In configHash | Persisted (`feature_config` + scalars) | Token Manager |
|---|---|---|---|---|---|---|---|---|
| 1 | name | string | text | 1–64 bytes, non-empty | immutable | yes | yes | read |
| 2 | symbol | string | text (auto-uppercase) | 1–11 chars `[0-9A-Z]` | immutable | yes | yes | read |
| 3 | decimals | uint8 | int string | 0–18 | immutable | yes | yes | read |
| 4 | initialSupply | uint256 | human + decimals math | >0; ≤ maxSupply if capped | immutable (minted once) | yes | yes | read |
| 5 | owner | address | connected wallet | non-zero; MUST equal `msg.sender` at factory | mutable via transfer/renounce | yes | yes | read + transfer/renounce |
| 6 | burnable | bool | paid flag | — | immutable | yes | bit 0 | burn |
| 7 | mintable | bool | paid flag | false ⇒ `maxSupply` must be 0 | immutable | yes | bit 1 | mint |
| 8 | pausable | bool | paid flag | — | immutable | yes | bit 2 | pause/unpause |
| 9 | maxTxAmount | uint256 | % of supply (0 = off) | 0 or >0 | immutable | yes | bit 3 + value | read |
| 10 | maxWalletAmount | uint256 | % of supply (0 = off) | 0 or ≥ maxTx if both set | immutable | yes | bit 4 + value | read |
| 11 | blacklistEnabled | bool | paid flag | — | immutable | yes | bit 5 | blacklist add/remove |
| 12 | whitelistEnabled | bool | paid flag | — | immutable | yes | bit 6 | whitelist add/remove + enforcement |
| 13 | buyTaxBps | uint256 | bps selector | 0–1000 (≤10%) | immutable | yes | bit 7 + value | read |
| 14 | sellTaxBps | uint256 | bps selector | 0–1000 (≤10%) | immutable | yes | bit 7 + value | read |
| 15 | marketingWallet | address | address input | required iff tax on; rotatable by owner | owner-mutable | yes | yes | change + read |
| 16 | marketingShareBps | uint256 | fixed by preset | marketing+liquidity = 10000 iff tax on | immutable | yes | yes | read |
| 17 | liquidityShareBps | uint256 | fixed by preset | >0 ⇔ autoLiquidity on | immutable | yes | yes | read |
| 18 | autoLiquidityEnabled | bool | paid flag | requires tax on + threshold in bounds | immutable | yes | bit 9 | swapBack toggle only |
| 19 | swapThreshold | uint256 | derived | initialSupply/1e6 … initialSupply/100 iff autoLiq | immutable | yes | yes | read |
| 20 | antiBotEnabled | bool | paid flag | one-way `enableTrading` | immutable | yes | bit 8 | enableTrading |
| 21 | snipeBlocks | uint256 | blocks selector | 0–50 | immutable | yes | yes | read |
| 22 | maxSupply | uint256 | human + decimals (0 = unlimited) | 0 = explicit unlimited (immutable); else ≥ initialSupply and requires mintable | immutable | yes | yes | read + totalMinted |

ALL deployment-affecting configuration is bound by the signed quote
`configHash = keccak256(abi.encode(TokenParams))`. Owner-mutable runtime
state (`_marketingWallet`, lists, exemptions, pairs, swapBack flag, trading
launch, ownership) is NOT in the hash (post-deployment owner actions).

`swapBackEnabled` starts `true` (no config field — always recoverable by
toggle). AMM pairs start empty (owner registers post-deployment; pairs are
auto-whitelisted on flagging, never fee-exempt, never blacklistable).
Fee exemptions start as owner + token contract only.

## 3. EIP-712 deployment quote (frozen)

- Domain: name `BNBTokenMaker`, version `1`, `chainId` = deployment chain
  (56 mainnet / 97 testnet), `verifyingContract` = the factory address.
- Type: `DeployQuote(bytes32 configHash,uint256 feeWei,uint256 chainId,address factory,bytes32 nonce,uint256 expiry,bytes32 pricingVersion)` — field order fixed as shown.
- Binds: exact config (`configHash`), exact fee (`msg.value == feeWei`,
  underpay AND overpay revert), payer (`params.owner == msg.sender`),
  chain, factory, replay (`_usedNonces`), expiry, audit ref
  (`pricingVersion`, bytes32).
- `feeWei` additionally capped by immutable `MAX_FEE_WEI`.
- Signer rotation (`setSigner`, factory-owner-only) invalidates all
  old-signer quotes immediately; previously-used nonces stay spent.
- Deterministic fixtures: `vectors.json` (base-only + full-monty
  configs, configHashes, digests, signatures; self-verified by recovery;
  TEST-ONLY sample addresses/signer).

## 4. Events (frozen — no additions; factory margin is thin)

Factory: `TokenCreated(token, creator, owner [indexed ×3], name, symbol,
decimals, initialSupply, features)` — receipt verification + persistence;
`DeploymentPaid(token, payer, feeWei, pricingVersion, nonce[indexed])` —
payment audit; `SignerUpdated(signer[indexed])` — rotation trail;
OZ `OwnershipTransferred` — factory ownership lifecycle.

Token: `Transfer`/`Approval`/OZ `OwnershipTransferred` (standard);
`Paused`/`Unpaused`; `BlacklistedSet`/`WhitelistedSet`/
`WhitelistEnforcedSet`; `FeeExemptSet`; `MarketingWalletSet`;
`AMMPairSet`; `TradingEnabled(launchBlock, snipeBlocks)`;
`SwapBackToggled`; `SwapBackExecuted(tokensSwapped, bnbForMarketing,
lpBurned)` + `MarketingPaid`/`LiquidityAdded` (emitted by SwapLib in token
context — attributed to the token address); `SwapBackFailed` (recovery
observability). No other events exist; none may be added without
re-measuring the factory gate.
