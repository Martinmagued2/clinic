// Patient portal: get this patient's prescriptions (spec #39)

import { db } from '@/lib/db'
import { getCurrentPatient, apiSuccess, handleApiError, AuthError } from '@/lib/auth'

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)

    const prescriptions = await db.prescription.findMany({
      where: { patientId: patient.patientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        doctor: { select: { name: true } },
        items: true,
      },
    })
    return apiSuccess({ prescriptions })
  } catch (err) {
    return handleApiError(err)
  }
}
