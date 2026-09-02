// Patient Portal — enhanced with welcome card, booking, messages, refills, profile

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { HeartPulse, ArrowLeft, Calendar, Pill, Receipt, FlaskConical, MessageSquare, FileText, User, Download, RefreshCw, Plus } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/format'
import { toast } from 'sonner'

type PatientUser = { id: string; firstName: string; lastName: string; patientCode: string }

export function PatientPortalView() {
  const { setView } = useApp()
  const [patient, setPatient] = useState<PatientUser | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    const restore = async () => {
      try { const data = await api<{ patient: PatientUser }>('/api/patient-portal/auth'); setPatient(data.patient) } catch { /* not logged in */ } finally { setBootstrapping(false) }
    }
    restore()
  }, [])

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true)
    try { const data = await api<{ patient: PatientUser }>('/api/patient-portal/auth', { method: 'POST', body: JSON.stringify({ email, password }) }); setPatient(data.patient) } catch (err) { setError(err instanceof ApiError ? err.message : 'Login failed.') } finally { setLoading(false) }
  }

  const logout = async () => { await api('/api/patient-portal/auth', { method: 'DELETE' }); setPatient(null); setEmail(''); setPassword('') }

  if (bootstrapping) return <div className="min-h-screen flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setView('dashboard')}><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to App</Button>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4"><HeartPulse className="w-9 h-9 text-primary-foreground" /></div>
            <h1 className="text-2xl font-bold">Patient Portal</h1>
            <p className="text-muted-foreground mt-1">View your medical records</p>
          </div>
          <form onSubmit={login} className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full">{loading ? 'Signing in...' : 'Sign In'}</Button>
          </form>
          <div className="mt-4 text-xs text-muted-foreground text-center">Demo: ahmed.ali@patient.portal / patient123</div>
        </div>
      </div>
    )
  }

  return <PatientDashboard patient={patient} onLogout={logout} onBack={() => setView('dashboard')} />
}

function PatientDashboard({ patient, onLogout, onBack }: { patient: PatientUser; onLogout: () => void; onBack: () => void }) {
  const [tab, setTab] = useState<'overview' | 'appointments' | 'prescriptions' | 'invoices' | 'lab-results' | 'messages' | 'documents' | 'profile'>('overview')
  const [data, setData] = useState<Record<string, unknown[]> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [a, p, i, l, m, d] = await Promise.all([
          api<{ appointments: unknown[] }>('/api/patient-portal/appointments'),
          api<{ prescriptions: unknown[] }>('/api/patient-portal/prescriptions'),
          api<{ invoices: unknown[] }>('/api/patient-portal/invoices'),
          api<{ labResults: unknown[] }>('/api/patient-portal/lab-results'),
          api<{ messages: unknown[] }>('/api/patient-portal/messages'),
          api<{ documents: unknown[] }>('/api/patient-portal/documents'),
        ])
        setData({ appointments: a.appointments || [], prescriptions: p.prescriptions || [], invoices: i.invoices || [], labResults: l.labResults || [], messages: m.messages || [], documents: d.documents || [] })
      } catch { /* ignore */ } finally { setLoading(false) }
    }
    load()
  }, [])

  const tabs = [
    { key: 'overview', label: 'Overview', icon: HeartPulse },
    { key: 'appointments', label: 'Appointments', icon: Calendar, count: data?.appointments?.length || 0 },
    { key: 'prescriptions', label: 'Prescriptions', icon: Pill, count: data?.prescriptions?.length || 0 },
    { key: 'invoices', label: 'Invoices', icon: Receipt, count: data?.invoices?.length || 0 },
    { key: 'lab-results', label: 'Lab Results', icon: FlaskConical, count: data?.labResults?.length || 0 },
    { key: 'messages', label: 'Messages', icon: MessageSquare, count: data?.messages?.length || 0 },
    { key: 'documents', label: 'Documents', icon: FileText, count: data?.documents?.length || 0 },
    { key: 'profile', label: 'Profile', icon: User },
  ] as const

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><HeartPulse className="w-6 h-6 text-primary" /><div><div className="font-semibold">Patient Portal</div><div className="text-xs text-muted-foreground">{patient.firstName} {patient.lastName} · {patient.patientCode}</div></div></div>
          <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to App</Button><Button variant="outline" size="sm" onClick={onLogout}>Logout</Button></div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 lg:p-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm ${tab === key ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}>
              <Icon className="w-4 h-4" /> {label}{count !== undefined && count > 0 && <span className="ml-1 text-xs opacity-75">({count})</span>}
            </button>
          ))}
        </div>

        {loading ? <div className="text-center py-12 text-muted-foreground">Loading your records...</div> : (
          <>
            {tab === 'overview' && <OverviewTab data={data} patient={patient} onBook={() => setTab('appointments')} />}
            {tab === 'appointments' && <AppointmentsTab appointments={data?.appointments || []} />}
            {tab === 'prescriptions' && <PrescriptionsTab prescriptions={data?.prescriptions || []} />}
            {tab === 'invoices' && <InvoicesTab invoices={data?.invoices || []} />}
            {tab === 'lab-results' && <LabResultsTab results={data?.labResults || []} />}
            {tab === 'messages' && <MessagesTab />}
            {tab === 'documents' && <DocumentsTab documents={data?.documents || []} />}
            {tab === 'profile' && <ProfileTab />}
          </>
        )}
      </main>
    </div>
  )
}

