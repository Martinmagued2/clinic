// Prescription refill requests — list (staff) / create (patient)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, getCurrentPatient, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const where: Record<string, unknown> = { clinicId: user.clinicId! }
    if (status) where.status = status

    const refills = await db.refillRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { patient: true, prescription: { include: { doctor: true, items: true } } },
    })
    return apiSuccess({ refills })
  } catch (err) { return handleApiError(err) }
}

const schema = z.object({ prescriptionId: z.string().min(1), notes: z.string().optional() })

export async function POST(req: NextRequest) {
  try {
    // Patient-facing endpoint — check for patient session first, then staff
    const patient = await getCurrentPatient()
    let clinicId: string
    let patientId: string

    if (patient) {
      clinicId = patient.clinicId
      patientId = patient.patientId
    } else {
      const user = await requireAuth()
      clinicId = user.clinicId!
      // Staff must specify patientId — for now, use the prescription's patient
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)

    const prescription = await db.prescription.findUnique({ where: { id: parsed.data.prescriptionId } })
    if (!prescription || prescription.clinicId !== clinicId) return apiError('NOT_FOUND', 'Prescription not found.', 404)

    if (!patient) patientId = prescription.patientId

    const refill = await db.refillRequest.create({
      data: {
        clinicId,
        prescriptionId: parsed.data.prescriptionId,
        patientId,
        notes: parsed.data.notes || null,
      },
    })
    return apiSuccess({ refill }, 201)
  } catch (err) { return handleApiError(err) }
}
