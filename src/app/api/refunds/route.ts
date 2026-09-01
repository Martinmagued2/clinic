// Refunds API — list (spec #30)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  handleApiError,
} from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const user = await requirePermission('billing.view')
    const refunds = await db.refund.findMany({
      where: { clinicId: user.clinicId! },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        invoice: { include: { patient: true } },
        refundedBy: { select: { name: true } },
      },
    })
    return apiSuccess({ refunds })
  } catch (err) {
    return handleApiError(err)
  }
}
