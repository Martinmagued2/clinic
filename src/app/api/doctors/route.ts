// Doctors API — list / create

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

export async function GET(_req: NextRequest) {
  try {
    const user = await requirePermission('doctors.view')
    const doctors = await db.doctor.findMany({
      where: { clinicId: user.clinicId! },
      include: { schedules: true, branch: true },
      orderBy: { name: 'asc' },
    })
    return apiSuccess({ doctors })
  } catch (err) {
    return handleApiError(err)
  }
}

const createDoctorSchema = z.object({
  name: z.string().min(1),
  specialty: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  licenseNumber: z.string().optional(),
  consultationFee: z.number().min(0).optional(),
  branchId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('doctors.manage')
    const body = await req.json()
    const parsed = createDoctorSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues.map((i) => i.message).join('; '),
        400,
      )
    }
    const doctor = await db.doctor.create({
      data: { ...parsed.data, email: parsed.data.email || null, clinicId: user.clinicId! },
      include: { schedules: true },
    })
    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'DOCTOR_CREATED',
      entityType: 'Doctor',
      entityId: doctor.id,
      newValues: doctor,
    })
    return apiSuccess({ doctor }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
