// Appointments list (spec #12, #13)

'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/format'

type Appt = {
  id: string
  startTime: string
  endTime: string
  status: string
  date: string
  patient: { firstName: string; lastName: string; patientCode: string }
  doctor: { name: string; specialty: string }
  service: { name: string } | null
}

export function AppointmentsView() {
  const { setView } = useApp()
  const [appts, setAppts] = useState<Appt[]>([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await api<{ appointments: Appt[] }>(`/api/appointments?date=${date}`)
        if (!cancelled) setAppts(data.appointments)
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [date])

  const shiftDate = (days: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().slice(0, 10))
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
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => shiftDate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 border rounded-md text-sm"
          />
          <Button size="sm" variant="outline" onClick={() => shiftDate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>
            Today
          </Button>
        </div>
        {useApp.getState().hasPermission('appointments.create') && (
          <Button onClick={() => setView('appointment-new')}>
            <Plus className="w-4 h-4 mr-1.5" /> New Appointment
          </Button>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-4 py-3">Patient</th>
                <th className="text-left px-4 py-3">Doctor</th>
                <th className="text-left px-4 py-3">Service</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : appts.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No appointments on {formatDate(date)}.</td></tr>
              ) : (
                appts.map((a) => (
                  <tr
                    key={a.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => setView('patient-detail', undefined)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{a.startTime}–{a.endTime}</td>
                    <td className="px-4 py-3 font-medium">{a.patient.firstName} {a.patient.lastName}</td>
                    <td className="px-4 py-3">{a.doctor.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.service?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[a.status] || 'bg-gray-100'} variant="secondary">
                        {a.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
