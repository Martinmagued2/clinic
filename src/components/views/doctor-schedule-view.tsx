// Doctor schedule editor (spec #14, #28)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, Trash2, Clock } from 'lucide-react'
import { toast } from 'sonner'

type Schedule = { id?: string; dayOfWeek: number; startTime: string; endTime: string }

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function DoctorScheduleView() {
  // Reuse viewParam as doctorId, or load doctor list for selection
  const { viewParam, setView, user } = useApp()
  const [doctorId, setDoctorId] = useState(viewParam || user?.doctorId || '')
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; specialty: string }>>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<{ doctors: Array<{ id: string; name: string; specialty: string }> }>('/api/doctors')
      .then((d) => setDoctors(d.doctors))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!doctorId) return
    setLoading(true)
    api<{ schedules: Schedule[] }>(`/api/doctors/${doctorId}/schedules`)
      .then((d) => setSchedules(d.schedules))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [doctorId])

  const addSlot = () => setSchedules([...schedules, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }])
  const removeSlot = (idx: number) => setSchedules(schedules.filter((_, i) => i !== idx))
  const updateSlot = (idx: number, patch: Partial<Schedule>) =>
    setSchedules(schedules.map((s, i) => (i === idx ? { ...s, ...patch } : s)))

  const save = async () => {
    setSaving(true)
    try {
      await api(`/api/doctors/${doctorId}/schedules`, {
        method: 'PUT',
        body: JSON.stringify({ schedules }),
      })
      toast.success('Schedule updated.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setView('doctors')}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Doctors
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" /> Doctor Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Doctor</label>
            <select
              className="w-full h-9 px-3 border rounded-md text-sm bg-background mt-1"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">— Select doctor —</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
              ))}
            </select>
          </div>

          {doctorId && (
            <>
              <div className="space-y-2">
                {schedules.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 md:col-span-5">
                      <label className="text-xs text-muted-foreground">Day</label>
                      <select
                        className="w-full h-9 px-3 border rounded-md text-sm bg-background"
                        value={s.dayOfWeek}
                        onChange={(e) => updateSlot(idx, { dayOfWeek: Number(e.target.value) })}
                      >
                        {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                    </div>
                    <div className="col-span-5 md:col-span-3">
                      <label className="text-xs text-muted-foreground">Start</label>
                      <Input type="time" value={s.startTime} onChange={(e) => updateSlot(idx, { startTime: e.target.value })} />
                    </div>
                    <div className="col-span-5 md:col-span-3">
                      <label className="text-xs text-muted-foreground">End</label>
                      <Input type="time" value={s.endTime} onChange={(e) => updateSlot(idx, { endTime: e.target.value })} />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <Button size="sm" variant="ghost" onClick={() => removeSlot(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={addSlot}>
                  <Plus className="w-3 h-3 mr-1" /> Add Time Slot
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Schedule'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
