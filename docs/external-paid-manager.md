# External BEP-20 Token Manager Access — Architecture Note (DESIGN ONLY)

Status: design for a later product phase. Nothing here is implemented; no
payment code exists. Constraints are normative for the future build.

## Product promise

- Tokens created with BNBTokenMaker: management stays **free forever**
  (user pays network gas only). No entitlement check may ever gate them.
- External BEP-20 tokens: compatibility inspection is free; *management
  access* may be paid. Payment unlocks UI/service access ONLY.

## Hard invariants (must hold in any implementation)

1. Detection before payment: run `lib/manage` probing FIRST; never charge
   before compatibility is known. Unsupported tokens cannot be unlocked at
   any price.
2. Payment NEVER grants platform authority over the token. There is no
   protocol mechanism for it (tokens are Ownable by their own owner), and
   the manager must not pretend otherwise.
3. All writes remain user-wallet → token contract; the user pays network
   gas. The platform never holds keys, never proxies owner actions, never
   takes custody.
4. Unsupported/unknown mutators remain hidden even AFTER payment. The paid
   surface is at most the conservatively detected set (owner-gated standard
   calls with clear semantics); custom tax/limit/role knobs are never
   generically exposed.
5. Entitlement scope binds wallet + token + chain (e.g. keccak256 of the
   triple, server-signed or on-chain registry — decided at build time).
   No global passes, no transferable unlocks without explicit design.
6. Free inspection never degrades: compatibility report, basic reads and
   classification stay free regardless of entitlement.

## Recommended model: one-time per-token unlock

- Simplest to reason about and to support: a single payment unlocks one
  (wallet, token, chain) triple forever.
- No recurring billing machinery, no expiry edge cases, no proration.
- Price is a product decision; keep it flat per token (not per feature).

Rejected alternatives:

- Subscription: recurring charges for a stateless UI over user-owned
  contracts create support and churn complexity disproportionate to the
  value; expiry mid-management risks stranded UX.
- Per-action metering: couples payment UX to every signature; hostile to
  the confirm-sign-receipt flow and trivially gameable off-protocol.

## Interface boundaries (for the future build)

- `lib/manage` gains an `entitlement.ts`: `checkEntitlement({wallet,
  token, chainId}) → {ok} | {ok:false, reason}` — pure interface, server
  adapter injected (never client-decided).
- Manager UI gates EXTERNAL write sections on entitlement; own-V1 sections
  bypass it unconditionally (test: free path cannot regress).
- Pricing of the unlock itself reuses the versioned pricing engine
  (new purchasable item, immutable history, audit trail) — no parallel
  money system.
