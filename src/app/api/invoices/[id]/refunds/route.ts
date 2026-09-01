// Issue refund for an invoice (spec #30)
// Transactional: creates Refund + updates invoice paidAmount + status.

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

type RouteParams = { params: Promise<{ id: string }> }

const refundSchema = z.object({
  amount: z.number().min(0.01),
  reason: z.string().optional().nullable(),
  paymentId: z.string().optional().nullable(),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('billing.update')
    const { id } = await params
    const body = await req.json()
    const parsed = refundSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)
    }

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { payments: true, refunds: true },
    })
    if (!invoice || invoice.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Invoice not found.', 404)
    }

    const totalRefunded = invoice.refunds.reduce((s, r) => s + r.amount, 0)
    const maxRefundable = invoice.paidAmount - totalRefunded
    if (parsed.data.amount > maxRefundable) {
      return apiError('VALIDATION_ERROR', `Refund exceeds paid amount (max: ${maxRefundable}).`, 400)
    }

    const refund = await db.$transaction(async (tx) => {
      const newRefund = await tx.refund.create({
        data: {
          clinicId: user.clinicId!,
          invoiceId: id,
          paymentId: parsed.data.paymentId || null,
          amount: parsed.data.amount,
          reason: parsed.data.reason || null,
          refundedById: user.id,
        },
      })
      const newPaidAmount = invoice.paidAmount - parsed.data.amount
      const newStatus = newPaidAmount <= 0 ? 'REFUNDED' : invoice.status
      await tx.invoice.update({
        where: { id },
        data: { paidAmount: newPaidAmount, status: newStatus },
      })
      return newRefund
    })

    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'REFUND_ISSUED',
      entityType: 'Refund',
      entityId: refund.id,
      newValues: { amount: parsed.data.amount, invoiceId: id },
    })

    return apiSuccess({ refund }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
