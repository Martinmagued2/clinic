// Rate limiting utility (in-memory, per-IP) — spec #6, #23
// Simple sliding window counter. Suitable for single-instance deployment.
// For multi-instance, use Redis or a shared store.

const buckets = new Map<string, { count: number; resetAt: number }>()

/**
 * Returns true if the request is allowed, false if rate-limited.
 * @param key    identifier (e.g. IP address, or `login:${email}`)
 * @param limit  max requests in the window
 * @param windowMs  window size in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    const newBucket = { count: 1, resetAt: now + windowMs }
    buckets.set(key, newBucket)
    return { allowed: true, remaining: limit - 1, resetAt: newBucket.resetAt }
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt }
  }

  bucket.count += 1
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt }
}

/**
 * Get client IP from a Next.js request. Falls back to 'unknown' if no
 * headers are present.
 */
export function getClientIP(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

// Periodically clean up expired buckets to avoid memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt < now) buckets.delete(key)
    }
  }, 60_000).unref?.()
}
