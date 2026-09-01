// Patient timeline — unified event stream (spec #11)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('patients.view')
    const { id } = await params

    const patient = await db.patient.findUnique({ where: { id } })
    if (!patient || patient.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Patient not found.', 404)
    }

    const [appointments, visits, prescriptions, invoices, payments] = await Promise.all([
      db.appointment.findMany({
        where: { patientId: id },
        include: { doctor: true, service: true },
        orderBy: { date: 'desc' },
        take: 50,
      }),
      db.visit.findMany({
        where: { patientId: id },
        include: { doctor: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.prescription.findMany({
        where: { patientId: id },
        include: { doctor: true, items: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.invoice.findMany({
        where: { patientId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.payment.findMany({
        where: { invoice: { patientId: id } },
        include: { invoice: true },
        orderBy: { paymentDate: 'desc' },
        take: 50,
      }),
    ])

    const events = [
      ...appointments.map((a) => ({
        type: 'APPOINTMENT',
        date: a.date,
        title: `${a.status} — ${a.doctor?.name ?? 'Doctor'}`,
        description: a.notes || `${a.service?.name ?? 'Appointment'} at ${a.startTime}`,
        data: a,
      })),
      ...visits.map((v) => ({
        type: 'VISIT',
        date: v.createdAt,
        title: `Visit — ${v.doctor?.name ?? 'Doctor'}`,
        description: v.chiefComplaint || v.diagnosis || 'Consultation',
        data: v,
      })),
      ...prescriptions.map((p) => ({
        type: 'PRESCRIPTION',
        date: p.createdAt,
        title: `Prescription ${p.prescriptionCode} — ${p.doctor?.name ?? 'Doctor'}`,
        description: `${p.items.length} medication(s)`,
        data: p,
      })),
      ...invoices.map((i) => ({
        type: 'INVOICE',
        date: i.createdAt,
        title: `Invoice ${i.invoiceCode}`,
        description: `${i.status} — Total: ${i.total}`,
        data: i,
      })),
      ...payments.map((p) => ({
        type: 'PAYMENT',
        date: p.paymentDate,
        title: `Payment received`,
        description: `${p.amount} via ${p.paymentMethod}`,
        data: p,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return apiSuccess({ events })
  } catch (err) {
    return handleApiError(err)
  }
}
