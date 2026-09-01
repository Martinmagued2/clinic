// Lab results view with create form (spec #34)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, FlaskConical, Loader2, X } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { toast } from 'sonner'

type LabResult = {
  id: string
  testName: string
  resultValue: string
  unit: string | null
  referenceRange: string | null
  status: string
  notes: string | null
  reportedAt: string
  patient: { id: string; firstName: string; lastName: string; patientCode: string }
}

type Patient = { id: string; firstName: string; lastName: string; patientCode: string }

const STATUS_COLORS: Record<string, string> = {
  NORMAL: 'bg-green-100 text-green-700',
  ABNORMAL: 'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export function LabResultsView() {
  const { setView, hasPermission } = useApp()
  const [results, setResults] = useState<LabResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    patientId: '',
    testName: '',
    resultValue: '',
    unit: '',
    referenceRange: '',
    status: 'NORMAL',
    notes: '',
  })

  const load = async () => {
    try {
      const data = await api<{ labResults: LabResult[] }>('/api/lab-results')
      setResults(data.labResults)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    api<{ patients: Patient[] }>('/api/patients?pageSize=200').then((d) => setPatients(d.patients)).catch(() => {})
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.patientId || !form.testName || !form.resultValue) {
      toast.error('Patient, test name, and result value are required.')
      return
    }
    setSubmitting(true)
    try {
      await api('/api/lab-results', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          unit: form.unit || null,
          referenceRange: form.referenceRange || null,
          notes: form.notes || null,
        }),
      })
      toast.success('Lab result added.')
      setShowForm(false)
      setForm({ patientId: '', testName: '', resultValue: '', unit: '', referenceRange: '', status: 'NORMAL', notes: '' })
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Lab Results</h2>
        {hasPermission('medical_records.create') && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1.5" /> {showForm ? 'Close' : 'Add Lab Result'}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <form onSubmit={submit} className="p-4 space-y-3">
            <div className="flex justify-between items-center mb-2">
              <CardTitle className="text-base">New Lab Result</CardTitle>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Patient *</Label>
                <select
                  className="w-full h-9 px-3 border rounded-md bg-background text-sm"
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  required
                >
                  <option value="">— Select patient —</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientCode})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Test Name *</Label>
                <Input value={form.testName} onChange={(e) => setForm({ ...form, testName: e.target.value })} placeholder="e.g. Complete Blood Count" required />
              </div>
              <div>
                <Label>Result Value *</Label>
                <Input value={form.resultValue} onChange={(e) => setForm({ ...form, resultValue: e.target.value })} placeholder="e.g. 12.5" required />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. g/dL" />
              </div>
              <div>
                <Label>Reference Range</Label>
                <Input value={form.referenceRange} onChange={(e) => setForm({ ...form, referenceRange: e.target.value })} placeholder="e.g. 11.5-16.5" />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="w-full h-9 px-3 border rounded-md bg-background text-sm"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="ABNORMAL">Abnormal</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Save
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : results.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div>No lab results recorded.</div>
            {hasPermission('medical_records.create') && (
              <div className="text-xs mt-1">Click "Add Lab Result" to create one.</div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Patient</th>
                  <th className="text-left px-4 py-3">Test</th>
                  <th className="text-left px-4 py-3">Result</th>
                  <th className="text-left px-4 py-3">Reference</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer hover:bg-accent/30"
                    onClick={() => setView('patient-detail', r.patient.id)}
                  >
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.reportedAt)}</td>
                    <td className="px-4 py-3 font-medium">{r.patient.firstName} {r.patient.lastName}</td>
                    <td className="px-4 py-3">{r.testName}</td>
                    <td className="px-4 py-3 font-mono">{r.resultValue} {r.unit || ''}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.referenceRange || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[r.status]} variant="secondary">{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
