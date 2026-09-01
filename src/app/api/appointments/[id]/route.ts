// Appointment detail — GET / PATCH / DELETE
// PATCH supports status changes (cancel, complete, etc.)

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
    const user = await requirePermission('appointments.view')
    const { id } = await params
    const appointment = await db.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        service: true,
        room: true,
        statusHistory: true,
        queueEntry: true,
        visit: true,
      },
    })
    if (!appointment || appointment.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Appointment not found.', 404)
    }
    return apiSuccess({ appointment })
  } catch (err) {
    return handleApiError(err)
  }
}

const patchSchema = z.object({
  status: z.string().optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  doctorId: z.string().optional(),
  serviceId: z.string().optional().nullable(),
  roomId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('appointments.update')
    const { id } = await params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)
    }

    const existing = await db.appointment.findUnique({ where: { id } })
    if (!existing || existing.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Appointment not found.', 404)
    }

    const { date, status, ...rest } = parsed.data
    const data: Record<string, unknown> = { ...rest }
    if (date) data.date = new Date(date)

    const appointment = await db.appointment.update({
      where: { id },
      data,
      include: { patient: true, doctor: true, service: true },
    })

    if (status && status !== existing.status) {
      await db.appointmentStatusHistory.create({
        data: { appointmentId: id, status, changedById: user.id },
      })
      await audit({
        clinicId: user.clinicId,
        userId: user.id,
        action: `APPOINTMENT_${status}`,
        entityType: 'Appointment',
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { status },
      })
    }

    return apiSuccess({ appointment })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('appointments.cancel')
    const { id } = await params
    const existing = await db.appointment.findUnique({ where: { id } })
    if (!existing || existing.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Appointment not found.', 404)
    }
    const appointment = await db.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
    await db.appointmentStatusHistory.create({
      data: { appointmentId: id, status: 'CANCELLED', changedById: user.id },
    })
    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'APPOINTMENT_CANCELLED',
      entityType: 'Appointment',
      entityId: id,
    })
    return apiSuccess({ appointment })
  } catch (err) {
    return handleApiError(err)
  }
}
