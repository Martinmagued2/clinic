// Follow-ups API — list visits with future followUpDate (spec #9)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  handleApiError,
} from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const user = await requirePermission('medical_records.view')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const visits = await db.visit.findMany({
      where: {
        clinicId: user.clinicId!,
        followUpDate: { gte: today },
      },
      orderBy: { followUpDate: 'asc' },
      include: { patient: true, doctor: true },
      take: 50,
    })

    return apiSuccess({
      followUps: visits.map((v) => ({
        id: v.id,
        followUpDate: v.followUpDate,
        patientId: v.patientId,
        patientName: `${v.patient.firstName} ${v.patient.lastName}`,
        patientCode: v.patient.patientCode,
        doctorId: v.doctorId,
        doctorName: v.doctor.name,
        diagnosis: v.diagnosis,
        status: v.status,
      })),
    })
  } catch (err) {
    return handleApiError(err)
  }
}
