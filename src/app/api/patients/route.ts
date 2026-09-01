// =====================================================================
// Patients API — list / create
// Enforces tenant isolation: only patients from the user's clinic are
// returned. Receptionists+ can create. See spec #8, #9, #92.
// =====================================================================

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  apiError,
  handleApiError,
  requireTenantScope,
} from '@/lib/auth'
import { nextPatientCode } from '@/lib/codes'
import { audit } from '@/lib/audit'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission('patients.view')
    const url = new URL(req.url)
    const search = url.searchParams.get('search') || ''
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10)

    const where = {
      clinicId: user.clinicId!,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { phone: { contains: search } },
              { patientCode: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    }

    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.patient.count({ where }),
    ])

    return apiSuccess({
      patients,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (err) {
    return handleApiError(err)
  }
}

const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
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
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('patients.create')
    const body = await req.json()
    const parsed = createPatientSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues.map((i) => i.message).join('; '),
        400,
      )
    }
    const data = parsed.data
    const patientCode = await nextPatientCode(user.clinicId!)

    const patient = await db.patient.create({
      data: {
        ...data,
        email: data.email || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        patientCode,
        clinicId: user.clinicId!,
      },
    })

    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'PATIENT_CREATED',
      entityType: 'Patient',
      entityId: patient.id,
      newValues: patient,
    })

    return apiSuccess({ patient }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}

// re-export for [id] route
export { requireTenantScope }
