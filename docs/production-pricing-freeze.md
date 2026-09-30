# Production Pricing Freeze — Initial Mainnet Launch

**Status:** APPROVED by operator — NOT YET PUBLISHED
**Date:** 2026-09-29
**Scope:** Initial BSC Mainnet (chain 56) launch pricing

## Approved Production Prices

| Feature | Price (BNB) | Price (wei) |
|---|---|---|
| base | 0.050 | 50000000000000000 |
| burn | 0.005 | 5000000000000000 |
| mint | 0.010 | 10000000000000000 |
| pause | 0.005 | 5000000000000000 |
| maxTx | 0.010 | 10000000000000000 |
| maxWallet | 0.010 | 10000000000000000 |
| blacklist | 0.010 | 10000000000000000 |
| whitelist | 0.010 | 10000000000000000 |
| trading | 0.020 | 20000000000000000 |
| antiBot | 0.010 | 10000000000000000 |
| autoLiquidity | 0.015 | 15000000000000000 |

## Maximum Subtotal

**All features combined:** 0.155 BNB (155000000000000000 wei)

## Factory MAX_FEE_WEI

**Value:** 500000000000000000 wei (0.5 BNB)

**Headroom:** 0.5 / 0.15 = 3.33x maximum subtotal

## Important Notes

- These are **application pricing values**, NOT immutable contract pricing
- Pricing can later change through new pricing versions
- Historical pricing versions remain immutable
- TokenFactory does NOT need redeployment for normal pricing changes
- No valid quote may exceed MAX_FEE_WEI (0.5 BNB)
- The server signs quotes with the exact priced fee; the factory enforces `msg.value == feeWei` and `feeWei <= MAX_FEE_WEI`

## Publication Status

**NOT PUBLISHED** — This document records the approved values for M4-B publication.
