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
import { rateLimit, getClientIP } from '@/lib/rate-limit'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 login attempts per minute per IP (spec #6, #23)
    const ip = getClientIP(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const rl = await rateLimit(`login:${ip}`, 10, 60_000)
    if (!rl.allowed) {
      return apiError(
        'RATE_LIMITED',
        'Too many login attempts. Please try again in a minute.',
        429,
      )
    }

    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid email or password.', 400)
    }
    const { email, password } = parsed.data

    // Per-account rate limit: 5 failed attempts per 15 minutes per email
    const accountRl = await rateLimit(`login-account:${email.toLowerCase()}`, 5, 15 * 60_000)
    if (!accountRl.allowed) {
      return apiError(
        'ACCOUNT_LOCKED',
        'Too many failed attempts for this account. Please try again in 15 minutes.',
        429,
      )
    }

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

    // Audit log: successful login (spec #23)
    const { audit } = await import('@/lib/audit')
    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ip,
      userAgent,
    })

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
