// Create prescription from within a visit (spec #23)
// Used both for creating new prescriptions and as a "New Prescription" page.

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Doctor = { id: string; name: string; specialty: string }
type Patient = { id: string; firstName: string; lastName: string; patientCode: string }
type Medication = { id: string; name: string; strength: string | null; form: string | null }
type Visit = { id: string; patientId: string; doctorId: string; patient: { firstName: string; lastName: string }; doctor: { name: string } }

type Item = {
  medicationId?: string
  medicationName: string
  strength: string
  dosage: string
  frequency: string
  duration: string
  route: string
  instructions: string
}

export function PrescriptionNewView() {
  const { viewParam, setView } = useApp()
  // viewParam can be a visitId (when triggered from visit) or null (manual creation)
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [visitId, setVisitId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [warnings, setWarnings] = useState<Array<{ type: string; severity: string; message: string }>>([])
  const [checking, setChecking] = useState(false)
  const [items, setItems] = useState<Item[]>([
    { medicationName: '', strength: '', dosage: '', frequency: '', duration: '', route: 'Oral', instructions: '' },
  ])

  useEffect(() => {
    const load = async () => {
      try {
        const [p, d, m] = await Promise.all([
          api<{ patients: Patient[] }>('/api/patients?pageSize=200'),
          api<{ doctors: Doctor[] }>('/api/doctors'),
          api<{ medications: Medication[] }>('/api/medications'),
        ])
        setPatients(p.patients)
        setDoctors(d.doctors)
        setMedications(m.medications)

        // If viewParam is a visit, prefill patient + doctor
        if (viewParam) {
          try {
            const v = await api<{ visit: Visit }>(`/api/visits/${viewParam}`)
            setVisitId(v.visit.id)
            setPatientId(v.visit.patientId)
            setDoctorId(v.visit.doctorId)
          } catch {
            // not a visit — treat as patient id for defaulting
            setPatientId(viewParam)
          }
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [viewParam])

  const addItem = () => setItems([...items, { medicationName: '', strength: '', dosage: '', frequency: '', duration: '', route: 'Oral', instructions: '' }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const pickMedication = (idx: number, medicationId: string) => {
    if (!medicationId) {
      updateItem(idx, { medicationId: undefined, medicationName: '', strength: '' })
      return
    }
    const m = medications.find((x) => x.id === medicationId)
    if (m) updateItem(idx, { medicationId: m.id, medicationName: m.name, strength: m.strength || '' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !doctorId) {
      toast.error('Please select patient and doctor.')
      return
    }
    if (items.length === 0 || !items[0].medicationName) {
      toast.error('Please add at least one medication.')
      return
    }
    setSubmitting(true)
    try {
      const result = await api<{ prescription: { id: string } }>('/api/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          doctorId,
          visitId: visitId || null,
          notes: notes || null,
          items: items.map((i) => ({
            medicationId: i.medicationId || null,
            medicationName: i.medicationName,
            strength: i.strength || null,
            dosage: i.dosage || null,
            frequency: i.frequency || null,
            duration: i.duration || null,
            route: i.route || null,
            instructions: i.instructions || null,
          })),
        }),
      })
      toast.success('Prescription created.')
      // Open printable prescription in new tab
      window.open(`/api/print/prescription/${result.prescription.id}`, '_blank')
      setView('prescriptions')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => setView('prescriptions')}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
      </Button>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>{visitId ? 'Prescription from Visit' : 'New Prescription'}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Patient *</Label>
              <select className="w-full h-9 px-3 border rounded-md bg-background text-sm" value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
                <option value="">— Select patient —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientCode})</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Doctor *</Label>
              <select className="w-full h-9 px-3 border rounded-md bg-background text-sm" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
                <option value="">— Select doctor —</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Medications</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus className="w-3 h-3 mr-1" /> Add Medication
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="border rounded-md p-3 space-y-2 relative">
                {items.length > 1 && (
                  <Button type="button" size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => removeItem(idx)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
                <div>
                  <Label className="text-xs">Medication (pick from catalog or type custom)</Label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 h-9 px-3 border rounded-md text-sm bg-background"
                      value={it.medicationId || ''}
                      onChange={(e) => pickMedication(idx, e.target.value)}
                    >
                      <option value="">— From catalog —</option>
                      {medications.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} {m.strength}</option>
                      ))}
                    </select>
                    <Input
                      placeholder="Or type name"
                      value={it.medicationName}
                      onChange={(e) => updateItem(idx, { medicationName: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Input placeholder="Strength (e.g. 500mg)" value={it.strength} onChange={(e) => updateItem(idx, { strength: e.target.value })} />
                  <Input placeholder="Dosage (e.g. 1 tablet)" value={it.dosage} onChange={(e) => updateItem(idx, { dosage: e.target.value })} />
                  <Input placeholder="Frequency (e.g. Every 8h)" value={it.frequency} onChange={(e) => updateItem(idx, { frequency: e.target.value })} />
                  <Input placeholder="Duration (e.g. 5 days)" value={it.duration} onChange={(e) => updateItem(idx, { duration: e.target.value })} />
                  <Input placeholder="Route (e.g. Oral)" value={it.route} onChange={(e) => updateItem(idx, { route: e.target.value })} />
                  <Input placeholder="Instructions" value={it.instructions} onChange={(e) => updateItem(idx, { instructions: e.target.value })} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Drug interaction & allergy check */}
        {patientId && items.some((i) => i.medicationName) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Safety Check</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={checking || !patientId}
                onClick={async () => {
                  setChecking(true); setWarnings([])
                  try {
                    const allWarnings: typeof warnings = []
                    for (const item of items) {
                      if (!item.medicationName) continue
                      const result = await api<{ warnings: typeof warnings; safe: boolean }>('/api/drug-interactions', {
                        method: 'POST',
                        body: JSON.stringify({ patientId, medicationName: item.medicationName }),
                      })
                      allWarnings.push(...result.warnings)
                    }
                    setWarnings(allWarnings)
                    if (allWarnings.length === 0) toast.success('No interactions or allergies detected.')
                    else toast.warning(`${allWarnings.length} safety warning(s) found.`)
                  } catch (err) {
                    toast.error(err instanceof ApiError ? err.message : 'Check failed.')
                  } finally {
                    setChecking(false)
                  }
                }}
              >
                {checking ? 'Checking...' : 'Check Interactions & Allergies'}
              </Button>
              {warnings.length > 0 && (
                <div className="space-y-1">
                  {warnings.map((w, i) => (
                    <div key={i} className={`text-xs p-2 rounded border ${w.severity === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-700' : w.severity === 'HIGH' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                      <strong>{w.type}:</strong> {w.message}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for the patient..." />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setView('prescriptions')}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Create & Print
          </Button>
        </div>
      </form>
    </div>
  )
}
