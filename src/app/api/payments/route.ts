// Payments API — flat list with optional filters (spec #29)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  handleApiError,
} from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission('billing.view')
    const url = new URL(req.url)
    const method = url.searchParams.get('method')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const where: Record<string, unknown> = { invoice: { clinicId: user.clinicId! } }
    if (method) where.paymentMethod = method
    if (from || to) {
      where.paymentDate = {}
      if (from) (where.paymentDate as Record<string, unknown>).gte = new Date(from)
      if (to) (where.paymentDate as Record<string, unknown>).lte = new Date(to)
    }

    const payments = await db.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      take: 200,
      include: { invoice: { include: { patient: true } }, receivedBy: true },
    })
    return apiSuccess({ payments })
  } catch (err) {
    return handleApiError(err)
  }
}
