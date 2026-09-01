// Staff API — list / create / update (spec #40)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { hashPassword } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { z } from 'zod'

export async function GET(_req: NextRequest) {
  try {
    const user = await requirePermission('staff.view')
    const users = await db.user.findMany({
      where: { clinicId: user.clinicId! },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        status: true,
        branchId: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })
    return apiSuccess({ users })
  } catch (err) {
    return handleApiError(err)
  }
}

const createStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE']),
  phone: z.string().optional(),
  branchId: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('staff.manage')
    const body = await req.json()
    const parsed = createStaffSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)
    }
    const { password, ...rest } = parsed.data
    const exists = await db.user.findUnique({ where: { email: rest.email.toLowerCase() } })
    if (exists) return apiError('DUPLICATE_EMAIL', 'Email is already in use.', 409)

    const newUser = await db.user.create({
      data: {
        ...rest,
        email: rest.email.toLowerCase(),
        passwordHash: hashPassword(password),
        clinicId: user.clinicId!,
      },
      select: { id: true, email: true, name: true, role: true },
    })
    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'STAFF_CREATED',
      entityType: 'User',
      entityId: newUser.id,
      newValues: { email: newUser.email, role: newUser.role },
    })
    return apiSuccess({ user: newUser }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
