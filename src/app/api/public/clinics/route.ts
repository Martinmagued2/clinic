// Public clinic directory — lists clinics with their doctors/services (spec #38)
// No auth required.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiSuccess, handleApiError } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const clinics = await db.clinic.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        code: true,
        phone: true,
        email: true,
        address: true,
        currency: true,
        branches: { select: { id: true, name: true, address: true } },
      },
    })
    return apiSuccess({ clinics })
  } catch (err) {
    return handleApiError(err)
  }
}
