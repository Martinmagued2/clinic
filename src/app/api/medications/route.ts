// Medications API — list / create (spec #24)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const url = new URL(req.url)
    const search = url.searchParams.get('search')
    const where: Record<string, unknown> = { clinicId: user.clinicId!, status: 'ACTIVE' }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { activeIngredient: { contains: search } },
      ]
    }
    const medications = await db.medication.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50,
    })
    return apiSuccess({ medications })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return apiError('FORBIDDEN', 'Only admins can manage medications.', 403)
    }
    const body = await req.json()
    const medication = await db.medication.create({
      data: { ...body, clinicId: user.clinicId! },
    })
    return apiSuccess({ medication }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
