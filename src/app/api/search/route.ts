// Global search across patients, appointments, invoices (spec #46)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, handleApiError } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').trim()
    if (q.length < 2) return apiSuccess({ results: { patients: [], appointments: [], invoices: [], prescriptions: [] } })

    const [patients, appointments, invoices, prescriptions] = await Promise.all([
      db.patient.findMany({
        where: {
          clinicId: user.clinicId!,
          deletedAt: null,
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { phone: { contains: q } },
            { patientCode: { contains: q } },
            { email: { contains: q } },
          ],
        },
        take: 10,
        select: { id: true, patientCode: true, firstName: true, lastName: true, phone: true },
      }),
      db.appointment.findMany({
        where: {
          clinicId: user.clinicId!,
          patient: {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { phone: { contains: q } },
              { patientCode: { contains: q } },
            ],
          },
        },
        take: 10,
        include: { patient: true, doctor: true },
        orderBy: { date: 'desc' },
      }),
      db.invoice.findMany({
        where: {
          clinicId: user.clinicId!,
          OR: [
            { invoiceCode: { contains: q } },
            { patient: { OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { phone: { contains: q } },
            ] } },
          ],
        },
        take: 10,
        include: { patient: true },
      }),
      db.prescription.findMany({
        where: {
          clinicId: user.clinicId!,
          prescriptionCode: { contains: q },
        },
        take: 10,
        include: { patient: true, doctor: true },
      }),
    ])

    return apiSuccess({
      results: { patients, appointments, invoices, prescriptions },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
