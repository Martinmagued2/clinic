// Patient portal: request prescription refill

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentPatient, apiSuccess, handleApiError, AuthError, apiError } from '@/lib/auth'
import { z } from 'zod'

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)
    const refills = await db.refillRequest.findMany({ where: { patientId: patient.patientId }, orderBy: { createdAt: 'desc' }, include: { prescription: true } })
    return apiSuccess({ refills })
  } catch (err) { return handleApiError(err) }
}

const schema = z.object({ prescriptionId: z.string().min(1), notes: z.string().optional() })

export async function POST(req: NextRequest) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)

    const prescription = await db.prescription.findUnique({ where: { id: parsed.data.prescriptionId } })
    if (!prescription || prescription.patientId !== patient.patientId) return apiError('NOT_FOUND', 'Prescription not found.', 404)

    const refill = await db.refillRequest.create({
      data: { clinicId: patient.clinicId, prescriptionId: parsed.data.prescriptionId, patientId: patient.patientId, notes: parsed.data.notes || null },
    })
    return apiSuccess({ refill }, 201)
  } catch (err) { return handleApiError(err) }
}
