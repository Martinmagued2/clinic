// Payments for an invoice — list / create (spec #29, #30, #50)

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

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('billing.view')
    const { id } = await params
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { payments: true },
    })
    if (!invoice || invoice.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Invoice not found.', 404)
    }
    return apiSuccess({ payments: invoice.payments })
  } catch (err) {
    return handleApiError(err)
  }
}

const createPaymentSchema = z.object({
  amount: z.number().min(0.01),
  paymentMethod: z.string().default('CASH'),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('payments.create')
    const { id } = await params
    const body = await req.json()
    const parsed = createPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)
    }

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { payments: true },
    })
    if (!invoice || invoice.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Invoice not found.', 404)
    }

    // Transactional payment creation (spec #50)
    const payment = await db.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          invoiceId: id,
          amount: parsed.data.amount,
          paymentMethod: parsed.data.paymentMethod,
          reference: parsed.data.reference || null,
          notes: parsed.data.notes || null,
          receivedById: user.id,
        },
      })

      const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0) + parsed.data.amount
      const newStatus =
        totalPaid >= invoice.total ? 'PAID' : totalPaid > 0 ? 'PARTIALLY_PAID' : invoice.status

      await tx.invoice.update({
        where: { id },
        data: { paidAmount: totalPaid, status: newStatus },
      })

      return newPayment
    })

    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'PAYMENT_CREATED',
      entityType: 'Payment',
      entityId: payment.id,
      newValues: { amount: parsed.data.amount, invoiceId: id },
    })

    return apiSuccess({ payment }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
