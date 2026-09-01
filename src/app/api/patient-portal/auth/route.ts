// Patient portal auth — login using PatientAccount credentials (spec #39)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { rateLimit, getClientIP } from '@/lib/rate-limit'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req)
    const rl = rateLimit(`patient-login:${ip}`, 10, 60_000)
    if (!rl.allowed) return apiError('RATE_LIMITED', 'Too many attempts.', 429)

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid email or password.', 400)

    const account = await db.patientAccount.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      include: { patient: true },
    })
    if (!account || account.status !== 'ACTIVE') {
      return apiError('INVALID_CREDENTIALS', 'Invalid email or password.', 401)
    }
    if (!verifyPassword(parsed.data.password, account.passwordHash)) {
      return apiError('INVALID_CREDENTIALS', 'Invalid email or password.', 401)
    }

    await db.patientAccount.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    })

    // Use a separate cookie namespace for patient portal
    const token = `patient:${account.id}`
    await setSessionCookie(token)

    return apiSuccess({
      patient: {
        id: account.patientId,
        firstName: account.patient.firstName,
        lastName: account.patient.lastName,
        patientCode: account.patient.patientCode,
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE() {
  try {
    await clearSessionCookie()
    return apiSuccess({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