function OverviewTab({ data, patient, onBook }: { data: Record<string, unknown[]> | null; patient: PatientUser; onBook: () => void }) {
  const appts = (data?.appointments || []) as Array<{ date: string; startTime: string; status: string; doctor: { name: string } }>
  const upcoming = appts.filter((a) => new Date(a.date) >= new Date() && a.status === 'SCHEDULED')
  const invoices = (data?.invoices || []) as Array<{ total: number; paidAmount: number; status: string }>
  const outstanding = invoices.reduce((s, i) => s + Math.max(0, i.total - i.paidAmount), 0)
  const rx = (data?.prescriptions || []) as unknown[]

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">Hello, {patient.firstName}!</div>
          <p className="text-sm text-muted-foreground mt-1">Here&apos;s your health summary</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-card rounded-lg p-3 border"><div className="text-xs text-muted-foreground">Next Appointment</div><div className="font-medium text-sm mt-1">{upcoming.length > 0 ? `${formatDate(upcoming[0].date)} at ${upcoming[0].startTime}` : 'None'}</div></div>
            <div className="bg-card rounded-lg p-3 border"><div className="text-xs text-muted-foreground">Outstanding Balance</div><div className="font-medium text-sm mt-1">{formatCurrency(outstanding)}</div></div>
            <div className="bg-card rounded-lg p-3 border"><div className="text-xs text-muted-foreground">Prescriptions</div><div className="font-medium text-sm mt-1">{rx.length}</div></div>
            <div className="bg-card rounded-lg p-3 border"><div className="text-xs text-muted-foreground">Total Visits</div><div className="font-medium text-sm mt-1">{appts.filter((a) => a.status === 'COMPLETED').length}</div></div>
          </div>
          <Button className="mt-4" onClick={onBook}><Plus className="w-4 h-4 mr-1.5" /> Book Appointment</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function AppointmentsTab({ appointments }: { appointments: unknown[] }) {
  const [showBook, setShowBook] = useState(false)
  const appts = appointments as Array<{ id: string; date: string; startTime: string; endTime: string; status: string; doctor: { name: string; specialty: string }; service: { name: string } | null }>
  return (
    <Card>
      <CardHeader><div className="flex justify-between items-center"><CardTitle className="text-base">Your Appointments</CardTitle><Button size="sm" onClick={() => setShowBook(!showBook)}><Plus className="w-3 h-3 mr-1" /> Book</Button></div></CardHeader>
      <CardContent>
        {showBook && <BookAppointmentForm onDone={() => setShowBook(false)} />}
        {appts.length === 0 ? <div className="text-center py-8 text-sm text-muted-foreground">No appointments found.</div> : (
          <div className="divide-y">{appts.map((a) => (
            <div key={a.id} className="py-3 flex items-center justify-between">
              <div><div className="font-medium text-sm">{formatDate(a.date)} at {a.startTime}</div><div className="text-xs text-muted-foreground">{a.doctor.name} ({a.doctor.specialty}) · {a.service?.name ?? 'Appointment'}</div></div>
              <Badge variant="secondary">{a.status.replace(/_/g, ' ')}</Badge>
            </div>
          ))}</div>
        )}
      </CardContent>
    </Card>
  )
}

function BookAppointmentForm({ onDone }: { onDone: () => void }) {
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; specialty: string }>>([])
  const [services, setServices] = useState<Array<{ id: string; name: string; price: number; duration: number }>>([])
  const [form, setForm] = useState({ doctorId: '', serviceId: '', date: '', startTime: '09:00' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api<{ doctors: typeof doctors; services: typeof services }>('/api/patient-portal/book').then((d) => { setDoctors(d.doctors); setServices(d.services) }).catch(() => {})
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const service = services.find((s) => s.id === form.serviceId)
      const duration = service?.duration || 30
      const [h, m] = form.startTime.split(':').map(Number)
      const endMin = h * 60 + m + duration
      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
      await api('/api/patient-portal/book', { method: 'POST', body: JSON.stringify({ ...form, endTime }) })
      toast.success('Appointment booked!')
      onDone()
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Failed.') } finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={submit} className="border rounded-md p-3 mb-3 grid grid-cols-2 gap-2">
      <select className="h-9 px-2 border rounded text-sm bg-background" value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} required><option value="">Doctor</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      <select className="h-9 px-2 border rounded text-sm bg-background" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}><option value="">Service (optional)</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <input type="date" className="h-9 px-2 border rounded text-sm bg-background" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required min={new Date().toISOString().slice(0, 10)} />
      <input type="time" className="h-9 px-2 border rounded text-sm bg-background" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
      <Button type="submit" size="sm" disabled={submitting} className="col-span-2">{submitting ? 'Booking...' : 'Confirm Booking'}</Button>
    </form>
  )
}

