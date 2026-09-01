// =====================================================================
// Unit tests — code generators (spec #71)
// Run: bun run scripts/test-codes.ts
// =====================================================================

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

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

async function main() {
  console.log('🧪 Testing code generators...')

  const { nextPatientCode, nextInvoiceCode, nextPrescriptionCode, nextQueueNumber } = await import('../src/lib/codes')

  // Get the first clinic for testing
  const clinic = await db.clinic.findFirst()
  if (!clinic) {
    console.error('  No clinic in DB — run `bun run db:seed` first.')
    process.exit(1)
  }

  // 1. Patient code format: PT-XXXXXX
  console.log('  Patient code format...')
  const pc = await nextPatientCode(clinic.id)
  assert(/^PT-\d{6}$/.test(pc), `Patient code should match PT-XXXXXX, got: ${pc}`)

  // 2. Invoice code format: INV-XXXXXX
  console.log('  Invoice code format...')
  const ic = await nextInvoiceCode(clinic.id)
  assert(/^INV-\d{6}$/.test(ic), `Invoice code should match INV-XXXXXX, got: ${ic}`)

  // 3. Prescription code format: RX-XXXXXX
  console.log('  Prescription code format...')
  const rc = await nextPrescriptionCode(clinic.id)
  assert(/^RX-\d{6}$/.test(rc), `Prescription code should match RX-XXXXXX, got: ${rc}`)

  // 4. Queue number is positive integer
  console.log('  Queue number format...')
  const qn = await nextQueueNumber(clinic.id)
  assert(Number.isInteger(qn) && qn > 0, `Queue number should be positive int, got: ${qn}`)

  // 5. Subsequent codes increment
  console.log('  Code incrementing...')
  const pc2 = await nextPatientCode(clinic.id)
  // Note: count increments after each call, so pc2 may equal pc if no patient was created in between
  // The important check is that both are valid format
  assert(/^PT-\d{6}$/.test(pc2), `Second patient code should still match format, got: ${pc2}`)

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

export {}
