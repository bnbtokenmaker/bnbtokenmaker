# BNB Token Maker — Pricing Domain

Pure, framework-agnostic pricing logic for BNB Token Maker. No database, no
blockchain access, no analytics, no Next.js route handlers — just typed
functions ready for a future server action / API layer (wiring in a later phase).

## Contract

- The domain computes **only the BNB Token Maker platform fee**. Wallet balance,
  network gas, BSC RPC fees and contract deployment costs are **separate** and
  are intentionally not modeled here.
- All monetary values are **`bigint` wei** internally (`1 BNB = 10^18 wei`).
- At the serialization boundary wei is converted to a **decimal string** via
  `toPlatformFeeDto` / `weiToString`. `BigInt.prototype.toJSON` is **never**
  monkey-patched; JSON.stringify does not accept raw bigints.
- Two string types exist and must not be mixed:
  - **BNB decimal strings** (`"0.050"`) are user-facing input — parse with
    `parseBnbToWei` (≥ 18-decimal safety, rejects negative/scientific/malformed).
  - **wei integer strings** (`"50000000000000000"`) are transport DTO values —
    parse back with `parseWeiStringToBigint`. They are NOT BNB amounts.
- No `Number`/`parseFloat` arithmetic anywhere in pricing.
- Final commercial prices are **not set yet**. Anything resembling a price in
  tests or fixtures is a labelled `NON-PRODUCTION TEST FIXTURE` and must not be
  presented as public pricing.

## Server-owned config / client boundary

- `config.ts` holds ONE temporary `DEVELOPMENT_PRICING_CONFIG` that reproduces
  the prototype's visible amounts (`0.050 BNB` base, `+0.005`/`+0.010` add-ons)
  for visual parity. It is explicitly marked `DEVELOPMENT / NON-PRODUCTION` and
  is designed to be replaced by DB-backed server pricing later.
- The `/create` Server Component validates the config, serializes it with
  `toPricingConfigDto`, and passes the plain-string DTO into the `CreateBuilder`
  client component. The client reconstructs domain-safe values with
  `fromPricingConfigDto` and lets `calculatePlatformFee` be the only calculator.
- `CreateBuilder` never defines monetary values and never does its own total
  arithmetic; it only holds state, renders, and calls the pricing domain.

## Display formatting

- `formatWeiBnb` gives the canonical value (`0.05`).
- `formatWeiBnbDisplay` gives exactly three decimals (`0.050`) for UI parity,
  built purely from bigint/string operations — no floating point, truncates
  deeper precision deterministically rather than rounding.

## Canonical features

- Paid add-ons: `burn`, `mint`, `pause`, `maxTx`, `maxWallet`, `blacklist`,
  `whitelist`.
- Included at no extra cost: `transferOwnership`, `renounceOwnership`.
- Coming soon (not purchasable): `buySellTax`, `marketingWallet`, `feeExemption`,
  `antiBot`, `autoLiquidity`.

Selection rules (typed validation errors):

- Duplicate selection of the same id → rejected explicitly.
- `blacklist` and `whitelist` are mutually exclusive.
- Included and coming-soon ids can never be selected as paid add-ons.
- Unknown ids are rejected. (No `reflection` feature exists.)

## Calculation

`calculatePlatformFee(config, selected, campaign?)` is deterministic: line items
follow canonical feature order, the same input always yields the same result,
`totalPlatformFeeWei >= 0`, and included features add zero cost.

Campaigns are capability-only for now (no scheduling, banners, countdowns). An
active campaign requires a genuine `referenceWei >= effectiveWei`, so any
discount is always measured against a real price — never a fabricated one.

## Entry points

- `parseBnbToWei("0.001")` → `bigint`
- `formatWeiBnb(wei)` → `"0.001"` decimal string
- `validateConfig`, `validateSelection` → typed `ValidationResult`
- `calculatePlatformFee` → `PricingResult` (throws `PricingError`)
- `toPlatformFeeDto` → JSON-safe `PlatformFeeResultDto`
- All re-exported from `lib/pricing/index.ts`.

## Tests

```sh
npm run test:pricing
```