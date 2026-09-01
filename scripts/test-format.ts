// =====================================================================
// Unit tests — currency/date formatting (spec #88, #89, #87, #71)
// Run: bun run scripts/test-format.ts
// =====================================================================

import { formatCurrency, formatDate, calcAge, getTodayRange } from '../src/lib/format'

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

console.log('🧪 Testing formatters...')

// 1. Currency formatting
console.log('  Currency formatting...')
assert(formatCurrency(18500) === 'EGP 18,500.00', `Got: ${formatCurrency(18500)}`)
assert(formatCurrency(0) === 'EGP 0.00', 'Zero should format correctly')
assert(formatCurrency(-100) === 'EGP -100.00', 'Negative should format')
assert(formatCurrency(18500, 'USD') === 'USD 18,500.00', 'USD currency')
assert(formatCurrency(NaN) === 'EGP 0.00', 'NaN should default to 0')
assert(formatCurrency(Infinity) === 'EGP 0.00', 'Infinity should default to 0')

// 2. Date formatting
console.log('  Date formatting...')
const d = new Date('2026-09-01T10:00:00Z')
assert(typeof formatDate(d) === 'string', 'formatDate should return string')
assert(formatDate(d).includes('2026') === true, 'formatDate should include year')
assert(formatDate(null) === '—', 'formatDate null should be em dash')
assert(formatDate(undefined) === '—', 'formatDate undefined should be em dash')

// 3. Age calculation
console.log('  Age calculation...')
const dob = new Date('2000-01-01')
const age = calcAge(dob)
assert(age !== null && age > 20 && age < 30, `Age should be ~26, got ${age}`)
assert(calcAge(null) === null, 'calcAge null should return null')
assert(calcAge(undefined) === null, 'calcAge undefined should return null')

// 4. Today range
console.log('  Today range...')
const range = getTodayRange()
assert(range.start.getHours() === 0, 'Start of day should be midnight')
assert(range.start.getMinutes() === 0, 'Start of day should be 0 minutes')
assert(range.end.getHours() === 23, 'End of day should be 23h')
assert(range.end.getMinutes() === 59, 'End of day should be 59 min')
assert(range.start.getTime() < range.end.getTime(), 'Start should be before end')

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)

export {}
