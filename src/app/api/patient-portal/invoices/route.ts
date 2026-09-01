// Patient portal: get this patient's invoices (spec #39)

import { db } from '@/lib/db'
import { getCurrentPatient, apiSuccess, handleApiError, AuthError } from '@/lib/auth'

export async function GET() {
  try {
    const patient = await getCurrentPatient()
    if (!patient) throw new AuthError('UNAUTHENTICATED', 'Not authenticated.', 401)

    const invoices = await db.invoice.findMany({
      where: { patientId: patient.patientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        items: true,
        payments: true,
      },
    })
    return apiSuccess({ invoices })
  } catch (err) {
    return handleApiError(err)
  }
}
