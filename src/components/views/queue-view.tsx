// Queue management (spec #17)

'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserCheck, SkipForward, CheckCircle2, Bell } from 'lucide-react'
import { toast } from 'sonner'

type QueueEntry = {
  id: string
  queueNumber: number
  status: string
  checkedInAt: string
  patient: { firstName: string; lastName: string; patientCode: string; phone: string | null }
  doctor: { name: string; specialty: string }
  appointment: { id: string; service: { name: string } | null }
}

export function QueueView() {
  const { user } = useApp()
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [doctorFilter, setDoctorFilter] = useState(user?.doctorId || '')
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([])

  const load = async () => {
    try {
      const [q, d] = await Promise.all([
        api<{ entries: QueueEntry[] }>(`/api/queue?status=WAITING${doctorFilter ? `&doctorId=${doctorFilter}` : ''}`),
        api<{ doctors: { id: string; name: string }[] }>('/api/doctors'),
      ])
      setEntries(q.entries)
      setDoctors(d.doctors)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [doctorFilter])

  const callNext = async (doctorId: string) => {
    try {
      const res = await api<{ entry: QueueEntry | null }>('/api/queue', {
        method: 'POST',
        body: JSON.stringify({ action: 'CALL_NEXT', doctorId }),
      })
      if (res.entry) {
        toast.success(`Calling #${res.entry.queueNumber} — ${res.entry.patient.firstName} ${res.entry.patient.lastName}`)
      } else {
        toast.info('No patients waiting for this doctor.')
      }
      load()
    } catch (err) {
      toast.error('Failed to call next patient.')
    }
  }

  const skip = async (id: string) => {
    try {
      await api('/api/queue', {
        method: 'POST',
        body: JSON.stringify({ action: 'SKIP', queueEntryId: id }),
      })
      toast.info('Patient skipped.')
      load()
    } catch (err) {
      toast.error('Failed to skip patient.')
    }
  }

  const complete = async (id: string) => {
    try {
      await api('/api/queue', {
        method: 'POST',
        body: JSON.stringify({ action: 'COMPLETE', queueEntryId: id }),
      })
      toast.success('Marked as completed.')
      load()
    } catch (err) {
      toast.error('Failed to complete.')
    }
  }

  // Group by doctor
  const byDoctor = entries.reduce<Record<string, QueueEntry[]>>((acc, e) => {
    const key = e.doctor.name
    if (!acc[key]) acc[key] = []
    acc[key].push(e)
    return acc
  }, {})

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <Card>
        <CardContent className="pt-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">Filter by doctor:</span>
          <select
            className="h-9 px-3 border rounded-md text-sm bg-background"
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
          >
            <option value="">All doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div className="text-sm text-muted-foreground ml-auto">
            {entries.length} waiting
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading queue...</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div>No patients waiting.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(byDoctor).map(([doctorName, list]) => (
            <Card key={doctorName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{doctorName}</span>
                  <Button size="sm" onClick={() => callNext(list[0]?.doctor?.id || '')}>
                    <UserCheck className="w-4 h-4 mr-1" /> Call Next
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {list.map((e) => (
                    <div key={e.id} className="border rounded-md p-2.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        #{e.queueNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {e.patient.firstName} {e.patient.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {e.appointment?.service?.name ?? 'Appointment'}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => skip(e.id)} title="Skip">
                          <SkipForward className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => complete(e.id)} title="Complete">
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
