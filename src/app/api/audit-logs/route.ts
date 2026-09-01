// Audit logs API (spec #48)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  handleApiError,
} from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission('audit.view')
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10)
    const action = url.searchParams.get('action')
    const entityType = url.searchParams.get('entityType')
    const userId = url.searchParams.get('userId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const where: Record<string, unknown> = { clinicId: user.clinicId }
    if (action) where.action = { contains: action }
    if (entityType) where.entityType = entityType
    if (userId) where.userId = userId
    if (from || to) {
      where.createdAt = {}
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from)
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to)
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { name: true, email: true } } },
      }),
      db.auditLog.count({ where }),
    ])

    return apiSuccess({
      logs,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
