// Rooms API — list / create (spec #43)

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

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const url = new URL(req.url)
    const branchId = url.searchParams.get('branchId')

    const where: Record<string, unknown> = { clinicId: user.clinicId! }
    if (branchId) where.branchId = branchId

    const rooms = await db.room.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { branch: true },
    })
    return apiSuccess({ rooms })
  } catch (err) {
    return handleApiError(err)
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  type: z.string().default('CONSULTATION'),
  branchId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return apiError('FORBIDDEN', 'Only admins can manage rooms.', 403)
    }
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)

    const branch = await db.branch.findUnique({ where: { id: parsed.data.branchId } })
    if (!branch || branch.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Branch not found.', 404)
    }

    const room = await db.room.create({
      data: { ...parsed.data, clinicId: user.clinicId! },
      include: { branch: true },
    })
    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'ROOM_CREATED',
      entityType: 'Room',
      entityId: room.id,
    })
    return apiSuccess({ room }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
