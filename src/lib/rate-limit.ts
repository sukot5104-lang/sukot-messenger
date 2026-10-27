// Simple in-memory sliding-window rate limiter (per process).
// Suitable for single-node deployments; swap with Redis for horizontal scale.

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup to avoid unbounded growth
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter(
      (t) => now - t < 60 * 60 * 1000 // keep at most 1h of history
    );
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

/**
 * Returns true if the request is allowed.
 * @param key    unique key (e.g. `ip:route` or `user:action`)
 * @param limit  max hits inside window
 * @param windowMs window length in ms
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  maybeCleanup();
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    buckets.set(key, bucket);
    return { allowed: false, retryAfterSec };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}
