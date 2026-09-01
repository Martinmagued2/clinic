// Clinic info API (spec #44)

import { NextRequest } from 'next/server'
import {
  requireAuth,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user.clinicId) return apiSuccess({ clinic: null, branches: [] })
    const [clinic, branches] = await Promise.all([
      db.clinic.findUnique({ where: { id: user.clinicId } }),
      db.branch.findMany({
        where: { clinicId: user.clinicId },
        include: { rooms: true },
      }),
    ])
    return apiSuccess({ clinic, branches })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user.clinicId) return apiError('NOT_FOUND', 'No clinic.', 404)
    // For simplicity, allow any clinic admin to update
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return apiError('FORBIDDEN', 'Only clinic admins can update settings.', 403)
    }
    const body = await req.json()
    const allowed = ['name', 'legalName', 'phone', 'email', 'address', 'currency', 'locale', 'timezone', 'logoUrl']
    const data: Record<string, unknown> = {}
    for (const k of allowed) {
      if (body[k] !== undefined) data[k] = body[k]
    }
    const clinic = await db.clinic.update({ where: { id: user.clinicId }, data })
    return apiSuccess({ clinic })
  } catch (err) {
    return handleApiError(err)
  }
}
