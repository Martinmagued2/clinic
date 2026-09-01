// Patient portal: get this patient's appointments (spec #39)

import { db } from '@/lib/db'
import { getCurrentPatient, apiSuccess, handleApiError, AuthError } from '@/lib/auth'

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)

    const appointments = await db.appointment.findMany({
      where: { patientId: patient.patientId },
      orderBy: { date: 'desc' },
      take: 50,
      include: {
        doctor: { select: { name: true, specialty: true } },
        service: { select: { name: true } },
      },
    })
    return apiSuccess({ appointments })
  } catch (err) {
    return handleApiError(err)
  }
}
