// Public online booking — no auth required (spec #38)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Clinic = { id: string; name: string; phone: string | null; address: string | null; currency: string }
type Doctor = { id: string; name: string; specialty: string }
type Service = { id: string; name: string; price: number; duration: number }

export function OnlineBookingView() {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [clinicId, setClinicId] = useState('')
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    doctorId: '',
    serviceId: '',
    date: '',
    startTime: '09:00',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: 'MALE',
  })

  useEffect(() => {
    api<{ clinics: Clinic[] }>('/api/public/clinics').then((d) => {
      setClinics(d.clinics)
      if (d.clinics.length > 0) setClinicId(d.clinics[0].id)
    })
  }, [])

  useEffect(() => {
    if (!clinicId) return
    api<{ doctors: Doctor[]; services: Service[] }>(`/api/public/booking?clinicId=${clinicId}`).then((d) => {
      setDoctors(d.doctors)
      setServices(d.services)
    })
  }, [clinicId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const clinic = clinics.find((c) => c.id === clinicId)!
      const service = services.find((s) => s.id === form.serviceId)
      const duration = service?.duration || 30
      const [h, m] = form.startTime.split(':').map(Number)
      const endMin = h * 60 + m + duration
      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`

      await api('/api/public/booking', {
        method: 'POST',
        body: JSON.stringify({
          clinicId,
          doctorId: form.doctorId,
          serviceId: form.serviceId || null,
          date: form.date,
          startTime: form.startTime,
          endTime,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender,
        }),
      })
      setDone(true)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Booking failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-xl font-bold mb-2">Appointment Booked!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your appointment has been confirmed. The clinic will contact you if there are any changes.
            </p>
            <Button onClick={() => { setDone(false); setStep(1); setForm({ doctorId: '', serviceId: '', date: '', startTime: '09:00', firstName: '', lastName: '', phone: '', email: '', dateOfBirth: '', gender: 'MALE' }) }}>
              Book Another
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Book an Appointment</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose your doctor and time — quick and easy</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">1. Select Clinic</CardTitle></CardHeader>
            <CardContent>
              <select className="w-full h-9 px-3 border rounded-md text-sm bg-background" value={clinicId} onChange={(e) => setClinicId(e.target.value)} required>
                {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">2. Choose Doctor & Service</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Doctor</Label>
                <select className="w-full h-9 px-3 border rounded-md text-sm bg-background" value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} required>
                  <option value="">— Select —</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}
                </select>
              </div>
              <div>
                <Label>Service</Label>
                <select className="w-full h-9 px-3 border rounded-md text-sm bg-background" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
                  <option value="">— None —</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.price})</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">3. Pick Date & Time</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">4. Your Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
              <div><Label>Last Name *</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
              <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
              <div>
                <Label>Gender</Label>
                <select className="w-full h-9 px-3 border rounded-md text-sm bg-background" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Confirm Booking
          </Button>
        </form>
      </div>
    </div>
  )
}
