// Patient profile with tabs (spec #10, #11)

'use client'

import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Phone, Mail, MapPin, AlertTriangle, FileText } from 'lucide-react'
import { calcAge, formatDate, formatDateTime, formatCurrency } from '@/lib/format'
import { toast } from 'sonner'

type PatientDetail = {
  patient: {
    id: string
    patientCode: string
    firstName: string
    lastName: string
    dateOfBirth: string | null
    gender: string | null
    phone: string | null
    secondaryPhone: string | null
    email: string | null
    address: string | null
    emergencyContact: string | null
    bloodType: string | null
    allergies: string | null
    chronicConditions: string | null
    currentMedications: string | null
    previousSurgeries: string | null
    medicalHistory: string | null
    familyHistory: string | null
    status: string
    appointments: Array<{ id: string; date: string; startTime: string; status: string; doctor: { name: string }; service: { name: string } | null }>
    visits: Array<{ id: string; chiefComplaint: string | null; diagnosis: string | null; createdAt: string; doctor: { name: string }; status: string }>
    prescriptions: Array<{ id: string; prescriptionCode: string; createdAt: string; doctor: { name: string }; items: Array<{ medicationName: string; dosage: string | null; frequency: string | null }> }>
    invoices: Array<{ id: string; invoiceCode: string; total: number; status: string; createdAt: string; payments: Array<{ amount: number }> }>
  }
}

type TimelineEvent = {
  type: string
  date: string
  title: string
  description: string
}

