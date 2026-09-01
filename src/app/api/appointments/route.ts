// Appointments API — list / create (spec #12, #13, #51)

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
    const user = await requirePermission('appointments.view')
    const url = new URL(req.url)
    const date = url.searchParams.get('date')
    const doctorId = url.searchParams.get('doctorId')
    const status = url.searchParams.get('status')

    const where: Record<string, unknown> = { clinicId: user.clinicId! }
    if (date) {
      const d = new Date(date)
      const start = new Date(d); start.setHours(0, 0, 0, 0)
      const end = new Date(d); end.setHours(23, 59, 59, 999)
      where.date = { gte: start, lte: end }
    }
    if (doctorId) where.doctorId = doctorId
    if (status) where.status = status

    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where,
        orderBy: { date: 'asc' },
        include: {
          patient: true,
          doctor: true,
          service: true,
          room: true,
        },
      }),
      db.appointment.count({ where }),
    ])

    return apiSuccess({ appointments, total })
  } catch (err) {
    return handleApiError(err)
  }
}

const createAppointmentSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  serviceId: z.string().optional(),
  roomId: z.string().optional(),
  branchId: z.string().optional(),
  date: z.string(), // ISO date
  startTime: z.string(), // "14:30"
  endTime: z.string(), // "15:00"
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('appointments.create')
    const body = await req.json()
    const parsed = createAppointmentSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.issues.map((i) => i.message).join('; '),
        400,
      )
    }
    const { date, ...rest } = parsed.data

    // Tenant check on patient + doctor
    const [patient, doctor] = await Promise.all([
      db.patient.findUnique({ where: { id: rest.patientId } }),
      db.doctor.findUnique({ where: { id: rest.doctorId } }),
    ])
    if (!patient || patient.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Patient not found.', 404)
    }
    if (!doctor || doctor.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Doctor not found.', 404)
    }

    // Double-booking prevention (spec #51)
    const apptDate = new Date(date)
    const startOfDay = new Date(apptDate); startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(apptDate); endOfDay.setHours(23, 59, 59, 999)

    const conflict = await db.appointment.findFirst({
      where: {
        doctorId: rest.doctorId,
        date: { gte: startOfDay, lte: endOfDay },
        startTime: rest.startTime,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    })
    if (conflict) {
      return apiError(
        'APPOINTMENT_CONFLICT',
        'This time is no longer available for this doctor.',
        409,
      )
    }

    const appointment = await db.appointment.create({
      data: {
        ...rest,
        date: apptDate,
        clinicId: user.clinicId!,
        createdById: user.id,
        status: 'SCHEDULED',
      },
      include: { patient: true, doctor: true, service: true },
    })

    await db.appointmentStatusHistory.create({
      data: { appointmentId: appointment.id, status: 'SCHEDULED', changedById: user.id },
    })
    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'APPOINTMENT_CREATED',
      entityType: 'Appointment',
      entityId: appointment.id,
      newValues: appointment,
    })

    return apiSuccess({ appointment }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
