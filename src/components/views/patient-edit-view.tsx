// Edit patient form (spec #8) — same as new but prefilled

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function PatientEditView() {
  const { viewParam, setView } = useApp()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'MALE',
    phone: '', secondaryPhone: '', email: '', address: '', emergencyContact: '',
    bloodType: '', allergies: '', chronicConditions: '', currentMedications: '',
    previousSurgeries: '', medicalHistory: '', familyHistory: '', status: 'ACTIVE',
  })

  useEffect(() => {
    if (!viewParam) return
    const load = async () => {
      try {
        const data = await api<{ patient: Record<string, unknown> }>(`/api/patients/${viewParam}`)
        const p = data.patient
        setForm({
          firstName: String(p.firstName || ''),
          lastName: String(p.lastName || ''),
          dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth as string).toISOString().slice(0, 10) : '',
          gender: String(p.gender || 'MALE'),
          phone: String(p.phone || ''),
          secondaryPhone: String(p.secondaryPhone || ''),
          email: String(p.email || ''),
          address: String(p.address || ''),
          emergencyContact: String(p.emergencyContact || ''),
          bloodType: String(p.bloodType || ''),
          allergies: String(p.allergies || ''),
          chronicConditions: String(p.chronicConditions || ''),
          currentMedications: String(p.currentMedications || ''),
          previousSurgeries: String(p.previousSurgeries || ''),
          medicalHistory: String(p.medicalHistory || ''),
          familyHistory: String(p.familyHistory || ''),
          status: String(p.status || 'ACTIVE'),
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [viewParam])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api(`/api/patients/${viewParam}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      })
      toast.success('Patient updated.')
      setView('patient-detail', viewParam)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed.')
    } finally {
      setSaving(false)
    }
  }

  const softDelete = async () => {
    if (!confirm('Archive this patient? They will be hidden from the patient list but their records will be preserved.')) return
    try {
      await api(`/api/patients/${viewParam}`, { method: 'DELETE' })
      toast.success('Patient archived.')
      setView('patients')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed.')
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-3">
        <Button variant="ghost" size="sm" onClick={() => setView('patient-detail', viewParam)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        {useApp.getState().hasPermission('patients.delete') && (
          <Button variant="outline" size="sm" onClick={softDelete}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Archive
          </Button>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
            </div>
            <div>
              <Label>Gender</Label>
              <select className="w-full h-9 px-3 border rounded-md bg-background text-sm" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="w-full h-9 px-3 border rounded-md bg-background text-sm" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div><Label>Secondary Phone</Label><Input value={form.secondaryPhone} onChange={(e) => set('secondaryPhone', e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div><Label>Emergency Contact</Label><Input value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Medical Profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Blood Type</Label>
              <select className="w-full h-9 px-3 border rounded-md bg-background text-sm" value={form.bloodType} onChange={(e) => set('bloodType', e.target.value)}>
                <option value="">—</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div><Label>Allergies</Label><Input value={form.allergies} onChange={(e) => set('allergies', e.target.value)} /></div>
            <div><Label>Chronic Conditions</Label><Input value={form.chronicConditions} onChange={(e) => set('chronicConditions', e.target.value)} /></div>
            <div><Label>Current Medications</Label><Input value={form.currentMedications} onChange={(e) => set('currentMedications', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Previous Surgeries</Label><Textarea value={form.previousSurgeries} onChange={(e) => set('previousSurgeries', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Medical History</Label><Textarea value={form.medicalHistory} onChange={(e) => set('medicalHistory', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Family History</Label><Textarea value={form.familyHistory} onChange={(e) => set('familyHistory', e.target.value)} /></div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setView('patient-detail', viewParam)}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
