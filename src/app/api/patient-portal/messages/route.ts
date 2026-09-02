// Patient portal: messages (patient ↔ clinic)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentPatient, apiSuccess, handleApiError, AuthError } from '@/lib/auth'
import { z } from 'zod'

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)
    const messages = await db.message.findMany({ where: { patientId: patient.patientId }, orderBy: { createdAt: 'desc' }, take: 50 })
    return apiSuccess({ messages })
  } catch (err) { return handleApiError(err) }
}

const schema = z.object({ subject: z.string().optional(), body: z.string().min(1) })

export async function POST(req: NextRequest) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiSuccess({ error: 'Invalid message' })

    const message = await db.message.create({
      data: {
        clinicId: patient.clinicId,
        patientId: patient.patientId,
        fromType: 'PATIENT',
        fromPatientAccountId: patient.accountId,
        subject: parsed.data.subject || null,
        body: parsed.data.body,
      },
    })
    return apiSuccess({ message }, 201)
  } catch (err) { return handleApiError(err) }
}
