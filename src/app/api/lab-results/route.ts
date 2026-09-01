// Lab results API — list / create (spec #34)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { audit } from '@/lib/audit'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission('patients.view')
    const url = new URL(req.url)
    const patientId = url.searchParams.get('patientId')

    const where: Record<string, unknown> = { clinicId: user.clinicId! }
    if (patientId) where.patientId = patientId

    const labResults = await db.labResult.findMany({
      where,
      orderBy: { reportedAt: 'desc' },
      take: 100,
      include: { patient: true },
    })
    return apiSuccess({ labResults })
  } catch (err) {
    return handleApiError(err)
  }
}

const createSchema = z.object({
  patientId: z.string().min(1),
  visitId: z.string().optional().nullable(),
  testName: z.string().min(1),
  resultValue: z.string().min(1),
  unit: z.string().optional().nullable(),
  referenceRange: z.string().optional().nullable(),
  status: z.enum(['NORMAL', 'ABNORMAL', 'CRITICAL']).default('NORMAL'),
  notes: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('medical_records.create')
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)
    }

    const patient = await db.patient.findUnique({ where: { id: parsed.data.patientId } })
    if (!patient || patient.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Patient not found.', 404)
    }

    const labResult = await db.labResult.create({
      data: { ...parsed.data, clinicId: user.clinicId! },
    })
    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'LAB_RESULT_CREATED',
      entityType: 'LabResult',
      entityId: labResult.id,
      newValues: { testName: labResult.testName, status: labResult.status },
    })
    return apiSuccess({ labResult }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
