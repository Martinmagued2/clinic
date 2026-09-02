// Refill request detail — approve / deny

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const schema = z.object({ status: z.enum(['APPROVED', 'DENIED', 'COMPLETED']), notes: z.string().optional() })

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)

    const existing = await db.refillRequest.findUnique({ where: { id } })
    if (!existing || existing.clinicId !== user.clinicId) return apiError('NOT_FOUND', 'Refill request not found.', 404)

    const refill = await db.refillRequest.update({ where: { id }, data: { status: parsed.data.status, notes: parsed.data.notes || existing.notes, handledById: user.id } })
    await audit({ clinicId: user.clinicId, userId: user.id, action: `REFILL_${parsed.data.status}`, entityType: 'RefillRequest', entityId: id })
    return apiSuccess({ refill })
  } catch (err) { return handleApiError(err) }
}
