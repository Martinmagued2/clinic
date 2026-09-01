// CSV data export (spec #90)
// Generates CSV files for patients, appointments, invoices, payments.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, apiError, handleApiError } from '@/lib/auth'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(
      headers
        .map((h) => {
          const v = row[h]
          if (v === null || v === undefined) return ''
          const s = String(v).replace(/"/g, '""')
          return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
        })
        .join(','),
    )
  }
  return lines.join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission('reports.view')
    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'patients'
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const dateFilter =
      from && to
        ? { gte: new Date(from), lte: new Date(to) }
        : undefined

    let rows: Record<string, unknown>[] = []
    let filename = `${type}.csv`

    if (type === 'patients') {
      rows = (await db.patient.findMany({
        where: { clinicId: user.clinicId!, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      })).map((p) => ({
        patientCode: p.patientCode,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        email: p.email,
        gender: p.gender,
        dateOfBirth: p.dateOfBirth,
        bloodType: p.bloodType,
        allergies: p.allergies,
        chronicConditions: p.chronicConditions,
        createdAt: p.createdAt,
      }))
    } else if (type === 'appointments') {
      const where: Record<string, unknown> = { clinicId: user.clinicId! }
      if (dateFilter) where.date = dateFilter
      rows = (await db.appointment.findMany({
        where,
        orderBy: { date: 'desc' },
        include: { patient: true, doctor: true, service: true },
      })).map((a) => ({
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        patient: `${a.patient.firstName} ${a.patient.lastName}`,
        patientCode: a.patient.patientCode,
        doctor: a.doctor.name,
        service: a.service?.name ?? '',
      }))
    } else if (type === 'invoices') {
      const where: Record<string, unknown> = { clinicId: user.clinicId! }
      if (dateFilter) where.createdAt = dateFilter
      rows = (await db.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { patient: true },
      })).map((i) => ({
        invoiceCode: i.invoiceCode,
        date: i.createdAt,
        patient: `${i.patient.firstName} ${i.patient.lastName}`,
        subtotal: i.subtotal,
        discount: i.discount,
        tax: i.tax,
        total: i.total,
        paid: i.paidAmount,
        status: i.status,
      }))
    } else if (type === 'payments') {
      const where: Record<string, unknown> = { invoice: { clinicId: user.clinicId! } }
      if (dateFilter) where.paymentDate = dateFilter
      rows = (await db.payment.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        include: { invoice: { include: { patient: true } }, receivedBy: true },
      })).map((p) => ({
        date: p.paymentDate,
        amount: p.amount,
        method: p.paymentMethod,
        reference: p.reference,
        invoiceCode: p.invoice.invoiceCode,
        patient: `${p.invoice.patient.firstName} ${p.invoice.patient.lastName}`,
        receivedBy: p.receivedBy.name,
      }))
    } else {
      return apiError('VALIDATION_ERROR', 'Unknown export type.', 400)
    }

    const csv = toCsv(rows)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
