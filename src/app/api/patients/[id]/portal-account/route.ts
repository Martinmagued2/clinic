// Staff API: create / get / delete a patient portal account (spec #39)
// Only CLINIC_ADMIN or SUPER_ADMIN can create accounts.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  hashPassword,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { audit } from '@/lib/audit'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

// GET — check if patient has a portal account
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const patient = await db.patient.findUnique({ where: { id } })
    if (!patient || patient.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Patient not found.', 404)
    }

    const account = await db.patientAccount.findFirst({
      where: { patientId: id },
      select: { id: true, email: true, status: true, lastLoginAt: true, createdAt: true },
    })
    return apiSuccess({ account })
  } catch (err) {
    return handleApiError(err)
  }
}

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// POST — create a portal account for this patient
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return apiError('FORBIDDEN', 'Only clinic admins can create portal accounts.', 403)
    }

    const { id } = await params
    const patient = await db.patient.findUnique({ where: { id } })
    if (!patient || patient.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Patient not found.', 404)
    }

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)
    }

    // Check if email is already taken
    const existing = await db.patientAccount.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    })
    if (existing) {
      return apiError('DUPLICATE_EMAIL', 'This email is already registered.', 409)
    }

    // Check if patient already has an account
    const existingAccount = await db.patientAccount.findFirst({
      where: { patientId: id },
    })
    if (existingAccount) {
      return apiError('ACCOUNT_EXISTS', 'This patient already has a portal account.', 409)
    }

    const account = await db.patientAccount.create({
      data: {
        clinicId: user.clinicId!,
        patientId: id,
        email: parsed.data.email.toLowerCase(),
        passwordHash: hashPassword(parsed.data.password),
        status: 'ACTIVE',
      },
      select: { id: true, email: true, status: true, createdAt: true },
    })

    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'PATIENT_PORTAL_ACCOUNT_CREATED',
      entityType: 'PatientAccount',
      entityId: account.id,
      newValues: { email: account.email, patientId: id },
    })

    return apiSuccess({ account }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}

// DELETE — deactivate the patient's portal account
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return apiError('FORBIDDEN', 'Only clinic admins can delete portal accounts.', 403)
    }

    const { id } = await params
    const account = await db.patientAccount.findFirst({ where: { patientId: id } })
    if (!account) {
      return apiError('NOT_FOUND', 'No portal account found for this patient.', 404)
    }

    await db.patientAccount.update({
      where: { id: account.id },
      data: { status: 'INACTIVE' },
    })

    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'PATIENT_PORTAL_ACCOUNT_DEACTIVATED',
      entityType: 'PatientAccount',
      entityId: account.id,
    })

    return apiSuccess({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
