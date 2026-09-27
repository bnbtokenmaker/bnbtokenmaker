# Analytics Taxonomy — Create → Deploy → Manage (7D-E4)

Single funnel, three builders, one privacy contract. All events fire from
explicit user-action handlers (or once-per-mount guards) — never from
render effects, never duplicated on rerender.

## Funnel

```
create_started
→ feature_selected {feature, enabled}
→ deployment_reviewed {features}
→ authorization_requested {features}
→ authorization_received {chain_id} | (authorization_expired, implicit re-request)
→ deployment_submitted {chain_id}
→ deployment_confirmed {chain_id} | deployment_failed {code}
→ manager_opened {chain_id}
→ token_inspected {chain_id, kind}
→ manager_action_started {action, kind}
→ manager_action_submitted {action, chain_id}
→ manager_action_confirmed {action, chain_id} | manager_action_failed {action, code}
```

## Builders (single import surface each)

- Create/deploy: `lib/deploy/analytics.ts`
  (`buildAnalyticsParams`, `trackCreateEvent`).
- Manager: `lib/manage/analytics.ts`
  (`buildManagerAnalyticsParams`, `trackManagerEvent`).

No other module emits product events. `window.gtag` is the only sender
(plumbed at call sites, guarded for SSR/tests).

## Privacy contract (enforced by unit tests)

MAY send: event names above; `feature`, `features` (ids only), `enabled`
("1"/"0"), `chain_id`, `kind` ("own-v1"/"external"/…), `action`,
`code` (sanitized failure code, never raw provider text).

MUST NEVER send: private keys, seed phrases, signatures, wallet addresses,
contract addresses beyond the inspected token context (none are sent —
even `token_inspected` carries only `kind`), raw provider/RPC errors,
signer keys, connection strings, API bodies, quote payloads, nonces.

Failure payloads use mapped sanitized codes
(`managerErrorMessage`, deploy `deployErrorMessage`) — the mapping tests
assert no secret text leaks into user-visible copy.
