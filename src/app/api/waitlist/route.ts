// Waitlist API

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { z } from 'zod'

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth()
    const entries = await db.waitlistEntry.findMany({ where: { clinicId: user.clinicId! }, orderBy: { createdAt: 'desc' }, include: { patient: true } })
    return apiSuccess({ entries })
  } catch (err) { return handleApiError(err) }
}

const schema = z.object({ patientId: z.string().min(1), doctorId: z.string().optional(), serviceId: z.string().optional(), preferredDate: z.string().optional(), preferredTimeRange: z.string().optional(), notes: z.string().optional() })

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)
    const entry = await db.waitlistEntry.create({ data: { ...parsed.data, preferredDate: parsed.data.preferredDate ? new Date(parsed.data.preferredDate) : null, clinicId: user.clinicId! }, include: { patient: true } })
    return apiSuccess({ entry }, 201)
  } catch (err) { return handleApiError(err) }
}
