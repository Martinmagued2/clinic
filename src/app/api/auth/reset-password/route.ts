// Reset password — verify token & set new password (spec #6, #22)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Token and password (min 8 chars) are required.', 400)
    }

    const reset = await db.passwordReset.findUnique({
      where: { token: parsed.data.token },
    })
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return apiError('INVALID_OR_EXPIRED', 'Reset token is invalid or expired.', 400)
    }

    const user = await db.user.findUnique({ where: { id: reset.userId } })
    if (!user) return apiError('NOT_FOUND', 'User not found.', 404)

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(parsed.data.password) },
      }),
      db.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
    ])

    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: user.id,
    })

    return apiSuccess({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
