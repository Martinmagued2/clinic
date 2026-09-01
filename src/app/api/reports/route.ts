// Reports API — revenue / appointments / patient trends (spec #32)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  handleApiError,
} from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission('reports.view')
    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    start.setHours(0, 0, 0, 0)
    const end = to ? new Date(to) : new Date()
    end.setHours(23, 59, 59, 999)

    const [payments, appointments, patients, invoices] = await Promise.all([
      db.payment.findMany({
        where: {
          invoice: { clinicId: user.clinicId! },
          paymentDate: { gte: start, lte: end },
        },
        include: { invoice: { include: { patient: true, items: { include: { service: true } } } } },
      }),
      db.appointment.findMany({
        where: { clinicId: user.clinicId!, date: { gte: start, lte: end } },
        include: { doctor: true, service: true },
      }),
      db.patient.findMany({
        where: { clinicId: user.clinicId!, createdAt: { gte: start, lte: end } },
        select: { id: true, createdAt: true },
      }),
      db.invoice.findMany({
        where: { clinicId: user.clinicId!, createdAt: { gte: start, lte: end } },
        include: { items: true, payments: true },
      }),
    ])

    // Revenue by day
    const revenueByDay: Record<string, number> = {}
    for (const p of payments) {
      const day = p.paymentDate.toISOString().slice(0, 10)
      revenueByDay[day] = (revenueByDay[day] ?? 0) + p.amount
    }

    // Revenue by doctor
    const revenueByDoctor: Record<string, number> = {}
    for (const p of payments) {
      const doctorName = p.invoice.items[0]?.service?.name ?? 'Unknown'
      revenueByDoctor[doctorName] = (revenueByDoctor[doctorName] ?? 0) + p.amount
    }

    // Appointment status breakdown
    const appointmentStatus: Record<string, number> = {}
    for (const a of appointments) {
      appointmentStatus[a.status] = (appointmentStatus[a.status] ?? 0) + 1
    }

    // Payment method breakdown
    const paymentMethods: Record<string, number> = {}
    for (const p of payments) {
      paymentMethods[p.paymentMethod] = (paymentMethods[p.paymentMethod] ?? 0) + p.amount
    }

    // Patients per day
    const patientsPerDay: Record<string, number> = {}
    for (const p of patients) {
      const day = p.createdAt.toISOString().slice(0, 10)
      patientsPerDay[day] = (patientsPerDay[day] ?? 0) + 1
    }

    return apiSuccess({
      range: { from: start, to: end },
      totals: {
        revenue: payments.reduce((s, p) => s + p.amount, 0),
        appointments: appointments.length,
        newPatients: patients.length,
        invoices: invoices.length,
        outstanding: invoices.reduce(
          (s, i) => s + Math.max(0, i.total - i.payments.reduce((sp, p) => sp + p.amount, 0)),
          0,
        ),
      },
      charts: {
        revenueByDay: Object.entries(revenueByDay).map(([date, amount]) => ({ date, amount })),
        revenueByDoctor: Object.entries(revenueByDoctor).map(([name, amount]) => ({ name, amount })),
        appointmentStatus: Object.entries(appointmentStatus).map(([status, count]) => ({ status, count })),
        paymentMethods: Object.entries(paymentMethods).map(([method, amount]) => ({ method, amount })),
        patientsPerDay: Object.entries(patientsPerDay).map(([date, count]) => ({ date, count })),
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
