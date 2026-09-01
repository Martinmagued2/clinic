// Prescription detail — GET

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('prescriptions.view')
    const { id } = await params
    const prescription = await db.prescription.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        visit: true,
        items: { include: { medication: true } },
      },
    })
    if (!prescription || prescription.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Prescription not found.', 404)
    }
    return apiSuccess({ prescription })
  } catch (err) {
    return handleApiError(err)
  }
}
