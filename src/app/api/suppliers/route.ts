// Suppliers API

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { z } from 'zod'

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth()
    const suppliers = await db.supplier.findMany({ where: { clinicId: user.clinicId! }, orderBy: { name: 'asc' }, include: { _count: { select: { items: true } } } })
    return apiSuccess({ suppliers })
  } catch (err) { return handleApiError(err) }
}

const schema = z.object({ name: z.string().min(1), phone: z.string().optional(), email: z.string().email().optional().or(z.literal('')), address: z.string().optional(), contactPerson: z.string().optional() })

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN') return apiError('FORBIDDEN', 'Admins only.', 403)
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)
    const supplier = await db.supplier.create({ data: { ...parsed.data, email: parsed.data.email || null, clinicId: user.clinicId! } })
    return apiSuccess({ supplier }, 201)
  } catch (err) { return handleApiError(err) }
}
