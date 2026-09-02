// Insurance providers API (spec #80)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { z } from 'zod'

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth()
    const providers = await db.insuranceProvider.findMany({ where: { clinicId: user.clinicId! }, include: { plans: true, _count: { select: { patientInsurance: true } } }, orderBy: { name: 'asc' } })
    return apiSuccess({ providers })
  } catch (err) { return handleApiError(err) }
}

const schema = z.object({ name: z.string().min(1), phone: z.string().optional(), email: z.string().email().optional().or(z.literal('')), address: z.string().optional() })

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN') return apiError('FORBIDDEN', 'Admins only.', 403)
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)
    const provider = await db.insuranceProvider.create({ data: { ...parsed.data, email: parsed.data.email || null, clinicId: user.clinicId! }, include: { plans: true } })
    return apiSuccess({ provider }, 201)
  } catch (err) { return handleApiError(err) }
}
