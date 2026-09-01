// =====================================================================
// Code generators — for patient codes, invoice codes, prescription
// codes, queue numbers. All scoped to a clinic.
// =====================================================================

import { db } from './db'

function pad(n: number, len = 6): string {
  return n.toString().padStart(len, '0')
}

export async function nextPatientCode(clinicId: string): Promise<string> {
  const count = await db.patient.count({ where: { clinicId } })
  return `PT-${pad(count + 1)}`
}

export async function nextInvoiceCode(clinicId: string): Promise<string> {
  const count = await db.invoice.count({ where: { clinicId } })
  return `INV-${pad(count + 1)}`
}

export async function nextPrescriptionCode(clinicId: string): Promise<string> {
  const count = await db.prescription.count({ where: { clinicId } })
  return `RX-${pad(count + 1)}`
}

export async function nextQueueNumber(clinicId: string): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const count = await db.queueEntry.count({
    where: { clinicId, checkedInAt: { gte: today } },
  })
  return count + 1
}
