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

    const where: Record<string, unknown> = { clinicId: user.clinicId }
    if (action) where.action = { contains: action }

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
