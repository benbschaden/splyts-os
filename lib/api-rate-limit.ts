/**
 * Simple in-process rate limiter for API routes (best-effort per instance).
 * For distributed production limits, prefer Redis / Upstash.
 */

type Bucket = { count: number; windowStart: number }

const buckets = new Map<string, Bucket>()

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now - b.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now })
    return true
  }
  if (b.count < maxRequests) {
    b.count += 1
    return true
  }
  return false
}
