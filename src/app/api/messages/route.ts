// Messages API — staff view + send (secure messaging)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const url = new URL(req.url)
    const patientId = url.searchParams.get('patientId')

    const where: Record<string, unknown> = { clinicId: user.clinicId! }
    if (patientId) where.patientId = patientId

    const messages = await db.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { patient: { select: { firstName: true, lastName: true, patientCode: true } } },
    })
    return apiSuccess({ messages })
  } catch (err) { return handleApiError(err) }
}

const schema = z.object({
  patientId: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)

    const patient = await db.patient.findUnique({ where: { id: parsed.data.patientId } })
    if (!patient || patient.clinicId !== user.clinicId) return apiError('NOT_FOUND', 'Patient not found.', 404)

    const message = await db.message.create({
      data: {
        clinicId: user.clinicId!,
        patientId: parsed.data.patientId,
        fromType: 'STAFF',
        fromUserId: user.id,
        subject: parsed.data.subject || null,
        body: parsed.data.body,
      },
    })
    await audit({ clinicId: user.clinicId, userId: user.id, action: 'MESSAGE_SENT', entityType: 'Message', entityId: message.id })
    return apiSuccess({ message }, 201)
  } catch (err) { return handleApiError(err) }
}
