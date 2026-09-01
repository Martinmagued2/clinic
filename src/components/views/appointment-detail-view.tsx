// Appointment detail view with actions (spec #12, #96)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, LogIn, XCircle, CheckCircle2, Stethoscope, Calendar } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/format'
import { toast } from 'sonner'

type Appt = {
  id: string
  startTime: string
  endTime: string
  status: string
  date: string
  notes: string | null
  patient: { id: string; firstName: string; lastName: string; patientCode: string; phone: string | null; email: string | null }
  doctor: { id: string; name: string; specialty: string }
  service: { name: string } | null
  room: { name: string } | null
  statusHistory: Array<{ id: string; status: string; createdAt: string }>
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

export function AppointmentDetailView() {
  const { viewParam, setView, hasPermission } = useApp()
  const [appt, setAppt] = useState<Appt | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [rescheduleMode, setRescheduleMode] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')

  const load = async () => {
    if (!viewParam) return
    try {
      const data = await api<{ appointment: Appt }>(`/api/appointments/${viewParam}`)
      setAppt(data.appointment)
      setNewDate(data.appointment.date.slice(0, 10))
      setNewTime(data.appointment.startTime)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [viewParam])

  const action = async (status: string) => {
    if (!appt) return
    setActing(true)
    try {
      await api(`/api/appointments/${appt.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      toast.success(`Marked as ${status.replace(/_/g, ' ')}.`)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed.')
    } finally {
      setActing(false)
    }
  }

  const checkIn = async () => {
    if (!appt) return
    setActing(true)
    try {
      await api(`/api/appointments/${appt.id}/check-in`, { method: 'POST' })
      toast.success('Patient checked in.')
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed.')
    } finally {
      setActing(false)
    }
  }

  const cancel = async () => {
    if (!appt) return
    if (!confirm('Cancel this appointment?')) return
    setActing(true)
    try {
      await api(`/api/appointments/${appt.id}`, { method: 'DELETE' })
      toast.success('Appointment cancelled.')
      setView('appointments')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed.')
    } finally {
      setActing(false)
    }
  }

  const saveReschedule = async () => {
    if (!appt) return
    setActing(true)
    try {
      const [h, m] = newTime.split(':').map(Number)
      const endMin = h * 60 + m + 30
      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
      await api(`/api/appointments/${appt.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ date: newDate, startTime: newTime, endTime, status: 'RESCHEDULED' }),
      })
      toast.success('Appointment rescheduled.')
      setRescheduleMode(false)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed.')
    } finally {
      setActing(false)
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>
  if (!appt) return <div className="p-6 text-muted-foreground">Not found.</div>

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setView('appointments')}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Appointment</CardTitle>
            <Badge className={STATUS_COLORS[appt.status]} variant="secondary">
              {appt.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Patient</div>
              <button
                className="font-medium text-left hover:underline"
                onClick={() => setView('patient-detail', appt.patient.id)}
              >
                {appt.patient.firstName} {appt.patient.lastName}
              </button>
              <div className="text-xs text-muted-foreground">{appt.patient.patientCode}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Doctor</div>
              <div className="font-medium">{appt.doctor.name}</div>
              <div className="text-xs text-muted-foreground">{appt.doctor.specialty}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Service</div>
              <div className="font-medium">{appt.service?.name ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Date</div>
              <div className="font-medium">{formatDate(appt.date)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Time</div>
              <div className="font-medium font-mono">{appt.startTime} – {appt.endTime}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Room</div>
              <div className="font-medium">{appt.room?.name ?? '—'}</div>
            </div>
          </div>

          {appt.notes && (
            <div>
              <div className="text-xs text-muted-foreground">Notes</div>
              <div className="text-sm bg-muted/30 p-2 rounded">{appt.notes}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {hasPermission('queue.manage') && appt.status === 'SCHEDULED' && (
              <Button size="sm" onClick={checkIn} disabled={acting}>
                <LogIn className="w-4 h-4 mr-1.5" /> Check In
              </Button>
            )}
            {hasPermission('appointments.update') && appt.status === 'CHECKED_IN' && (
              <Button size="sm" onClick={() => action('IN_CONSULTATION')} disabled={acting}>
                <Stethoscope className="w-4 h-4 mr-1.5" /> Start Consultation
              </Button>
            )}
            {hasPermission('appointments.update') && appt.status === 'IN_CONSULTATION' && (
              <Button size="sm" onClick={() => action('COMPLETED')} disabled={acting}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark Complete
              </Button>
            )}
            {hasPermission('medical_records.create') && appt.status === 'IN_CONSULTATION' && (
              <Button size="sm" variant="outline" onClick={() => setView('visit-new', appt.patient.id)}>
                <Stethoscope className="w-4 h-4 mr-1.5" /> Start Visit
              </Button>
            )}
            {hasPermission('appointments.update') && !rescheduleMode && appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED' && (
              <Button size="sm" variant="outline" onClick={() => setRescheduleMode(true)}>
                <Calendar className="w-4 h-4 mr-1.5" /> Reschedule
              </Button>
            )}
            {hasPermission('appointments.cancel') && appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED' && (
              <Button size="sm" variant="outline" onClick={cancel} disabled={acting}>
                <XCircle className="w-4 h-4 mr-1.5" /> Cancel
              </Button>
            )}
          </div>

          {/* Reschedule form */}
          {rescheduleMode && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4 grid grid-cols-2 gap-3">
                <div>
                  <Label>New Date</Label>
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                </div>
                <div>
                  <Label>New Time</Label>
                  <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                </div>
                <div className="col-span-2 flex gap-2">
                  <Button size="sm" onClick={saveReschedule} disabled={acting}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setRescheduleMode(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Status history */}
      {appt.statusHistory.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Status History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...appt.statusHistory].reverse().map((h) => (
                <div key={h.id} className="flex items-center gap-3 text-sm border-l-2 border-primary/30 pl-3">
                  <div className="font-medium">{h.status.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
