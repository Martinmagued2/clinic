// Forgot password — request a reset token (spec #6, #22)
// In dev: returns the token directly. In prod: would email the link.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { z } from 'zod'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid email.', 400)
    }

    // Always return success to prevent email enumeration
    const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
    if (user) {
      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      await db.passwordReset.create({
        data: { userId: user.id, token, expiresAt },
      })
      // In production: send email with `${origin}/reset-password?token=${token}`
      // In dev: return the token so it can be tested
      if (process.env.NODE_ENV !== 'production') {
        return apiSuccess({ token, message: 'Dev mode: use this token to reset password.' })
      }
    }
    return apiSuccess({ message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    return handleApiError(err)
  }
}
