// Invoices API — list / create (spec #27, #28)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { audit } from '@/lib/audit'
import { nextInvoiceCode } from '@/lib/codes'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission('billing.view')
    const url = new URL(req.url)
    const patientId = url.searchParams.get('patientId')
    const status = url.searchParams.get('status')

    const where: Record<string, unknown> = { clinicId: user.clinicId! }
    if (patientId) where.patientId = patientId
    if (status) where.status = status

    const invoices = await db.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        patient: true,
        items: true,
        payments: true,
      },
    })
    return apiSuccess({ invoices })
  } catch (err) {
    return handleApiError(err)
  }
}

const itemSchema = z.object({
  serviceId: z.string().optional().nullable(),
  description: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
})

const createInvoiceSchema = z.object({
  patientId: z.string().min(1),
  visitId: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
  discount: z.number().min(0).optional().default(0),
  tax: z.number().min(0).optional().default(0),
  notes: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('billing.create')
    const body = await req.json()
    const parsed = createInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)
    }
    const { items, visitId, discount = 0, tax = 0, ...rest } = parsed.data

    const patient = await db.patient.findUnique({ where: { id: rest.patientId } })
    if (!patient || patient.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Patient not found.', 404)
    }

    const itemsWithTotals = items.map((i) => ({
      ...i,
      total: i.quantity * i.unitPrice,
    }))
    const subtotal = itemsWithTotals.reduce((sum, i) => sum + i.total, 0)
    const total = Math.max(0, subtotal - discount + tax)

    const invoiceCode = await nextInvoiceCode(user.clinicId!)
    const invoice = await db.invoice.create({
      data: {
        ...rest,
        visitId: visitId || null,
        invoiceCode,
        clinicId: user.clinicId!,
        createdById: user.id,
        status: 'ISSUED',
        subtotal,
        discount,
        tax,
        total,
        items: { create: itemsWithTotals },
      },
      include: { patient: true, items: true },
    })

    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'INVOICE_CREATED',
      entityType: 'Invoice',
      entityId: invoice.id,
      newValues: { invoiceCode, total },
    })

    return apiSuccess({ invoice }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
