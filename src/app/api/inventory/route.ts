// Inventory API — list / create (spec #79)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const url = new URL(req.url)
    const category = url.searchParams.get('category')
    const lowStock = url.searchParams.get('lowStock')

    const where: Record<string, unknown> = { clinicId: user.clinicId! }
    if (category) where.category = category
    if (lowStock === 'true') {
      where.stockQuantity = { lte: db.inventoryItem.fields.minStockLevel }
    }

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { supplier: true },
    })
    return apiSuccess({ items })
  } catch (err) {
    return handleApiError(err)
  }
}

const schema = z.object({
  name: z.string().min(1),
  category: z.string().default('GENERAL'),
  unit: z.string().default('piece'),
  stockQuantity: z.number().min(0).default(0),
  minStockLevel: z.number().min(0).default(0),
  costPrice: z.number().min(0).default(0),
  sellPrice: z.number().min(0).default(0),
  expiryDate: z.string().optional(),
  batchNumber: z.string().optional(),
  supplierId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return apiError('FORBIDDEN', 'Only admins can manage inventory.', 403)
    }
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '), 400)

    const item = await db.inventoryItem.create({
      data: {
        ...parsed.data,
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        supplierId: parsed.data.supplierId || null,
        clinicId: user.clinicId!,
      },
    })
    await audit({ clinicId: user.clinicId, userId: user.id, action: 'INVENTORY_ITEM_CREATED', entityType: 'InventoryItem', entityId: item.id })
    return apiSuccess({ item }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
