// Notifications API (spec #35)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  apiSuccess,
  handleApiError,
} from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth()
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const unreadCount = await db.notification.count({
      where: { userId: user.id, read: false },
    })
    return apiSuccess({ notifications, unreadCount })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    if (body.markAllRead) {
      await db.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      })
      return apiSuccess({ ok: true })
    }
    if (body.id) {
      await db.notification.update({
        where: { id: body.id, userId: user.id },
        data: { read: true },
      })
      return apiSuccess({ ok: true })
    }
    return apiSuccess({ ok: false })
  } catch (err) {
    return handleApiError(err)
  }
}
