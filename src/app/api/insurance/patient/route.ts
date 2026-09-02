// Patient insurance API — list / create

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const url = new URL(req.url)
    const patientId = url.searchParams.get('patientId')
    const where: Record<string, unknown> = { clinicId: user.clinicId! }
    if (patientId) where.patientId = patientId
    const insurances = await db.patientInsurance.findMany({ where, include: { provider: true, plan: true, patient: true }, orderBy: { createdAt: 'desc' } })
    return apiSuccess({ insurances })
  } catch (err) { return handleApiError(err) }
}

const schema = z.object({ patientId: z.string().min(1), providerId: z.string().min(1), planId: z.string().optional(), policyNumber: z.string().min(1), memberName: z.string().min(1), startDate: z.string(), endDate: z.string().optional() })

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)
    const insurance = await db.patientInsurance.create({ data: { ...parsed.data, planId: parsed.data.planId || null, startDate: new Date(parsed.data.startDate), endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null, clinicId: user.clinicId! }, include: { provider: true, plan: true } })
    return apiSuccess({ insurance }, 201)
  } catch (err) { return handleApiError(err) }
}
