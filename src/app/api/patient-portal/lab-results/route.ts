// Patient portal: get this patient's lab results (spec #39)

import { db } from '@/lib/db'
import { getCurrentPatient, apiSuccess, handleApiError, AuthError } from '@/lib/auth'

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)

    const labResults = await db.labResult.findMany({
      where: { patientId: patient.patientId },
      orderBy: { reportedAt: 'desc' },
      take: 50,
    })
    return apiSuccess({ labResults })
  } catch (err) {
    return handleApiError(err)
  }
}
