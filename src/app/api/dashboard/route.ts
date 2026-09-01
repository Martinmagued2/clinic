// Dashboard API — role-aware statistics (spec #7)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  apiSuccess,
  handleApiError,
} from '@/lib/auth'
import { getTodayRange } from '@/lib/format'

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user.clinicId) return apiSuccess({ dashboard: null })

    const { start: todayStart, end: todayEnd } = getTodayRange()
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Doctor filter for DOCTOR role
    const doctorFilter =
      user.role === 'DOCTOR' && user.doctorId ? { doctorId: user.doctorId } : {}

    const [
      todaysAppointments,
      completedToday,
      waitingPatients,
      cancelledToday,
      newPatientsToday,
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
      totalPatients,
      outstandingTotal,
      outstandingPaid,
      queueEntries,
    ] = await Promise.all([
      db.appointment.count({
        where: {
          clinicId: user.clinicId,
          date: { gte: todayStart, lte: todayEnd },
          ...doctorFilter,
        },
      }),
      db.appointment.count({
        where: {
          clinicId: user.clinicId,
          status: 'COMPLETED',
          date: { gte: todayStart, lte: todayEnd },
          ...doctorFilter,
        },
      }),
      db.queueEntry.count({
        where: { clinicId: user.clinicId, status: 'WAITING' },
      }),
      db.appointment.count({
        where: {
          clinicId: user.clinicId,
          status: { in: ['CANCELLED', 'NO_SHOW'] },
          date: { gte: todayStart, lte: todayEnd },
          ...doctorFilter,
        },
      }),
      db.patient.count({
        where: { clinicId: user.clinicId, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      db.payment.aggregate({
        where: {
          invoice: { clinicId: user.clinicId },
          paymentDate: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
      }),
      db.payment.aggregate({
        where: {
          invoice: { clinicId: user.clinicId },
          paymentDate: { gte: startOfWeek },
        },
        _sum: { amount: true },
      }),
      db.payment.aggregate({
        where: {
          invoice: { clinicId: user.clinicId },
          paymentDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      db.patient.count({ where: { clinicId: user.clinicId } }),
      db.invoice.aggregate({
        where: { clinicId: user.clinicId, status: { in: ['ISSUED', 'PARTIALLY_PAID'] } },
        _sum: { total: true },
      }),
      db.payment.aggregate({
        where: { invoice: { clinicId: user.clinicId, status: { in: ['ISSUED', 'PARTIALLY_PAID'] } } },
        _sum: { amount: true },
      }),
      db.queueEntry.findMany({
        where: { clinicId: user.clinicId, status: { in: ['WAITING', 'CALLED', 'IN_CONSULTATION'] } },
        orderBy: { queueNumber: 'asc' },
        take: 15,
        include: { patient: true, doctor: true, appointment: { include: { service: true } } },
      }),
    ])

    const outstandingAmount =
      ((outstandingTotal?._sum?.total as number | null) ?? 0) -
      ((outstandingPaid?._sum?.amount as number | null) ?? 0)

    const todaysSchedule = await db.appointment.findMany({
      where: {
        clinicId: user.clinicId,
        date: { gte: todayStart, lte: todayEnd },
        ...doctorFilter,
      },
      orderBy: { startTime: 'asc' },
      include: { patient: true, doctor: true, service: true, room: true },
      take: 50,
    })

    return apiSuccess({
      stats: {
        todaysAppointments,
        completedToday,
        waitingPatients,
        cancelledToday,
        newPatientsToday,
        revenueToday: (revenueToday?._sum?.amount as number | null) ?? 0,
        revenueThisWeek: (revenueThisWeek?._sum?.amount as number | null) ?? 0,
        revenueThisMonth: (revenueThisMonth?._sum?.amount as number | null) ?? 0,
        outstandingAmount,
        totalPatients,
      },
      todaysSchedule,
      queue: queueEntries,
    })
  } catch (err) {
    return handleApiError(err)
  }
}
