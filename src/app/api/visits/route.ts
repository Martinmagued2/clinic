// Visits API — list / create (spec #19, #20, #21, #22)

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

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission('medical_records.view')
    const url = new URL(req.url)
    const patientId = url.searchParams.get('patientId')

    const where: Record<string, unknown> = { clinicId: user.clinicId! }
    if (patientId) where.patientId = patientId

    // Doctors only see their own visits unless clinic admin
    if (user.role === 'DOCTOR' && user.doctorId) {
      where.doctorId = user.doctorId
    }

    const visits = await db.visit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        patient: true,
        doctor: true,
        vitals: true,
        prescriptions: { include: { items: true } },
      },
    })
    return apiSuccess({ visits })
  } catch (err) {
    return handleApiError(err)
  }
}

const createVisitSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  appointmentId: z.string().optional().nullable(),
  chiefComplaint: z.string().optional(),
  symptoms: z.string().optional(),
  examination: z.string().optional(),
  assessment: z.string().optional(),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  followUpDate: z.string().optional().nullable(),
  status: z.string().optional(),
  vitals: z
    .object({
      bloodPressure: z.string().optional().nullable(),
      heartRate: z.number().optional().nullable(),
      temperature: z.number().optional().nullable(),
      weight: z.number().optional().nullable(),
      height: z.number().optional().nullable(),
      oxygenSaturation: z.number().optional().nullable(),
      respiratoryRate: z.number().optional().nullable(),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('medical_records.create')
    const body = await req.json()
    const parsed = createVisitSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)
    }
    const { vitals, followUpDate, appointmentId, ...rest } = parsed.data

    // Tenant check
    const [patient, doctor] = await Promise.all([
      db.patient.findUnique({ where: { id: rest.patientId } }),
      db.doctor.findUnique({ where: { id: rest.doctorId } }),
    ])
    if (!patient || patient.clinicId !== user.clinicId) return apiError('NOT_FOUND', 'Patient not found.', 404)
    if (!doctor || doctor.clinicId !== user.clinicId) return apiError('NOT_FOUND', 'Doctor not found.', 404)

    const visit = await db.visit.create({
      data: {
        ...rest,
        appointmentId: appointmentId || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        clinicId: user.clinicId!,
        createdById: user.id,
        status: parsed.data.status || 'IN_PROGRESS',
        vitals: vitals
          ? { create: { ...vitals, bloodPressure: vitals.bloodPressure ?? null } }
          : undefined,
      },
      include: { patient: true, doctor: true, vitals: true },
    })

    // If appointment linked, mark as IN_CONSULTATION / COMPLETED
    if (appointmentId) {
      await db.appointment.update({
        where: { id: appointmentId },
        data: { status: visit.status === 'COMPLETED' ? 'COMPLETED' : 'IN_CONSULTATION' },
      })
    }

    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'VISIT_CREATED',
      entityType: 'Visit',
      entityId: visit.id,
      newValues: visit,
    })

    return apiSuccess({ visit }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
