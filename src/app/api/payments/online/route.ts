// Online payment — Paymob integration stub (spec — online payments)
// In production: integrate with Paymob/Stripe. For now: records payment intent.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().min(0.01),
  method: z.string().default('ONLINE'),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)

    const invoice = await db.invoice.findUnique({ where: { id: parsed.data.invoiceId } })
    if (!invoice || invoice.clinicId !== user.clinicId) return apiError('NOT_FOUND', 'Invoice not found.', 404)

    const balance = invoice.total - invoice.paidAmount
    if (parsed.data.amount > balance) return apiError('VALIDATION_ERROR', `Amount exceeds balance (${balance}).`, 400)

    // In production: create Paymob payment intent, return redirect URL
    // For now: simulate successful payment
    const payment = await db.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: parsed.data.amount,
          paymentMethod: parsed.data.method,
          reference: `ONLINE-${Date.now()}`,
          notes: 'Online payment',
          receivedById: user.id,
        },
      })
      const totalPaid = invoice.paidAmount + parsed.data.amount
      const newStatus = totalPaid >= invoice.total ? 'PAID' : 'PARTIALLY_PAID'
      await tx.invoice.update({ where: { id: invoice.id }, data: { paidAmount: totalPaid, status: newStatus } })
      return newPayment
    })

    await audit({ clinicId: user.clinicId, userId: user.id, action: 'ONLINE_PAYMENT', entityType: 'Payment', entityId: payment.id, newValues: { amount: parsed.data.amount } })
    return apiSuccess({ payment, redirectUrl: null, message: 'Payment processed successfully.' }, 201)
  } catch (err) { return handleApiError(err) }
}
