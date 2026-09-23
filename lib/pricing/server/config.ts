import "server-only";

import { devPricingConfig } from "./dev-values";
import type { PricingConfig } from "../types";

/*
 * SERVER-OWNED / NON-PRODUCTION PRICING CONFIG
 *
 * These amounts are TEMPORARY development configuration that reproduces the
 * prototype's visible prices for visual/behavior parity only.
 *
 * They are NOT approved final commercial pricing. The DB-backed pricing
 * versions (lib/pricing/server/store.ts) are authoritative wherever a
 * database is configured; this static config survives only as the explicit
 * non-production fallback and as the pricing:bootstrap seed source
 * (canonical values live in ./dev-values.ts so CLI/test processes that
 * cannot import `server-only` still read the same numbers).
 *
 * Because this module performs `import "server-only"`, a client component can
 * never bundle it: importing it into client JS fails at build time. The
 * authoritative pricing source therefore stays server-only by construction.
 */
export const DEVELOPMENT_PRICING_CONFIG: PricingConfig = devPricingConfig();
