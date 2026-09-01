// Doctor schedules API — list / replace (spec #14, #28)
// PUT replaces all schedules for a doctor with the new set.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { audit } from '@/lib/audit'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const doctor = await db.doctor.findUnique({ where: { id } })
    if (!doctor || doctor.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Doctor not found.', 404)
    }
    const schedules = await db.doctorSchedule.findMany({
      where: { doctorId: id },
      orderBy: { dayOfWeek: 'asc' },
    })
    return apiSuccess({ schedules })
  } catch (err) {
    return handleApiError(err)
  }
}

const scheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
})

const putSchema = z.object({
  schedules: z.array(scheduleItemSchema),
})

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'DOCTOR') {
      return apiError('FORBIDDEN', 'Not authorized to edit schedules.', 403)
    }
    const { id } = await params
    const doctor = await db.doctor.findUnique({ where: { id } })
    if (!doctor || doctor.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Doctor not found.', 404)
    }

    const body = await req.json()
    const parsed = putSchema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)

    // Replace all schedules in a transaction
    await db.$transaction([
      db.doctorSchedule.deleteMany({ where: { doctorId: id } }),
      ...parsed.data.schedules.map((s) =>
        db.doctorSchedule.create({ data: { doctorId: id, ...s } }),
      ),
    ])

    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'DOCTOR_SCHEDULE_UPDATED',
      entityType: 'Doctor',
      entityId: id,
      newValues: { schedules: parsed.data.schedules.length },
    })

    const schedules = await db.doctorSchedule.findMany({
      where: { doctorId: id },
      orderBy: { dayOfWeek: 'asc' },
    })
    return apiSuccess({ schedules })
  } catch (err) {
    return handleApiError(err)
  }
}