function PrescriptionsTab({ prescriptions }: { prescriptions: unknown[] }) {
  const rx = prescriptions as Array<{ id: string; prescriptionCode: string; createdAt: string; doctor: { name: string }; items: Array<{ medicationName: string; strength: string | null; dosage: string | null; frequency: string | null; duration: string | null }> }>
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Your Prescriptions</CardTitle></CardHeader>
      <CardContent>
        {rx.length === 0 ? <div className="text-center py-8 text-sm text-muted-foreground">No prescriptions found.</div> : (
          <div className="space-y-3">{rx.map((r) => (
            <div key={r.id} className="border rounded-md p-3">
              <div className="flex justify-between text-sm"><span className="font-mono font-medium">{r.prescriptionCode}</span><span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span></div>
              <div className="text-xs text-muted-foreground mb-2">By {r.doctor.name}</div>
              <div className="space-y-1">{r.items.map((it, i) => <div key={i} className="text-sm bg-muted/30 rounded p-2"><span className="font-medium">{it.medicationName}</span> {it.strength}<div className="text-xs text-muted-foreground">{it.dosage} · {it.frequency} · {it.duration}</div></div>)}</div>
              <div className="flex gap-2 mt-2">
                <a href={`/api/print/prescription/${r.id}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><Download className="w-3 h-3 mr-1" /> PDF</Button></a>
                <RefillButton prescriptionId={r.id} />
              </div>
            </div>
          ))}</div>
        )}
      </CardContent>
    </Card>
  )
}

function RefillButton({ prescriptionId }: { prescriptionId: string }) {
  const [loading, setLoading] = useState(false)
  const request = async () => {
    setLoading(true)
    try { await api('/api/patient-portal/refills', { method: 'POST', body: JSON.stringify({ prescriptionId }) }); toast.success('Refill requested.') } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Failed.') } finally { setLoading(false) }
  }
  return <Button size="sm" variant="outline" disabled={loading} onClick={request}><RefreshCw className="w-3 h-3 mr-1" /> {loading ? 'Requesting...' : 'Refill'}</Button>
}

function InvoicesTab({ invoices }: { invoices: unknown[] }) {
  const inv = invoices as Array<{ id: string; invoiceCode: string; total: number; paidAmount: number; status: string; createdAt: string; items: unknown[]; payments: unknown[] }>
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Your Invoices</CardTitle></CardHeader>
      <CardContent>
        {inv.length === 0 ? <div className="text-center py-8 text-sm text-muted-foreground">No invoices found.</div> : (
          <div className="divide-y">{inv.map((i) => (
            <div key={i.id} className="py-3 flex items-center justify-between">
              <div><div className="font-mono text-sm font-medium">{i.invoiceCode}</div><div className="text-xs text-muted-foreground">{formatDate(i.createdAt)} · {i.items.length} item(s)</div></div>
              <div className="text-right"><div className="font-medium text-sm">{formatCurrency(i.total)}</div><div className="text-xs text-muted-foreground">Paid: {formatCurrency(i.paidAmount)}</div><Badge variant={i.status === 'PAID' ? 'default' : 'secondary'} className="text-xs mt-1">{i.status.replace(/_/g, ' ')}</Badge></div>
            </div>
          ))}</div>
        )}
      </CardContent>
    </Card>
  )
}

function LabResultsTab({ results }: { results: unknown[] }) {
  const lr = results as Array<{ id: string; testName: string; resultValue: string; unit: string | null; referenceRange: string | null; status: string; reportedAt: string }>
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Your Lab Results</CardTitle></CardHeader>
      <CardContent>
        {lr.length === 0 ? <div className="text-center py-8 text-sm text-muted-foreground">No lab results found.</div> : (
          <div className="divide-y">{lr.map((r) => (
            <div key={r.id} className="py-3 flex items-center justify-between">
              <div><div className="font-medium text-sm">{r.testName}</div><div className="text-xs text-muted-foreground">{formatDate(r.reportedAt)}</div>{r.referenceRange && <div className="text-xs text-muted-foreground">Reference: {r.referenceRange}</div>}</div>
              <div className="text-right"><div className="font-mono text-sm">{r.resultValue} {r.unit || ''}</div><Badge variant="outline" className={`text-xs ${r.status === 'CRITICAL' ? 'border-red-500 text-red-700' : r.status === 'ABNORMAL' ? 'border-amber-500 text-amber-700' : ''}`}>{r.status}</Badge></div>
            </div>
          ))}</div>
        )}
      </CardContent>
    </Card>
  )
}

function MessagesTab() {
  const [messages, setMessages] = useState<Array<{ id: string; fromType: string; subject: string | null; body: string; createdAt: string; read: boolean }>>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ subject: '', body: '' })

  const load = async () => { try { const d = await api<{ messages: typeof messages }>('/api/patient-portal/messages'); setMessages(d.messages) } catch { /* ignore */ } }
  useEffect(() => { let cancelled = false; const doLoad = async () => { try { const d = await api<{ messages: typeof messages }>('/api/patient-portal/messages'); if (!cancelled) setMessages(d.messages) } catch { /* ignore */ } }; doLoad(); return () => { cancelled = true } }, [])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await api('/api/patient-portal/messages', { method: 'POST', body: JSON.stringify(form) }); toast.success('Message sent.'); setShowForm(false); setForm({ subject: '', body: '' }); load() } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Failed.') }
  }

  return (
    <Card>
      <CardHeader><div className="flex justify-between items-center"><CardTitle className="text-base">Messages</CardTitle><Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-3 h-3 mr-1" /> New</Button></div></CardHeader>
      <CardContent>
        {showForm && <form onSubmit={send} className="border rounded p-3 mb-3 space-y-2"><Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /><textarea className="w-full p-2 border rounded text-sm" rows={3} placeholder="Your message..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /><Button type="submit" size="sm">Send</Button></form>}
        {messages.length === 0 ? <div className="text-center py-8 text-sm text-muted-foreground">No messages.</div> : (
          <div className="divide-y">{messages.map((m) => (
            <div key={m.id} className="py-3 flex items-start gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${m.fromType === 'STAFF' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'}`}>{m.fromType === 'STAFF' ? 'S' : 'P'}</div>
              <div className="flex-1"><div className="flex justify-between"><span className="text-sm font-medium">{m.subject || 'No subject'}</span><span className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</span></div><div className="text-sm mt-0.5">{m.body}</div></div>
            </div>
          ))}</div>
        )}
      </CardContent>
    </Card>
  )
}

