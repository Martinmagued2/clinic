// Invoice detail — GET / PATCH (status, discount)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('billing.view')
    const { id } = await params
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { patient: true, items: { include: { service: true } }, payments: true },
    })
    if (!invoice || invoice.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Invoice not found.', 404)
    }
    return apiSuccess({ invoice })
  } catch (err) {
    return handleApiError(err)
  }
}

const patchSchema = z.object({
  status: z.string().optional(),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('billing.update')
    const { id } = await params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)
    }
    const existing = await db.invoice.findUnique({ where: { id } })
    if (!existing || existing.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Invoice not found.', 404)
    }
    const { discount, tax, ...rest } = parsed.data
    const data: Record<string, unknown> = { ...rest }
    if (discount !== undefined) data.discount = discount
    if (tax !== undefined) data.tax = tax
    if (discount !== undefined || tax !== undefined) {
      data.total = Math.max(0, existing.subtotal - (discount ?? existing.discount) + (tax ?? existing.tax))
    }
    const invoice = await db.invoice.update({ where: { id }, data })
    return apiSuccess({ invoice })
  } catch (err) {
    return handleApiError(err)
  }
}
