// Patient profile with tabs (spec #10, #11)

'use client'

import { useEffect, useState, useRef } from 'react'
import { api, ApiError } from '@/lib/api-client'
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
          <TabsTrigger value="portal">Portal Account</TabsTrigger>
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

        <TabsContent value="portal">
          <Card>
            <CardContent className="pt-4">
              <PortalAccountTab patientId={p.id} patientEmail={p.email} />
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

function PortalAccountTab({ patientId, patientEmail }: { patientId: string; patientEmail: string | null }) {
  const { user } = useApp()
  const [account, setAccount] = useState<{ id: string; email: string; status: string; lastLoginAt: string | null; createdAt: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState(patientEmail || '')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canManage = user?.role === 'CLINIC_ADMIN' || user?.role === 'SUPER_ADMIN'

  const load = async () => {
    try {
      const data = await api<{ account: typeof account }>(`/api/patients/${patientId}/portal-account`)
      setAccount(data.account)
      if (data.account) setShowForm(false)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [patientId])

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    try {
      await api(`/api/patients/${patientId}/portal-account`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      toast.success('Portal account created. The patient can now log in.')
      setShowForm(false)
      setPassword('')
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create account.')
    } finally {
      setSubmitting(false)
    }
  }

  const deactivateAccount = async () => {
    if (!confirm('Deactivate this patient\'s portal account? They will no longer be able to log in.')) return
    try {
      await api(`/api/patients/${patientId}/portal-account`, { method: 'DELETE' })
      toast.success('Portal account deactivated.')
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed.')
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Patient Portal Account</div>
      <p className="text-xs text-muted-foreground">
        A portal account lets the patient log in to view their appointments, prescriptions, invoices, and lab results online.
      </p>

      {account ? (
        <div className="border rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{account.email}</div>
              <div className="text-xs text-muted-foreground">
                Status: <span className={account.status === 'ACTIVE' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{account.status}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Created: {formatDate(account.createdAt)}
                {account.lastLoginAt && ` · Last login: ${formatDate(account.lastLoginAt)}`}
              </div>
            </div>
            <Badge variant={account.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {account.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {canManage && account.status === 'ACTIVE' && (
            <Button size="sm" variant="outline" onClick={deactivateAccount}>
              Deactivate Account
            </Button>
          )}
          <div className="bg-muted/30 rounded p-3 text-xs">
            <div className="font-medium mb-1">How the patient logs in:</div>
            <div>1. Go to the Patient Portal page (sidebar → More → Patient Portal)</div>
            <div>2. Enter their email: <code>{account.email}</code></div>
            <div>3. Enter the password you set for them</div>
          </div>
        </div>
      ) : showForm ? (
        <form onSubmit={createAccount} className="border rounded-md p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Email (patient&apos;s login)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-9 px-3 border rounded-md text-sm bg-background"
              placeholder="patient@email.com"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Temporary password (min 8 chars)</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full h-9 px-3 border rounded-md text-sm bg-background font-mono"
              placeholder="Set a password for the patient"
            />
            <p className="text-[10px] text-muted-foreground mt-1">The patient can change this after logging in.</p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Account'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      ) : canManage ? (
        <div className="border rounded-md p-4 text-center">
          <div className="text-sm text-muted-foreground mb-3">No portal account yet.</div>
          <Button size="sm" onClick={() => setShowForm(true)}>
            Create Portal Account
          </Button>
        </div>
      ) : (
        <div className="border rounded-md p-4 text-center text-sm text-muted-foreground">
          No portal account. Ask a clinic admin to create one.
        </div>
      )}
    </div>
  )
}
