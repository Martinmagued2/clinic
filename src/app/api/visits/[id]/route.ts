// Visit detail — GET / PATCH

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

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('medical_records.view')
    const { id } = await params
    const visit = await db.visit.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        vitals: true,
        prescriptions: { include: { items: true, doctor: true } },
        appointment: true,
      },
    })
    if (!visit || visit.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Visit not found.', 404)
    }
    return apiSuccess({ visit })
  } catch (err) {
    return handleApiError(err)
  }
}

const patchSchema = z.object({
  chiefComplaint: z.string().optional(),
  symptoms: z.string().optional(),
  examination: z.string().optional(),
  assessment: z.string().optional(),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  followUpDate: z.string().optional().nullable(),
  status: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('medical_records.update')
    const { id } = await params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)
    }
    const existing = await db.visit.findUnique({ where: { id } })
    if (!existing || existing.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Visit not found.', 404)
    }
    const { followUpDate, ...rest } = parsed.data
    const visit = await db.visit.update({
      where: { id },
      data: { ...rest, followUpDate: followUpDate ? new Date(followUpDate) : undefined },
    })
    if (parsed.data.status === 'COMPLETED' && existing.appointmentId) {
      await db.appointment.update({
        where: { id: existing.appointmentId },
        data: { status: 'COMPLETED' },
      })
    }
    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'VISIT_UPDATED',
      entityType: 'Visit',
      entityId: visit.id,
      oldValues: existing,
      newValues: visit,
    })
    return apiSuccess({ visit })
  } catch (err) {
    return handleApiError(err)
  }
}
