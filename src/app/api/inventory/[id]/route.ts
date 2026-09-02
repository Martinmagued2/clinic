// Inventory item detail + stock movements + update

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const item = await db.inventoryItem.findUnique({
      where: { id },
      include: { supplier: true, movements: { include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 } },
    })
    if (!item || item.clinicId !== user.clinicId) return apiError('NOT_FOUND', 'Item not found.', 404)
    return apiSuccess({ item })
  } catch (err) {
    return handleApiError(err)
  }
}

const patchSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  stockQuantity: z.number().optional(),
  minStockLevel: z.number().optional(),
  costPrice: z.number().optional(),
  sellPrice: z.number().optional(),
  status: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid data.', 400)

    const existing = await db.inventoryItem.findUnique({ where: { id } })
    if (!existing || existing.clinicId !== user.clinicId) return apiError('NOT_FOUND', 'Item not found.', 404)

    const item = await db.inventoryItem.update({ where: { id }, data: parsed.data })
    return apiSuccess({ item })
  } catch (err) {
    return handleApiError(err)
  }
}

// Stock movement (IN / OUT / ADJUST)
const moveSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUST']),
  quantity: z.number(),
  reason: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()
    const parsed = moveSchema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid movement.', 400)

    const item = await db.inventoryItem.findUnique({ where: { id } })
    if (!item || item.clinicId !== user.clinicId) return apiError('NOT_FOUND', 'Item not found.', 404)

    const delta = parsed.data.type === 'OUT' ? -parsed.data.quantity : parsed.data.quantity
    const newQty = parsed.data.type === 'ADJUST' ? parsed.data.quantity : item.stockQuantity + delta

    const [updatedItem, movement] = await db.$transaction([
      db.inventoryItem.update({ where: { id }, data: { stockQuantity: newQty } }),
      db.inventoryMovement.create({
        data: {
          itemId: id,
          clinicId: user.clinicId!,
          type: parsed.data.type,
          quantity: parsed.data.quantity,
          reason: parsed.data.reason || null,
          createdById: user.id,
        },
      }),
    ])

    // Low stock notification
    if (newQty <= item.minStockLevel) {
      await db.notification.create({
        data: {
          clinicId: user.clinicId!,
          userId: user.id,
          type: 'LOW_STOCK',
          title: 'Low Stock Alert',
          message: `${item.name} is below minimum level (${newQty} ${item.unit})`,
        },
      })
    }

    await audit({ clinicId: user.clinicId, userId: user.id, action: `INVENTORY_${parsed.data.type}`, entityType: 'InventoryItem', entityId: id, newValues: { quantity: parsed.data.quantity } })
    return apiSuccess({ item: updatedItem, movement }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
