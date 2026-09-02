// Visit templates API

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { z } from 'zod'

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth()
    const templates = await db.visitTemplate.findMany({ where: { clinicId: user.clinicId!, status: 'ACTIVE' }, orderBy: { name: 'asc' } })
    return apiSuccess({ templates })
  } catch (err) { return handleApiError(err) }
}

const schema = z.object({
  name: z.string().min(1),
  specialty: z.string().optional(),
  chiefComplaintTemplate: z.string().optional(),
  examinationTemplate: z.string().optional(),
  diagnosisTemplate: z.string().optional(),
  treatmentTemplate: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'DOCTOR') return apiError('FORBIDDEN', 'Not authorized.', 403)
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)
    const template = await db.visitTemplate.create({ data: { ...parsed.data, clinicId: user.clinicId! } })
    return apiSuccess({ template }, 201)
  } catch (err) { return handleApiError(err) }
}
