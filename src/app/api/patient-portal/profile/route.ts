// Patient portal: profile management (update contact info, change password)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentPatient, hashPassword, verifyPassword, apiSuccess, handleApiError, AuthError, apiError } from '@/lib/auth'
import { z } from 'zod'

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)
    const p = await db.patient.findUnique({ where: { id: patient.patientId }, select: { firstName: true, lastName: true, phone: true, email: true, address: true, dateOfBirth: true, gender: true, bloodType: true, allergies: true, chronicConditions: true } })
    return apiSuccess({ patient: p })
  } catch (err) { return handleApiError(err) }
}

const profileSchema = z.object({ phone: z.string().optional(), email: z.string().email().optional().or(z.literal('')), address: z.string().optional() })

export async function PATCH(req: NextRequest) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)
    const body = await req.json()

    // Handle password change
    if (body.newPassword) {
      if (body.newPassword.length < 8) return apiError('VALIDATION_ERROR', 'Password must be at least 8 characters.', 400)
      const account = await db.patientAccount.findUnique({ where: { id: patient.accountId } })
      if (!account) return apiError('NOT_FOUND', 'Account not found.', 404)
      if (body.currentPassword && !verifyPassword(body.currentPassword, account.passwordHash)) {
        return apiError('INVALID_PASSWORD', 'Current password is incorrect.', 400)
      }
      await db.patientAccount.update({ where: { id: account.id }, data: { passwordHash: hashPassword(body.newPassword) } })
      return apiSuccess({ ok: true, message: 'Password updated.' })
    }

    // Handle profile update
    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)
    const updated = await db.patient.update({ where: { id: patient.patientId }, data: { phone: parsed.data.phone || undefined, email: parsed.data.email || null, address: parsed.data.address || undefined } })
    return apiSuccess({ patient: updated })
  } catch (err) { return handleApiError(err) }
}
