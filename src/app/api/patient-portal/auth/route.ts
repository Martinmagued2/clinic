// Patient portal auth — login / logout / me (spec #39)
// Uses a SEPARATE cookie from staff sessions so the two never collide.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  hashPassword,
  setPatientSessionCookie,
  clearPatientSessionCookie,
  getCurrentPatient,
  apiSuccess,
  apiError,
  handleApiError,
  AuthError,
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

    await setPatientSessionCookie(account.id)

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

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)
    return apiSuccess({
      patient: {
        id: patient.patientId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        patientCode: patient.patientCode,
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE() {
  try {
    await clearPatientSessionCookie()
    return apiSuccess({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}

// Export hashPassword for the staff account-creation route
export { hashPassword }
