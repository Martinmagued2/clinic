// Branches API — list / create / update (spec #42)

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

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth()
    const branches = await db.branch.findMany({
      where: { clinicId: user.clinicId! },
      include: { rooms: true, _count: { select: { appointments: true } } },
      orderBy: { name: 'asc' },
    })
    return apiSuccess({ branches })
  } catch (err) {
    return handleApiError(err)
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  workingHours: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return apiError('FORBIDDEN', 'Only admins can manage branches.', 403)
    }
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)

    const branch = await db.branch.create({
      data: { ...parsed.data, clinicId: user.clinicId! },
      include: { rooms: true },
    })
    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'BRANCH_CREATED',
      entityType: 'Branch',
      entityId: branch.id,
      newValues: branch,
    })
    return apiSuccess({ branch }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
