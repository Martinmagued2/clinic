// Patient portal: book appointment (self-service)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentPatient, apiSuccess, handleApiError, AuthError, apiError } from '@/lib/auth'
import { z } from 'zod'

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)
    const [doctors, services] = await Promise.all([
      db.doctor.findMany({ where: { clinicId: patient.clinicId, status: 'ACTIVE' }, select: { id: true, name: true, specialty: true, schedules: true } }),
      db.service.findMany({ where: { clinicId: patient.clinicId, status: 'ACTIVE' }, select: { id: true, name: true, price: true, duration: true } }),
    ])
    return apiSuccess({ doctors, services })
  } catch (err) { return handleApiError(err) }
}

const schema = z.object({ doctorId: z.string().min(1), serviceId: z.string().optional(), date: z.string(), startTime: z.string(), endTime: z.string() })

export async function POST(req: NextRequest) {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)

    // Double-booking check
    const apptDate = new Date(parsed.data.date)
    const startOfDay = new Date(apptDate); startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(apptDate); endOfDay.setHours(23, 59, 59, 999)
    const conflict = await db.appointment.findFirst({ where: { doctorId: parsed.data.doctorId, date: { gte: startOfDay, lte: endOfDay }, startTime: parsed.data.startTime, status: { notIn: ['CANCELLED', 'NO_SHOW'] } } })
    if (conflict) return apiError('APPOINTMENT_CONFLICT', 'This time is no longer available.', 409)

    // Find a system user (clinic admin) to associate as creator
    const adminUser = await db.user.findFirst({ where: { clinicId: patient.clinicId, role: 'CLINIC_ADMIN' } })
    if (!adminUser) return apiError('SETUP_ERROR', 'Clinic not configured.', 500)

    const appointment = await db.appointment.create({
      data: {
        clinicId: patient.clinicId,
        patientId: patient.patientId,
        doctorId: parsed.data.doctorId,
        serviceId: parsed.data.serviceId || undefined,
        date: apptDate,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        status: 'SCHEDULED',
        notes: 'Booked by patient via portal',
        createdById: adminUser.id,
      },
      include: { doctor: true, service: true },
    })
    await db.appointmentStatusHistory.create({ data: { appointmentId: appointment.id, status: 'SCHEDULED' } })
    return apiSuccess({ appointment }, 201)
  } catch (err) { return handleApiError(err) }
}
