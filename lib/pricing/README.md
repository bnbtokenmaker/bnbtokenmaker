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

## Server-owned pricing layer (`lib/pricing/server/`)

The pure domain (`features.ts`, `quote.ts`, `money.ts`) never reads a database,
env, or route context and stays **framework-agnostic** (usable from any
page/route/tool). On top of it sits a thin **server-only** layer that owns the
authoritative source of prices and campaign state:

- `server/config.ts` — the **only** place that imports `import "server-only"`.
  Holds the current `CampaignState` (the daily campaign reference →
  effective→discount shape) and `toConfigDto` serialization. Replaces the
  deleted legacy `lib/pricing/config.ts`.
- `server/pricing-source.ts` — `createStaticPricingSource` builds a
  `PricingSource` from a config + optional campaign. `PricingSource`
  (see `server/types.ts`) is the narrow capability interface consumed by every
  server caller; no consumer reaches for `lib/pricing/config` directly.
- `server/current-pricing-source.ts` — the production `getCurrentPricingSource`
  singleton the `/create` page imports, so the source always resolves from
  **server config**, never from anything the client could influence.
- `server/quote.ts` — `quotePlatformFee`, `resolveCampaignForTime`,
  `toQuoteDto`, `parseQuoteRequest`, `isKnownPricingVersion`. The quote path is
  deterministic and wei/serialization-safe (see `quote.ts`).
- `app/api/pricing/quote/route.ts` — `POST` endpoint. It is `export const
  dynamic = "force-dynamic"` (never cached static) and returns
  `QuoteResponseDto`/`PricingErrorDto`. The `/create` page calls it
  client-side only for **live quotes**; its Server Component pre-quotes from the
  server source so the page renders server-authoritative pricing with no
  client round-trip.

### Server-only import rule

`import "server-only"` must appear **only** in server wiring
(`server/config.ts`, `server/current-pricing-source.ts`). The pure domain
modules (`quote.ts`, `features.ts`, `money.ts`, `types.ts`) and the **test
fixtures** (which mirror the dev config) intentionally do not import it, so the
domain stays unit-testable under the plain Node runner and never drags
server-only modules into the client bundle.

### Quote DTO & wei serialization

- `toQuoteDto` produces a JSON-safe `QuoteResponseDto` where every wei amount
  is a **string** (e.g. `basePriceWei: "50000000000000000"`) and display
  amounts are BNB decimal strings (e.g. `totalBnb: "0.065"`). No `bigint`
  literal (`123n`) ever reaches `JSON.stringify` output.
- `parseQuoteRequest` enforces the quote **boundary**: it accepts only
  currently **paid/purchasable** features; included and coming-soon ids are
  rejected as `unknown-feature` because they cannot be quoted as paid add-ons.
- Campaign windows are resolved by `resolveCampaignForTime`: a campaign only
  produces `discountWei` in the DTO when it is genuinely active in-window for
  the `now` supplied; future/expired/inactive campaigns yield `campaign: null`
  (deterministic, no discount).

## Tests

```sh
npm run test:pricing
npm run typecheck
```