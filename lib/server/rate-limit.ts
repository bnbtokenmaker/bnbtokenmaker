/**
 * Phase 7A in-memory sliding-window rate limiter (server-only).
 *
 * No Redis, no second infrastructure service: a bounded Map of per-key
 * request timestamps. Suitable for a single standalone Node runtime;
 * counters reset on restart (fail-open on throttle state, fail-closed on
 * recorded facts — throttling never invents or loses deployments).
 */

type Bucket = {
  hits: number[];
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

export type RateLimitDecision = {
  allowed: boolean;
  /** Seconds until the oldest hit expires (for Retry-After). */
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitDecision {
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    if (buckets.size >= MAX_BUCKETS) {
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    buckets.set(key, bucket);
  }
  const cutoff = now - windowMs;
  bucket.hits = bucket.hits.filter((t) => t > cutoff);
  if (bucket.hits.length >= limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((bucket.hits[0] + windowMs - now) / 1000)
    );
    return { allowed: false, retryAfterSeconds };
  }
  bucket.hits.push(now);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Client IP for throttle keying (first forwarded entry, else "unknown"). */
export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first.slice(0, 64);
  }
  return "unknown";
}

/** Test escape hatch: clear all throttle state. */
export function resetRateLimitsForTests(): void {
  buckets.clear();
}
