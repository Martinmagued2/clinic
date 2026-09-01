// Public booking — patients can book appointments online (spec #38)
// No auth. Creates a patient if not exists (matched by phone).

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { nextPatientCode } from '@/lib/codes'
import { z } from 'zod'

const bookingSchema = z.object({
  clinicId: z.string().min(1),
  doctorId: z.string().min(1),
  serviceId: z.string().optional().nullable(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  // Patient info
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email().optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = bookingSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)
    }
    const { clinicId, doctorId, serviceId, date, startTime, endTime, email, dateOfBirth, ...patientInfo } = parsed.data

    // Verify clinic + doctor
    const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
    if (!clinic || clinic.status !== 'ACTIVE') {
      return apiError('NOT_FOUND', 'Clinic not available.', 404)
    }
    const doctor = await db.doctor.findUnique({ where: { id: doctorId } })
    if (!doctor || doctor.clinicId !== clinicId || doctor.status !== 'ACTIVE') {
      return apiError('NOT_FOUND', 'Doctor not available.', 404)
    }

    // Find or create patient by phone within clinic
    let patient = await db.patient.findFirst({
      where: { clinicId, phone: patientInfo.phone, deletedAt: null },
    })
    if (!patient) {
      const patientCode = await nextPatientCode(clinicId)
      patient = await db.patient.create({
        data: {
          ...patientInfo,
          email: email || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          patientCode,
          clinicId,
        },
      })
    }

    // Double-booking check
    const apptDate = new Date(date)
    const startOfDay = new Date(apptDate); startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(apptDate); endOfDay.setHours(23, 59, 59, 999)
    const conflict = await db.appointment.findFirst({
      where: {
        doctorId,
        date: { gte: startOfDay, lte: endOfDay },
        startTime,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    })
    if (conflict) {
      return apiError('APPOINTMENT_CONFLICT', 'This time is no longer available.', 409)
    }

    // Find a system user to associate (use clinic admin)
    const adminUser = await db.user.findFirst({
      where: { clinicId, role: 'CLINIC_ADMIN' },
    })
    if (!adminUser) return apiError('SETUP_ERROR', 'Clinic not configured for online booking.', 500)

    const appointment = await db.appointment.create({
      data: {
        clinicId,
        branchId: doctor.branchId,
        patientId: patient.id,
        doctorId,
        serviceId: serviceId || undefined,
        date: apptDate,
        startTime,
        endTime,
        status: 'SCHEDULED',
        notes: 'Booked online by patient',
        createdById: adminUser.id,
      },
      include: { patient: true, doctor: true, service: true },
    })

    await db.appointmentStatusHistory.create({
      data: { appointmentId: appointment.id, status: 'SCHEDULED' },
    })

    return apiSuccess({ appointment }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}

// GET: list doctors + services for a clinic (for the booking UI)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const clinicId = url.searchParams.get('clinicId')
    if (!clinicId) return apiError('VALIDATION_ERROR', 'clinicId is required.', 400)

    const [doctors, services] = await Promise.all([
      db.doctor.findMany({
        where: { clinicId, status: 'ACTIVE' },
        select: { id: true, name: true, specialty: true, schedules: true },
      }),
      db.service.findMany({
        where: { clinicId, status: 'ACTIVE' },
        select: { id: true, name: true, price: true, duration: true },
      }),
    ])
    return apiSuccess({ doctors, services })
  } catch (err) {
    return handleApiError(err)
  }
}
