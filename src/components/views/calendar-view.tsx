// Calendar view — week grid showing appointments by day (spec #15)

'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Appt = {
  id: string
  startTime: string
  endTime: string
  status: string
  date: string
  patient: { firstName: string; lastName: string }
  doctor: { name: string }
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700 border-blue-200',
  CONFIRMED: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  CHECKED_IN: 'bg-amber-100 text-amber-700 border-amber-200',
  IN_CONSULTATION: 'bg-purple-100 text-purple-700 border-purple-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function CalendarView() {
  const { setView } = useApp()
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [appts, setAppts] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  const weekKey = days.map(dateKey).join(',')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        // Load all 7 days in parallel
        const promises = days.map((d) =>
          api<{ appointments: Appt[] }>(`/api/appointments?date=${d.toISOString()}`),
        )
        const results = await Promise.all(promises)
        if (!cancelled) {
          // Tag each appointment with its day's date key so we can group
          const tagged: Appt[] = []
          results.forEach((r, dayIdx) => {
            const dk = dateKey(days[dayIdx])
            r.appointments.forEach((a) => {
              tagged.push({ ...a, date: dk })
            })
          })
          setAppts(tagged)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [weekKey])

  const apptsByDay = days.map((day) => {
    const dk = dateKey(day)
    return {
      day,
      appts: appts
        .filter((a) => a.date === dk)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }
  })

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(d)
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => shiftWeek(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="font-medium">
          {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} —{' '}
          {days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <Button size="sm" variant="outline" onClick={() => shiftWeek(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => {
          const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); setWeekStart(d)
        }}>
          This Week
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {apptsByDay.map(({ day, appts: dayAppts }) => {
          const isToday = dateKey(day) === dateKey(new Date())
          return (
            <Card key={dateKey(day)} className={`min-h-[200px] ${isToday ? 'border-primary' : ''}`}>
              <div className={`p-2 border-b ${isToday ? 'bg-primary/10' : 'bg-muted/30'}`}>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  {DAY_LABELS[day.getDay()]}
                </div>
                <div className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>
                  {day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div className="p-1.5 space-y-1 max-h-72 overflow-y-auto">
                {loading ? (
                  <div className="text-xs text-muted-foreground text-center py-4">...</div>
                ) : dayAppts.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">—</div>
                ) : (
                  dayAppts.map((a) => (
                    <div
                      key={a.id}
                      className={`text-xs p-1.5 rounded border cursor-pointer hover:shadow-sm ${STATUS_COLORS[a.status] || 'bg-gray-100 border-gray-200'}`}
                      onClick={() => setView('appointment-detail', a.id)}
                    >
                      <div className="font-mono font-bold">{a.startTime}</div>
                      <div className="truncate font-medium">{a.patient.firstName} {a.patient.lastName}</div>
                      <div className="truncate opacity-75">{a.doctor.name}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
