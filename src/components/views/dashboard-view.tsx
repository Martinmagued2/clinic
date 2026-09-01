// Role-aware dashboard (spec #7)

'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  CalendarCheck,
  Clock,
  Banknote,
  TrendingUp,
  UserPlus,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency, formatTime } from '@/lib/format'

type Dashboard = {
  stats: {
    todaysAppointments: number
    completedToday: number
    waitingPatients: number
    cancelledToday: number
    newPatientsToday: number
    revenueToday: number
    revenueThisWeek: number
    revenueThisMonth: number
    outstandingAmount: number
    totalPatients: number
  }
  todaysSchedule: Array<{
    id: string
    startTime: string
    endTime: string
    status: string
    patient: { firstName: string; lastName: string; patientCode: string }
    doctor: { name: string; specialty: string }
    service: { name: string } | null
    room: { name: string } | null
  }>
  queue: Array<{
    id: string
    queueNumber: number
    status: string
    patient: { firstName: string; lastName: string }
    doctor: { name: string }
  }>
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-cyan-100 text-cyan-700',
  CHECKED_IN: 'bg-amber-100 text-amber-700',
  WAITING: 'bg-amber-100 text-amber-700',
  IN_CONSULTATION: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-gray-100 text-gray-700',
  RESCHEDULED: 'bg-orange-100 text-orange-700',
}

export function DashboardView() {
  const { user, setView } = useApp()
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const d = await api<Dashboard>('/api/dashboard')
        if (!cancelled) setData(d)
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading dashboard...</div>
  }
  if (!data || !user) return null

  const { stats, todaysSchedule, queue } = data
  const role = user.role

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {useApp.getState().hasPermission('patients.create') && (
          <Button size="sm" onClick={() => setView('patient-new')}>
            <UserPlus className="w-4 h-4 mr-1.5" /> New Patient
          </Button>
        )}
        {useApp.getState().hasPermission('appointments.create') && (
          <Button size="sm" variant="outline" onClick={() => setView('appointment-new')}>
            <CalendarCheck className="w-4 h-4 mr-1.5" /> New Appointment
          </Button>
        )}
        {useApp.getState().hasPermission('queue.view') && (
          <Button size="sm" variant="outline" onClick={() => setView('queue')}>
            <Clock className="w-4 h-4 mr-1.5" /> Open Queue
          </Button>
        )}
        {useApp.getState().hasPermission('billing.create') && (
          <Button size="sm" variant="outline" onClick={() => setView('invoice-new')}>
            <Banknote className="w-4 h-4 mr-1.5" /> Create Invoice
          </Button>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Today's Appts"
          value={String(stats.todaysAppointments)}
          icon={<CalendarCheck className="w-4 h-4" />}
        />
        <StatCard
          label="Completed"
          value={String(stats.completedToday)}
          icon={<TrendingUp className="w-4 h-4" />}
          accent="text-green-600"
        />
        <StatCard
          label="Waiting"
          value={String(stats.waitingPatients)}
          icon={<Clock className="w-4 h-4" />}
          accent="text-amber-600"
        />
        <StatCard
          label="Cancelled/NS"
          value={String(stats.cancelledToday)}
          icon={<AlertCircle className="w-4 h-4" />}
          accent="text-red-600"
        />
        <StatCard
          label="New Patients"
          value={String(stats.newPatientsToday)}
          icon={<UserPlus className="w-4 h-4" />}
        />
      </div>

      {/* Revenue cards */}
      {(role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RevenueCard label="Today's Revenue" amount={stats.revenueToday} highlight />
          <RevenueCard label="This Week" amount={stats.revenueThisWeek} />
          <RevenueCard label="This Month" amount={stats.revenueThisMonth} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's schedule */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setView('appointments')}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {todaysSchedule.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No appointments scheduled for today.
              </div>
            ) : (
              <div className="divide-y max-h-96 overflow-y-auto">
                {todaysSchedule.map((appt) => (
                  <div key={appt.id} className="py-3 flex items-center gap-3">
                    <div className="w-16 text-sm font-mono text-muted-foreground">
                      {appt.startTime}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {appt.patient.firstName} {appt.patient.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {appt.doctor.name} · {appt.service?.name ?? '—'}
                      </div>
                    </div>
                    <Badge className={`${STATUS_COLORS[appt.status] || 'bg-gray-100'} text-xs`} variant="secondary">
                      {appt.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Queue */}
        {useApp.getState().hasPermission('queue.view') && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Queue</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setView('queue')}>
                  Manage
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Queue is empty.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {queue.map((q) => (
                    <div key={q.id} className="flex items-center gap-2 py-1.5">
                      <div className="w-9 h-9 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        #{q.queueNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {q.patient.firstName} {q.patient.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {q.doctor.name}
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[q.status] || 'bg-gray-100'} variant="secondary">
                        {q.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent?: string
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={accent || 'text-muted-foreground'}>{icon}</span>
        </div>
        <div className={`text-2xl font-bold ${accent || ''}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function RevenueCard({ label, amount, highlight }: { label: string; amount: number; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-primary' : ''}>
      <CardContent className="pt-4">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className={`text-xl font-bold ${highlight ? 'text-primary' : ''}`}>
          {formatCurrency(amount)}
        </div>
      </CardContent>
    </Card>
  )
}
