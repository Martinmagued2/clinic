// Waiting room display — public "Now Serving" data (spec #18)
// Does NOT require auth. Filters out sensitive info.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const clinicId = url.searchParams.get('clinicId')
    if (!clinicId) return apiError('VALIDATION_ERROR', 'clinicId is required.', 400)

    const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
    if (!clinic) return apiError('NOT_FOUND', 'Clinic not found.', 404)

    // Currently being served (in consultation)
    const nowServing = await db.queueEntry.findMany({
      where: { clinicId, status: 'IN_CONSULTATION' },
      orderBy: [{ calledAt: 'asc' }],
      take: 6,
      include: { doctor: true, appointment: { include: { room: true } } },
    })

    // Waiting queue (next up)
    const waiting = await db.queueEntry.findMany({
      where: { clinicId, status: 'WAITING' },
      orderBy: [{ queueNumber: 'asc' }],
      take: 8,
    })

    return apiSuccess({
      clinic: { name: clinic.name, code: clinic.code },
      nowServing: nowServing.map((e) => ({
        queueNumber: e.queueNumber,
        doctorName: e.doctor.name,
        specialty: e.doctor.specialty,
        roomName: e.appointment?.room?.name ?? null,
      })),
      waiting: waiting.map((e) => ({
        queueNumber: e.queueNumber,
      })),
    })
  } catch (err) {
    return handleApiError(err)
  }
}
