// Visits list + create form (spec #19, #20, #21, #22)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, ArrowLeft, Loader2, Stethoscope } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'

type Visit = {
  id: string
  chiefComplaint: string | null
  diagnosis: string | null
  status: string
  createdAt: string
  patient: { id: string; firstName: string; lastName: string; patientCode: string }
  doctor: { name: string }
}

type Doctor = { id: string; name: string; specialty: string }
type Patient = { id: string; firstName: string; lastName: string; patientCode: string }

export function VisitsView() {
  const { setView, hasPermission, user } = useApp()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [doctorFilter, setDoctorFilter] = useState<string>(user?.role === 'DOCTOR' && user.doctorId ? user.doctorId : '')
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const url = `/api/visits${doctorFilter ? `?doctorId=${doctorFilter}` : ''}`
        const data = await api<{ visits: Visit[] }>(url)
        if (!cancelled) setVisits(data.visits)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    api<{ doctors: { id: string; name: string }[] }>('/api/doctors').then((d) => setDoctors(d.doctors)).catch(() => {})
    return () => { cancelled = true }
  }, [doctorFilter])

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Recent Visits</h2>
          {user?.role !== 'DOCTOR' && (
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
          )}
        </div>
        {hasPermission('medical_records.create') && (
          <Button onClick={() => setView('visit-new')}>
            <Plus className="w-4 h-4 mr-1.5" /> New Visit
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div>No visits recorded.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visits.map((v) => (
            <Card
              key={v.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setView('visit-detail', v.id)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={v.status === 'COMPLETED' ? 'default' : 'secondary'}>
                    {v.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(v.createdAt)}</span>
                </div>
                <div className="font-medium">{v.patient.firstName} {v.patient.lastName}</div>
                <div className="text-xs text-muted-foreground">{v.patient.patientCode} · {v.doctor.name}</div>
                {v.chiefComplaint && (
                  <div className="text-sm mt-2 text-muted-foreground line-clamp-2">
                    <b>CC:</b> {v.chiefComplaint}
                  </div>
                )}
                {v.diagnosis && (
                  <div className="text-sm mt-1 text-muted-foreground line-clamp-2">
                    <b>Dx:</b> {v.diagnosis}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export function VisitNewView() {
  const { viewParam, setView } = useApp()
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    patientId: viewParam || '',
    doctorId: '',
    chiefComplaint: '',
    symptoms: '',
    examination: '',
    assessment: '',
    diagnosis: '',
    treatmentPlan: '',
    followUpDate: '',
  })
  const [createInvoice, setCreateInvoice] = useState(false)
  const [aiNotes, setAiNotes] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [vitals, setVitals] = useState({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    weight: '',
    height: '',
    oxygenSaturation: '',
  })

  useEffect(() => {
    const load = async () => {
      try {
        const [p, d] = await Promise.all([
          api<{ patients: Patient[] }>('/api/patients?pageSize=200'),
          api<{ doctors: Doctor[] }>('/api/doctors'),
        ])
        setPatients(p.patients)
        setDoctors(d.doctors)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.patientId || !form.doctorId) {
      toast.error('Please select patient and doctor.')
      return
    }
    setSubmitting(true)
    try {
      const vitalsPayload = {
        bloodPressure: vitals.bloodPressure || null,
        heartRate: vitals.heartRate ? Number(vitals.heartRate) : null,
        temperature: vitals.temperature ? Number(vitals.temperature) : null,
        weight: vitals.weight ? Number(vitals.weight) : null,
        height: vitals.height ? Number(vitals.height) : null,
        oxygenSaturation: vitals.oxygenSaturation ? Number(vitals.oxygenSaturation) : null,
      }
      const hasVitals = Object.values(vitalsPayload).some((v) => v !== null && v !== '')
      await api('/api/visits', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          followUpDate: form.followUpDate || null,
          status: 'COMPLETED',
          createInvoice,
          vitals: hasVitals ? vitalsPayload : undefined,
        }),
      })
      toast.success('Visit recorded successfully.')
      setView('visits')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to record visit.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => setView('visits')}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
      </Button>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Patient & Doctor</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Patient *</Label>
              <select
                className="w-full h-9 px-3 border rounded-md bg-background text-sm"
                value={form.patientId}
                onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
                required
              >
                <option value="">— Select patient —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientCode})</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Doctor *</Label>
              <select
                className="w-full h-9 px-3 border rounded-md bg-background text-sm"
                value={form.doctorId}
                onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
                required
              >
                <option value="">— Select doctor —</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vital Signs</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Blood Pressure</Label>
              <Input placeholder="120/80" value={vitals.bloodPressure} onChange={(e) => setVitals((v) => ({ ...v, bloodPressure: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Heart Rate (bpm)</Label>
              <Input type="number" value={vitals.heartRate} onChange={(e) => setVitals((v) => ({ ...v, heartRate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Temperature (°C)</Label>
              <Input type="number" step="0.1" value={vitals.temperature} onChange={(e) => setVitals((v) => ({ ...v, temperature: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Weight (kg)</Label>
              <Input type="number" step="0.1" value={vitals.weight} onChange={(e) => setVitals((v) => ({ ...v, weight: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Height (cm)</Label>
              <Input type="number" value={vitals.height} onChange={(e) => setVitals((v) => ({ ...v, height: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">O2 Sat (%)</Label>
              <Input type="number" value={vitals.oxygenSaturation} onChange={(e) => setVitals((v) => ({ ...v, oxygenSaturation: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>AI Documentation Assistant</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Label>Raw Notes (type or dictate — AI will structure them)</Label>
            <Textarea value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} rows={3} placeholder="e.g. Patient complains of headache for 3 days, no fever. BP 130/85. Likely tension headache. Prescribe paracetamol, rest." />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={aiLoading || aiNotes.length < 10}
              onClick={async () => {
                setAiLoading(true)
                try {
                  const result = await api<{ structured: { chiefComplaint: string; symptoms: string; examination: string; assessment: string; diagnosis: string; treatmentPlan: string } }>('/api/ai/suggest', {
                    method: 'POST',
                    body: JSON.stringify({ rawNotes: aiNotes }),
                  })
                  setForm((f) => ({
                    ...f,
                    chiefComplaint: result.structured.chiefComplaint || f.chiefComplaint,
                    symptoms: result.structured.symptoms || f.symptoms,
                    examination: result.structured.examination || f.examination,
                    assessment: result.structured.assessment || f.assessment,
                    diagnosis: result.structured.diagnosis || f.diagnosis,
                    treatmentPlan: result.structured.treatmentPlan || f.treatmentPlan,
                  }))
                  toast.success('AI structured your notes.')
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : 'AI service unavailable.')
                } finally {
                  setAiLoading(false)
                }
              }}
            >
              {aiLoading ? 'AI analyzing...' : '✨ Structure with AI'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Clinical Notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Chief Complaint</Label>
              <Textarea value={form.chiefComplaint} onChange={(e) => setForm((f) => ({ ...f, chiefComplaint: e.target.value }))} />
            </div>
            <div>
              <Label>Symptoms</Label>
              <Textarea value={form.symptoms} onChange={(e) => setForm((f) => ({ ...f, symptoms: e.target.value }))} />
            </div>
            <div>
              <Label>Examination</Label>
              <Textarea value={form.examination} onChange={(e) => setForm((f) => ({ ...f, examination: e.target.value }))} />
            </div>
            <div>
              <Label>Assessment</Label>
              <Textarea value={form.assessment} onChange={(e) => setForm((f) => ({ ...f, assessment: e.target.value }))} />
            </div>
            <div>
              <Label>Diagnosis</Label>
              <Textarea value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} />
            </div>
            <div>
              <Label>Treatment Plan</Label>
              <Textarea value={form.treatmentPlan} onChange={(e) => setForm((f) => ({ ...f, treatmentPlan: e.target.value }))} />
            </div>
            <div>
              <Label>Follow-up Date</Label>
              <Input type="date" value={form.followUpDate} onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <input
              type="checkbox"
              id="createInvoice"
              checked={createInvoice}
              onChange={(e) => setCreateInvoice(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="createInvoice" className="text-sm cursor-pointer">
              Generate invoice automatically after visit (using doctor&apos;s consultation fee)
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setView('visits')}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Save Visit
          </Button>
        </div>
      </form>
    </div>
  )
}
