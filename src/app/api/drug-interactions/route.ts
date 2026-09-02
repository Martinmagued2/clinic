// Drug interaction & allergy check (spec — clinical decision support)
// Checks a proposed medication against patient's allergies and current medications.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { z } from 'zod'

// Known drug interaction pairs (simplified — in production use a drug database API)
const KNOWN_INTERACTIONS: Record<string, string[]> = {
  'warfarin': ['aspirin', 'ibuprofen', 'amoxicillin', 'metronidazole', 'ciprofloxacin'],
  'metformin': ['alcohol', 'contrast dye'],
  'amoxicillin': ['methotrexate', 'warfarin'],
  'ciprofloxacin': ['theophylline', 'warfarin', 'cyclosporine'],
  'omeprazole': ['clopidogrel', 'digoxin'],
  'simvastatin': ['clarithromycin', 'itraconazole', 'cyclosporine'],
}

const schema = z.object({
  patientId: z.string().min(1),
  medicationName: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)

    const patient = await db.patient.findUnique({ where: { id: parsed.data.patientId } })
    if (!patient || patient.clinicId !== user.clinicId) return apiError('NOT_FOUND', 'Patient not found.', 404)

    const warnings: Array<{ type: string; severity: string; message: string }> = []
    const medName = parsed.data.medicationName.toLowerCase()

    // 1. Allergy check
    if (patient.allergies) {
      const allergies = patient.allergies.toLowerCase().split(/[,;]/).map((s) => s.trim())
      for (const allergy of allergies) {
        if (allergy && medName.includes(allergy)) {
          warnings.push({ type: 'ALLERGY', severity: 'CRITICAL', message: `Patient is ALLERGIC to ${allergy}!` })
        }
      }
    }

    // 2. Drug interaction check
    if (patient.currentMedications) {
      const currentMeds = patient.currentMedications.toLowerCase().split(/[,;]/).map((s) => s.trim())
      const interactingWith = KNOWN_INTERACTIONS[medName] || []
      for (const currentMed of currentMeds) {
        if (currentMed && interactingWith.includes(currentMed)) {
          warnings.push({ type: 'INTERACTION', severity: 'HIGH', message: `${parsed.data.medicationName} interacts with ${currentMed} (currently in patient's medication list)` })
        }
        // Reverse check
        const reverseInteractions = KNOWN_INTERACTIONS[currentMed] || []
        if (reverseInteractions.includes(medName)) {
          warnings.push({ type: 'INTERACTION', severity: 'HIGH', message: `${currentMed} interacts with ${parsed.data.medicationName}` })
        }
      }
    }

    return apiSuccess({ warnings, safe: warnings.length === 0 })
  } catch (err) { return handleApiError(err) }
}
