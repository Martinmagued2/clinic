// =====================================================================
// Patient detail — GET / PATCH
// Strict tenant isolation per spec #92.
// =====================================================================

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { audit } from '@/lib/audit'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('patients.view')
    const { id } = await params

    const patient = await db.patient.findUnique({
      where: { id },
      include: {
        appointments: {
          orderBy: { date: 'desc' },
          take: 20,
          include: { doctor: true, service: true },
        },
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { doctor: true, vitals: true, prescriptions: true },
        },
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { doctor: true, items: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { items: true, payments: true },
        },
      },
    })

    if (!patient || patient.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Patient not found.', 404)
    }

    return apiSuccess({ patient })
  } catch (err) {
    return handleApiError(err)
  }
}

const updatePatientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  secondaryPhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  currentMedications: z.string().optional(),
  previousSurgeries: z.string().optional(),
  medicalHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  status: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('patients.update')
    const { id } = await params
    const body = await req.json()
    const parsed = updatePatientSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues.map((i) => i.message).join('; '),
        400,
      )
    }

    const existing = await db.patient.findUnique({ where: { id } })
    if (!existing || existing.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Patient not found.', 404)
    }

    const { dateOfBirth, email, ...rest } = parsed.data
    const patient = await db.patient.update({
      where: { id },
      data: {
        ...rest,
        email: email === '' ? null : email,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      },
    })

    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'PATIENT_UPDATED',
      entityType: 'Patient',
      entityId: patient.id,
      oldValues: existing,
      newValues: patient,
    })

    return apiSuccess({ patient })
  } catch (err) {
    return handleApiError(err)
  }
}

// Soft-delete a patient (spec #52)
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('patients.delete')
    const { id } = await params
    const existing = await db.patient.findUnique({ where: { id } })
    if (!existing || existing.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Patient not found.', 404)
    }
    const patient = await db.patient.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    })
    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'PATIENT_SOFT_DELETED',
      entityType: 'Patient',
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status: 'ARCHIVED', deletedAt: patient.deletedAt },
    })
    return apiSuccess({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
