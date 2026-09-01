// Doctors list (spec #41)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Stethoscope, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'

type Doctor = {
  id: string
  name: string
  specialty: string
  phone: string | null
  email: string | null
  consultationFee: number
  status: string
  branch: { name: string } | null
  schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DoctorsView() {
  const { hasPermission } = useApp()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', specialty: '', phone: '', email: '', consultationFee: '500' })

  const load = async () => {
    try {
      const data = await api<{ doctors: Doctor[] }>('/api/doctors')
      setDoctors(data.doctors)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api('/api/doctors', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          email: form.email || undefined,
          consultationFee: Number(form.consultationFee),
        }),
      })
      toast.success('Doctor added.')
      setShowForm(false)
      setForm({ name: '', specialty: '', phone: '', email: '', consultationFee: '500' })
      load()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to add doctor.'
      toast.error(msg)
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Doctors</h2>
        {hasPermission('doctors.manage') && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Doctor
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <form onSubmit={submit} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="h-9 px-3 border rounded-md text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="h-9 px-3 border rounded-md text-sm" placeholder="Specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} required />
            <input className="h-9 px-3 border rounded-md text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="h-9 px-3 border rounded-md text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="h-9 px-3 border rounded-md text-sm" placeholder="Fee" type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} />
            <Button type="submit" className="md:col-span-2">Save</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : doctors.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No doctors yet.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {doctors.map((d) => (
            <Card key={d.id}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-sm text-muted-foreground">{d.specialty}</div>
                  </div>
                  <Badge variant={d.status === 'ACTIVE' ? 'default' : 'secondary'}>{d.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                  {d.phone && <div>📞 {d.phone}</div>}
                  {d.email && <div>✉️ {d.email}</div>}
                  <div>💰 {formatCurrency(d.consultationFee)}</div>
                  {d.branch && <div>📍 {d.branch.name}</div>}
                </div>
                {d.schedules.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-medium mb-1">Schedule</div>
                    <div className="flex flex-wrap gap-1">
                      {d.schedules.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {DAYS[s.dayOfWeek]} {s.startTime}-{s.endTime}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t">
                  <Button size="sm" variant="outline" onClick={() => useApp.getState().setView('doctors-schedule', d.id)}>
                    Edit Schedule
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
