// Insurance plans API

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const url = new URL(req.url)
    const providerId = url.searchParams.get('providerId')
    const where: Record<string, unknown> = { provider: { clinicId: user.clinicId! } }
    if (providerId) where.providerId = providerId
    const plans = await db.insurancePlan.findMany({ where, include: { provider: true } })
    return apiSuccess({ plans })
  } catch (err) { return handleApiError(err) }
}

const schema = z.object({ providerId: z.string().min(1), name: z.string().min(1), coveragePercent: z.number().min(0).max(100).default(0), copayAmount: z.number().min(0).default(0) })

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN') return apiError('FORBIDDEN', 'Admins only.', 403)
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)
    const provider = await db.insuranceProvider.findUnique({ where: { id: parsed.data.providerId } })
    if (!provider || provider.clinicId !== user.clinicId) return apiError('NOT_FOUND', 'Provider not found.', 404)
    const plan = await db.insurancePlan.create({ data: parsed.data, include: { provider: true } })
    return apiSuccess({ plan }, 201)
  } catch (err) { return handleApiError(err) }
}
