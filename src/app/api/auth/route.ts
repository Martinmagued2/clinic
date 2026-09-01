// =====================================================================
// Auth: login / logout / me
// =====================================================================

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  getCurrentUser,
  apiSuccess,
  apiError,
  handleApiError,
  AuthError,
} from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid email or password.', 400)
    }
    const { email, password } = parsed.data

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { doctor: true },
    })
    if (!user || user.status !== 'ACTIVE') {
      return apiError('INVALID_CREDENTIALS', 'Invalid email or password.', 401)
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return apiError('INVALID_CREDENTIALS', 'Invalid email or password.', 401)
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
    await setSessionCookie(user.id)

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clinicId: user.clinicId,
        branchId: user.branchId,
        doctorId: user.doctor?.id ?? null,
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)
    return apiSuccess({ user })
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
