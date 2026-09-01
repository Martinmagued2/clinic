// Services API — list / create

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

export async function GET(_req: NextRequest) {
  try {
    const user = await requirePermission('patients.view')
    const services = await db.service.findMany({
      where: { clinicId: user.clinicId!, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    })
    return apiSuccess({ services })
  } catch (err) {
    return handleApiError(err)
  }
}

const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  duration: z.number().int().min(5).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('settings.manage')
    const body = await req.json()
    const parsed = createServiceSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues.map((i) => i.message).join('; '),
        400,
      )
    }
    const service = await db.service.create({
      data: { ...parsed.data, clinicId: user.clinicId! },
    })
    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'SERVICE_CREATED',
      entityType: 'Service',
      entityId: service.id,
      newValues: service,
    })
    return apiSuccess({ service }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
