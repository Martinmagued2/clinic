// Check-in: turn a SCHEDULED appointment into a queue entry (spec #16, #17)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { audit } from '@/lib/audit'
import { nextQueueNumber } from '@/lib/codes'

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('queue.manage')
    const { id } = await params

    const appointment = await db.appointment.findUnique({
      where: { id },
      include: { queueEntry: true },
    })
    if (!appointment || appointment.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Appointment not found.', 404)
    }
    if (appointment.queueEntry) {
      return apiError('ALREADY_CHECKED_IN', 'Patient is already checked in.', 409)
    }

    const [queueNumber] = await Promise.all([
      nextQueueNumber(user.clinicId!),
      db.appointment.update({
        where: { id },
        data: { status: 'CHECKED_IN' },
      }),
      db.appointmentStatusHistory.create({
        data: { appointmentId: id, status: 'CHECKED_IN', changedById: user.id },
      }),
    ])

    const queueEntry = await db.queueEntry.create({
      data: {
        clinicId: user.clinicId!,
        branchId: appointment.branchId,
        appointmentId: id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        queueNumber,
        status: 'WAITING',
      },
    })

    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'PATIENT_CHECKED_IN',
      entityType: 'QueueEntry',
      entityId: queueEntry.id,
      newValues: { queueNumber },
    })

    return apiSuccess({ queueEntry }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
