// =====================================================================
// Unit tests — rate limiting (spec #6, #23, #71)
// Run: bun run scripts/test-rate-limit.ts
// =====================================================================

import { rateLimit } from '../src/lib/rate-limit'

let passed = 0
let failed = 0

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++
  } else {
    failed++
    console.error(`  ✗ ${msg}`)
  }
}

console.log('🧪 Testing rate limiter...')

// 1. First request is allowed
console.log('  First request allowed...')
const key1 = `test-${Date.now()}-1`
const r1 = rateLimit(key1, 5, 60_000)
assert(r1.allowed === true, 'First request should be allowed')
assert(r1.remaining === 4, 'Should have 4 remaining after first request')

// 2. Subsequent requests within limit are allowed
console.log('  Subsequent requests within limit...')
for (let i = 0; i < 4; i++) {
  const r = rateLimit(key1, 5, 60_000)
  assert(r.allowed === true, `Request ${i + 2} should be allowed`)
}

// 3. Request beyond limit is blocked
console.log('  Request beyond limit is blocked...')
const r6 = rateLimit(key1, 5, 60_000)
assert(r6.allowed === false, '6th request should be blocked')
assert(r6.remaining === 0, 'Should have 0 remaining when blocked')

// 4. Different keys have separate buckets
console.log('  Separate buckets per key...')
const key2 = `test-${Date.now()}-2`
const r_other = rateLimit(key2, 5, 60_000)
assert(r_other.allowed === true, 'Different key should be allowed')

// 5. Bucket resets after window expires (simulate with tiny window)
console.log('  Bucket resets after window...')
const key3 = `test-${Date.now()}-3`
rateLimit(key3, 1, 10) // 10ms window
const r_first = rateLimit(key3, 1, 10)
assert(r_first.allowed === false, 'Should be blocked after limit reached')
// Wait for window to expire
await new Promise((r) => setTimeout(r, 20))
const r_after = rateLimit(key3, 1, 10)
assert(r_after.allowed === true, 'Should be allowed after window expires')

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)

export {}
