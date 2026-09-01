// New appointment flow (spec #13) — patient/doctor/service/date/time/confirm

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Doctor = { id: string; name: string; specialty: string }
type Patient = { id: string; firstName: string; lastName: string; patientCode: string }
type Service = { id: string; name: string; price: number; duration: number }

export function AppointmentNewView() {
  const { viewParam, setView } = useApp()
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [patientId, setPatientId] = useState(viewParam || '')
  const [doctorId, setDoctorId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('09:00')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [p, d, s] = await Promise.all([
          api<{ patients: Patient[] }>('/api/patients?pageSize=200'),
          api<{ doctors: Doctor[] }>('/api/doctors'),
          api<{ services: Service[] }>('/api/services'),
        ])
        setPatients(p.patients)
        setDoctors(d.doctors)
        setServices(s.services)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !doctorId || !date || !startTime) {
      toast.error('Please fill in all required fields.')
      return
    }
    const service = services.find((s) => s.id === serviceId)
    const duration = service?.duration || 30
    const [h, m] = startTime.split(':').map(Number)
    const endMin = h * 60 + m + duration
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`

    setSubmitting(true)
    try {
      await api('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId, doctorId, serviceId: serviceId || undefined,
          date, startTime, endTime,
        }),
      })
      toast.success('Appointment created successfully.')
      setView('appointments')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create appointment.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => setView('appointments')}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
      </Button>

      <form onSubmit={submit}>
        <Card>
          <CardHeader><CardTitle>New Appointment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Patient *</Label>
              <select
                className="w-full h-9 px-3 border rounded-md bg-background text-sm"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              >
                <option value="">— Select patient —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.patientCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Doctor *</Label>
              <select
                className="w-full h-9 px-3 border rounded-md bg-background text-sm"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                required
              >
                <option value="">— Select doctor —</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Service</Label>
              <select
                className="w-full h-9 px-3 border rounded-md bg-background text-sm"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">— Select service —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.price} EGP ({s.duration} min)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full h-9 px-3 border rounded-md bg-background text-sm"
                />
              </div>
              <div>
                <Label>Start Time *</Label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full h-9 px-3 border rounded-md bg-background text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => setView('appointments')}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Create Appointment
          </Button>
        </div>
      </form>
    </div>
  )
}