function DocumentsTab({ documents }: { documents: unknown[] }) {
  const docs = documents as Array<{ id: string; fileName: string; fileType: string; category: string; createdAt: string }>
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Your Documents</CardTitle></CardHeader>
      <CardContent>
        {docs.length === 0 ? <div className="text-center py-8 text-sm text-muted-foreground">No documents available.</div> : (
          <div className="divide-y">{docs.map((d) => (
            <div key={d.id} className="py-3 flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1"><a href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">{d.fileName}</a><div className="text-xs text-muted-foreground">{d.category.replace(/_/g, ' ')} · {formatDate(d.createdAt)}</div></div>
              <Badge variant="outline" className="text-xs">{d.category.replace(/_/g, ' ')}</Badge>
            </div>
          ))}</div>
        )}
      </CardContent>
    </Card>
  )
}

function ProfileTab() {
  const [profile, setProfile] = useState<{ phone: string; email: string; address: string } | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ phone: '', email: '', address: '' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { api<{ patient: typeof profile }>('/api/patient-portal/profile').then((d) => { setProfile(d.patient); if (d.patient) setForm({ phone: d.patient.phone || '', email: d.patient.email || '', address: d.patient.address || '' }) }) }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try { await api('/api/patient-portal/profile', { method: 'PATCH', body: JSON.stringify(form) }); toast.success('Profile updated.'); setEditing(false) } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Failed.') } finally { setSaving(false) }
  }

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try { await api('/api/patient-portal/profile', { method: 'PATCH', body: JSON.stringify(pwForm) }); toast.success('Password changed.'); setPwForm({ currentPassword: '', newPassword: '' }) } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Failed.') } finally { setSaving(false) }
  }

  if (!profile) return <div className="text-center py-8 text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><div className="flex justify-between items-center"><CardTitle className="text-base">Contact Information</CardTitle><Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</Button></div></CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={save} className="space-y-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </form>
          ) : (
            <div className="space-y-1 text-sm">
              <div><span className="text-muted-foreground">Phone:</span> {profile.phone || '—'}</div>
              <div><span className="text-muted-foreground">Email:</span> {profile.email || '—'}</div>
              <div><span className="text-muted-foreground">Address:</span> {profile.address || '—'}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={changePw} className="space-y-3">
            <div><Label>Current Password</Label><Input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} /></div>
            <div><Label>New Password (min 8 chars)</Label><Input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={8} /></div>
            <Button type="submit" size="sm" disabled={saving}>{saving ? 'Changing...' : 'Change Password'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