export function PatientDetailView() {
  const { viewParam, setView } = useApp()
  const [data, setData] = useState<PatientDetail | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!viewParam) return
    let cancelled = false
    const load = async () => {
      try {
        const [d, t] = await Promise.all([
          api<PatientDetail>(`/api/patients/${viewParam}`),
          api<{ events: TimelineEvent[] }>(`/api/patients/${viewParam}/timeline`),
        ])
        if (!cancelled) {
          setData(d)
          setTimeline(t.events)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [viewParam])

  if (loading) return <div className="p-6 text-muted-foreground">Loading patient...</div>
  if (!data) return <div className="p-6 text-muted-foreground">Patient not found.</div>

  const p = data.patient

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setView('patients')}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{p.firstName} {p.lastName}</h2>
              <div className="text-sm text-muted-foreground mt-1 space-x-3">
                <span>{p.patientCode}</span>
                <span>· {calcAge(p.dateOfBirth) ?? '—'} years</span>
                <span>· {p.gender || '—'}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {useApp.getState().hasPermission('patients.update') && (
                <Button variant="outline" size="sm" onClick={() => setView('patient-edit', p.id)}>
                  Edit
                </Button>
              )}
              {useApp.getState().hasPermission('appointments.create') && (
                <Button variant="outline" size="sm" onClick={() => setView('appointment-new', p.id)}>
                  Book Appointment
                </Button>
              )}
              {useApp.getState().hasPermission('billing.create') && (
                <Button variant="outline" size="sm" onClick={() => setView('invoice-new', p.id)}>
                  Create Invoice
                </Button>
              )}
              {useApp.getState().hasPermission('medical_records.create') && (
                <Button variant="outline" size="sm" onClick={() => setView('visit-new', p.id)}>
                  New Visit
                </Button>
              )}
              {useApp.getState().hasPermission('patients.view') && (
                <Button variant="outline" size="sm" onClick={() => setView('documents', p.id)}>
                  Documents
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              {p.phone || '—'}
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              {p.email || '—'}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              {p.address || '—'}
            </div>
          </div>

          {p.allergies && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Allergies:</span> {p.allergies}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="appointments">Appointments ({p.appointments.length})</TabsTrigger>
          <TabsTrigger value="visits">Visits ({p.visits.length})</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions ({p.prescriptions.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({p.invoices.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Field label="Blood Type" value={p.bloodType} />
              <Field label="Emergency Contact" value={p.emergencyContact} />
              <Field label="Status" value={p.status} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical">
          <Card>
            <CardHeader><CardTitle>Medical Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Field label="Allergies" value={p.allergies} />
              <Field label="Chronic Conditions" value={p.chronicConditions} />
              <Field label="Current Medications" value={p.currentMedications} />
              <Field label="Previous Surgeries" value={p.previousSurgeries} />
              <Field label="Medical History" value={p.medicalHistory} />
              <Field label="Family History" value={p.familyHistory} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardContent className="pt-4">
              {p.appointments.length === 0 ? (
                <Empty text="No appointments." />
              ) : (
                <div className="divide-y">
                  {p.appointments.map((a) => (
                    <div key={a.id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{formatDate(a.date)} at {a.startTime}</div>
                        <div className="text-xs text-muted-foreground">{a.doctor.name} · {a.service?.name ?? '—'}</div>
                      </div>
                      <Badge variant="secondary">{a.status.replace(/_/g, ' ')}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits">
          <Card>
            <CardContent className="pt-4">
              {p.visits.length === 0 ? (
                <Empty text="No visits recorded." />
              ) : (
                <div className="space-y-3">
                  {p.visits.map((v) => (
                    <div key={v.id} className="border-l-2 border-primary/50 pl-3 py-1">
                      <div className="text-sm font-medium">{formatDate(v.createdAt)} — {v.doctor.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {v.chiefComplaint || 'No chief complaint recorded.'}
                      </div>
                      {v.diagnosis && <div className="text-xs mt-1"><b>Dx:</b> {v.diagnosis}</div>}
                      <Badge variant="outline" className="mt-1 text-xs">{v.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions">
          <Card>
            <CardContent className="pt-4">
              {p.prescriptions.length === 0 ? (
                <Empty text="No prescriptions." />
              ) : (
                <div className="space-y-3">
                  {p.prescriptions.map((rx) => (
                    <div key={rx.id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="font-medium">{rx.prescriptionCode}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(rx.createdAt)}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{rx.doctor.name}</div>
                      <div className="mt-2 space-y-1">
                        {rx.items.map((it, i) => (
                          <div key={i} className="text-sm">
                            <span className="font-medium">{it.medicationName}</span>
                            <span className="text-muted-foreground"> — {it.dosage} · {it.frequency}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="pt-4">
              {p.invoices.length === 0 ? (
                <Empty text="No invoices." />
              ) : (
                <div className="divide-y">
                  {p.invoices.map((i) => {
                    const paid = i.payments.reduce((s, pmt) => s + pmt.amount, 0)
                    return (
                      <div
                        key={i.id}
                        className="py-2 flex items-center justify-between text-sm cursor-pointer hover:bg-accent/50 px-2 -mx-2 rounded"
                        onClick={() => setView('invoice-detail', i.id)}
                      >
                        <div>
                          <div className="font-medium">{i.invoiceCode}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(i.createdAt)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(i.total)}</div>
                          <Badge variant={i.status === 'PAID' ? 'default' : 'secondary'} className="text-xs">
                            {i.status.replace(/_/g, ' ')}
                          </Badge>
                          {paid < i.total && <div className="text-xs text-muted-foreground mt-0.5">Paid: {formatCurrency(paid)}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="pt-4">
              {timeline.length === 0 ? (
                <Empty text="No timeline events." />
              ) : (
                <div className="space-y-3">
                  {timeline.map((e, i) => (
                    <div key={i} className="border-l-2 border-primary/30 pl-3 py-1">
                      <div className="text-xs text-muted-foreground">{formatDateTime(e.date)}</div>
                      <div className="text-sm font-medium">{e.title}</div>
                      <div className="text-xs text-muted-foreground">{e.description}</div>
                      <Badge variant="outline" className="text-xs mt-1">{e.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="pt-4">
              <DocumentsTab patientId={p.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || '—'}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-8 text-sm text-muted-foreground">{text}</div>
}

function DocumentsTab({ patientId }: { patientId: string }) {
  const [docs, setDocs] = useState<Array<{ id: string; fileName: string; fileType: string; category: string; createdAt: string; uploadedBy: { name: string } }>>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const data = await api<{ documents: typeof docs }>(`/api/documents?patientId=${patientId}`)
      setDocs(data.documents)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [patientId])

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('patientId', patientId)
      fd.append('category', 'OTHER')
      await fetch('/api/documents', { method: 'POST', body: fd, credentials: 'same-origin' })
      toast.success('Document uploaded.')
      load()
    } catch {
      toast.error('Upload failed.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">Patient Documents</div>
        <div>
          <input ref={fileRef} type="file" onChange={upload} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx" />
          <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </div>
      {docs.length === 0 ? (
        <Empty text="No documents uploaded." />
      ) : (
        <div className="divide-y">
          {docs.map((d) => (
            <div key={d.id} className="py-2 flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <a
                  href={`/api/documents/${d.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium hover:underline truncate block"
                >
                  {d.fileName}
                </a>
                <div className="text-xs text-muted-foreground">
                  {d.category} · {formatDate(d.createdAt)} · {d.uploadedBy.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
