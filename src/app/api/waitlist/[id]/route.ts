// Waitlist entry — update status (notify / book / cancel)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const schema = z.object({ status: z.enum(['WAITING', 'NOTIFIED', 'BOOKED', 'CANCELLED']) })

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid status.', 400)
    const existing = await db.waitlistEntry.findUnique({ where: { id } })
    if (!existing || existing.clinicId !== user.clinicId) return apiError('NOT_FOUND', 'Entry not found.', 404)
    const entry = await db.waitlistEntry.update({ where: { id }, data: { status: parsed.data.status } })
    return apiSuccess({ entry })
  } catch (err) { return handleApiError(err) }
}
