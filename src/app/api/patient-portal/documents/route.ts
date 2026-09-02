// Patient portal: documents (view their own documents)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentPatient, apiSuccess, handleApiError, AuthError } from '@/lib/auth'

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)
    const documents = await db.document.findMany({ where: { patientId: patient.patientId }, orderBy: { createdAt: 'desc' }, select: { id: true, fileName: true, fileType: true, fileSize: true, category: true, description: true, createdAt: true } })
    return apiSuccess({ documents })
  } catch (err) { return handleApiError(err) }
}
