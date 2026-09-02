// =====================================================================
// Rate limiting — dual-mode (spec #6, #22, #23)
// =====================================================================
// - Local dev: in-memory sliding window (fast, no DB calls)
// - Production (Vercel): database-backed (persists across serverless
//   instances, uses the RateLimitEntry table)
//
// The system auto-detects the environment via process.env.VERCEL.
// For self-hosted deployments with multiple instances, set USE_DB_RATE_LIMIT=1
// to force database-backed rate limiting.
// =====================================================================

import { db } from './db'

// ---- in-memory implementation (local dev) ----

const buckets = new Map<string, { count: number; resetAt: number }>()

function inMemoryRateLimit(
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

// ---- database-backed implementation (production) ----

async function dbRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowMs)

  try {
    // Delete expired entries for this key
    await db.rateLimitEntry.deleteMany({
      where: { key, windowStart: { lt: windowStart } },
    })

    // Find or create the entry
    const existing = await db.rateLimitEntry.findUnique({ where: { key } })

    if (!existing || existing.windowStart < windowStart) {
      // Create or reset the entry
      await db.rateLimitEntry.upsert({
        where: { key },
        create: { key, count: 1, windowStart: now },
        update: { count: 1, windowStart: now },
      })
      return { allowed: true, remaining: limit - 1, resetAt: now.getTime() + windowMs }
    }

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: existing.windowStart.getTime() + windowMs }
    }

    // Increment
    const updated = await db.rateLimitEntry.update({
      where: { key },
      data: { count: { increment: 1 } },
    })
    return { allowed: true, remaining: limit - updated.count, resetAt: existing.windowStart.getTime() + windowMs }
  } catch (err) {
    // If DB fails, fall back to allowing the request (fail-open)
    // Log the error but don't block legitimate users
    console.error('[rate-limit] DB error, failing open:', err)
    return { allowed: true, remaining: limit - 1, resetAt: now.getTime() + windowMs }
  }
}

// ---- public API ----

const USE_DB = process.env.VERCEL || process.env.USE_DB_RATE_LIMIT

/**
 * Returns true if the request is allowed, false if rate-limited.
 * @param key    identifier (e.g. IP address, or `login:${email}`)
 * @param limit  max requests in the window
 * @param windowMs  window size in milliseconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (USE_DB) {
    return dbRateLimit(key, limit, windowMs)
  }
  return inMemoryRateLimit(key, limit, windowMs)
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

/**
 * Get client user agent from a Next.js request.
 */
export function getClientUserAgent(req: Request): string {
  return req.headers.get('user-agent') || 'unknown'
}

// Periodically clean up expired in-memory buckets (local dev only)
if (!USE_DB && typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt < now) buckets.delete(key)
    }
  }, 60_000).unref?.()
}
