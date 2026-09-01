// Prescriptions API — list / create (spec #23, #24, #25)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { audit } from '@/lib/audit'
import { nextPrescriptionCode } from '@/lib/codes'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission('prescriptions.view')
    const url = new URL(req.url)
    const patientId = url.searchParams.get('patientId')

    const where: Record<string, unknown> = { clinicId: user.clinicId! }
    if (patientId) where.patientId = patientId

    const prescriptions = await db.prescription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        patient: true,
        doctor: true,
        visit: true,
        items: { include: { medication: true } },
      },
    })
    return apiSuccess({ prescriptions })
  } catch (err) {
    return handleApiError(err)
  }
}

const itemSchema = z.object({
  medicationId: z.string().optional().nullable(),
  medicationName: z.string().min(1),
  strength: z.string().optional().nullable(),
  dosage: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
})

const createPrescriptionSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  visitId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('prescriptions.create')
    const body = await req.json()
    const parsed = createPrescriptionSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)
    }
    const { items, visitId, ...rest } = parsed.data

    const [patient, doctor] = await Promise.all([
      db.patient.findUnique({ where: { id: rest.patientId } }),
      db.doctor.findUnique({ where: { id: rest.doctorId } }),
    ])
    if (!patient || patient.clinicId !== user.clinicId) return apiError('NOT_FOUND', 'Patient not found.', 404)
    if (!doctor || doctor.clinicId !== user.clinicId) return apiError('NOT_FOUND', 'Doctor not found.', 404)

    const prescriptionCode = await nextPrescriptionCode(user.clinicId!)
    const prescription = await db.prescription.create({
      data: {
        ...rest,
        visitId: visitId || null,
        prescriptionCode,
        clinicId: user.clinicId!,
        createdById: user.id,
        items: { create: items },
      },
      include: { patient: true, doctor: true, items: { include: { medication: true } } },
    })

    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'PRESCRIPTION_CREATED',
      entityType: 'Prescription',
      entityId: prescription.id,
      newValues: { prescriptionCode, items: items.length },
    })

    return apiSuccess({ prescription }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
