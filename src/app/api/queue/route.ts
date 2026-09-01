// Queue API — list waiting + actions: call next, skip, complete (spec #17)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission('queue.view')
    const url = new URL(req.url)
    const doctorId = url.searchParams.get('doctorId')
    const status = url.searchParams.get('status') || 'WAITING'

    const where: Record<string, unknown> = {
      clinicId: user.clinicId!,
      status,
    }
    if (doctorId) where.doctorId = doctorId

    const entries = await db.queueEntry.findMany({
      where,
      orderBy: { queueNumber: 'asc' },
      include: {
        patient: true,
        doctor: true,
        appointment: { include: { service: true } },
      },
    })

    return apiSuccess({ entries })
  } catch (err) {
    return handleApiError(err)
  }
}

// Call next patient: marks current IN_CONSULTATION as COMPLETED,
// then picks the lowest-numbered WAITING entry and marks it CALLED.
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('queue.manage')
    const body = await req.json().catch(() => ({}))
    const { action, doctorId, queueEntryId } = body as {
      action: 'CALL_NEXT' | 'CALL_SPECIFIC' | 'SKIP' | 'COMPLETE'
      doctorId?: string
      queueEntryId?: string
    }

    if (action === 'CALL_NEXT') {
      if (!doctorId) return apiError('VALIDATION_ERROR', 'doctorId is required.', 400)

      // Complete the currently in-consultation entry for this doctor (if any)
      await db.queueEntry.updateMany({
        where: { doctorId, status: 'IN_CONSULTATION', clinicId: user.clinicId! },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })

      const next = await db.queueEntry.findFirst({
        where: { doctorId, status: 'WAITING', clinicId: user.clinicId! },
        orderBy: { queueNumber: 'asc' },
      })
      if (!next) return apiSuccess({ entry: null })

      const updated = await db.queueEntry.update({
        where: { id: next.id },
        data: { status: 'IN_CONSULTATION', calledAt: new Date() },
        include: { patient: true, doctor: true, appointment: { include: { service: true } } },
      })

      // Also update the appointment status
      await db.appointment.update({
        where: { id: next.appointmentId },
        data: { status: 'IN_CONSULTATION' },
      })

      await audit({
        clinicId: user.clinicId,
        userId: user.id,
        action: 'QUEUE_CALLED_NEXT',
        entityType: 'QueueEntry',
        entityId: next.id,
      })
      return apiSuccess({ entry: updated })
    }

    if (action === 'SKIP' && queueEntryId) {
      const entry = await db.queueEntry.findUnique({ where: { id: queueEntryId } })
      if (!entry || entry.clinicId !== user.clinicId) {
        return apiError('NOT_FOUND', 'Queue entry not found.', 404)
      }
      const updated = await db.queueEntry.update({
        where: { id: queueEntryId },
        data: { status: 'SKIPPED' },
      })
      return apiSuccess({ entry: updated })
    }

    if (action === 'COMPLETE' && queueEntryId) {
      const entry = await db.queueEntry.findUnique({ where: { id: queueEntryId } })
      if (!entry || entry.clinicId !== user.clinicId) {
        return apiError('NOT_FOUND', 'Queue entry not found.', 404)
      }
      const updated = await db.queueEntry.update({
        where: { id: queueEntryId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
      return apiSuccess({ entry: updated })
    }

    return apiError('VALIDATION_ERROR', 'Invalid action.', 400)
  } catch (err) {
    return handleApiError(err)
  }
}
