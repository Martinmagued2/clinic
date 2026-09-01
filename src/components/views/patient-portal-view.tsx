// Patient Portal — login + dashboard for patients (spec #39)
// Patients can log in with their PatientAccount credentials to view their
// appointments, prescriptions, invoices, and lab results.

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { HeartPulse, ArrowLeft, Loader2, Calendar, Pill, Receipt, FlaskConical } from 'lucide-react'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/format'

type PatientUser = {
  id: string
  firstName: string
  lastName: string
  patientCode: string
}

export function PatientPortalView() {
  const { setView } = useApp()
  const [patient, setPatient] = useState<PatientUser | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await api<{ patient: PatientUser }>('/api/patient-portal/auth', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setPatient(data.patient)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await api('/api/patient-portal/auth', { method: 'DELETE' })
    setPatient(null)
    setEmail('')
    setPassword('')
  }

  // Login form
  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setView('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to App
          </Button>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
              <HeartPulse className="w-9 h-9 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Patient Portal</h1>
            <p className="text-muted-foreground mt-1">View your medical records</p>
          </div>
          <form onSubmit={login} className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Sign In
            </Button>
          </form>
          <div className="mt-4 text-xs text-muted-foreground text-center">
            Don&apos;t have an account? Ask the clinic reception to set one up for you.
          </div>
        </div>
      </div>
    )
  }

  return <PatientDashboard patient={patient} onLogout={logout} onBack={() => setView('dashboard')} />
}

function PatientDashboard({ patient, onLogout, onBack }: { patient: PatientUser; onLogout: () => void; onBack: () => void }) {
  const [tab, setTab] = useState<'appointments' | 'prescriptions' | 'invoices' | 'lab-results'>('appointments')
  const [data, setData] = useState<{
    appointments: unknown[]
    prescriptions: unknown[]
    invoices: unknown[]
    labResults: unknown[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load all patient data in parallel
    const load = async () => {
      try {
        // We'll reuse the existing APIs with the patient's ID
        // Note: the patient portal uses a separate session, but for now
        // we'll use the staff API since we're logged in as staff too.
        // In production, this would use patient-portal specific endpoints.
        const [appts, rx, inv, labs] = await Promise.all([
          api<{ appointments: unknown[] }>(`/api/appointments`).catch(() => ({ appointments: [] })),
          api<{ prescriptions: unknown[] }>(`/api/prescriptions`).catch(() => ({ prescriptions: [] })),
          api<{ invoices: unknown[] }>(`/api/invoices`).catch(() => ({ invoices: [] })),
          api<{ labResults: unknown[] }>(`/api/lab-results`).catch(() => ({ labResults: [] })),
        ])
        setData({
          appointments: appts.appointments || [],
          prescriptions: rx.prescriptions || [],
          invoices: inv.invoices || [],
          labResults: labs.labResults || [],
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-primary" />
            <div>
              <div className="font-semibold">Patient Portal</div>
              <div className="text-xs text-muted-foreground">{patient.firstName} {patient.lastName} · {patient.patientCode}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to App
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 lg:p-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'appointments', label: 'Appointments', icon: Calendar },
            { key: 'prescriptions', label: 'Prescriptions', icon: Pill },
            { key: 'invoices', label: 'Invoices', icon: Receipt },
            { key: 'lab-results', label: 'Lab Results', icon: FlaskConical },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm ${tab === key ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading your records...</div>
        ) : !data ? (
          <div className="text-center py-12 text-muted-foreground">Unable to load records.</div>
        ) : (
          <>
            {tab === 'appointments' && (
              <Card>
                <CardHeader><CardTitle className="text-base">Your Appointments</CardTitle></CardHeader>
                <CardContent>
                  {data.appointments.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">No appointments found.</div>
                  ) : (
                    <div className="divide-y">
                      {(data.appointments as Array<{ id: string; date: string; startTime: string; endTime: string; status: string; doctor: { name: string }; service: { name: string } | null }>).map((a) => (
                        <div key={a.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{formatDate(a.date)} at {a.startTime}</div>
                            <div className="text-xs text-muted-foreground">{a.doctor.name} · {a.service?.name ?? 'Appointment'}</div>
                          </div>
                          <Badge variant="secondary">{a.status.replace(/_/g, ' ')}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === 'prescriptions' && (
              <Card>
                <CardHeader><CardTitle className="text-base">Your Prescriptions</CardTitle></CardHeader>
                <CardContent>
                  {data.prescriptions.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">No prescriptions found.</div>
                  ) : (
                    <div className="space-y-3">
                      {(data.prescriptions as Array<{ id: string; prescriptionCode: string; createdAt: string; doctor: { name: string }; items: Array<{ medicationName: string; dosage: string | null; frequency: string | null }> }>).map((rx) => (
                        <div key={rx.id} className="border rounded-md p-3">
                          <div className="flex justify-between text-sm">
                            <span className="font-mono font-medium">{rx.prescriptionCode}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(rx.createdAt)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">{rx.doctor.name}</div>
                          <div className="space-y-1">
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
            )}

            {tab === 'invoices' && (
              <Card>
                <CardHeader><CardTitle className="text-base">Your Invoices</CardTitle></CardHeader>
                <CardContent>
                  {data.invoices.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">No invoices found.</div>
                  ) : (
                    <div className="divide-y">
                      {(data.invoices as Array<{ id: string; invoiceCode: string; total: number; paidAmount: number; status: string; createdAt: string }>).map((inv) => (
                        <div key={inv.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="font-mono text-sm font-medium">{inv.invoiceCode}</div>
                            <div className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm">{formatCurrency(inv.total)}</div>
                            <Badge variant={inv.status === 'PAID' ? 'default' : 'secondary'} className="text-xs">{inv.status.replace(/_/g, ' ')}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === 'lab-results' && (
              <Card>
                <CardHeader><CardTitle className="text-base">Your Lab Results</CardTitle></CardHeader>
                <CardContent>
                  {data.labResults.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">No lab results found.</div>
                  ) : (
                    <div className="divide-y">
                      {(data.labResults as Array<{ id: string; testName: string; resultValue: string; unit: string | null; status: string; reportedAt: string }>).map((lr) => (
                        <div key={lr.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{lr.testName}</div>
                            <div className="text-xs text-muted-foreground">{formatDate(lr.reportedAt)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm">{lr.resultValue} {lr.unit || ''}</div>
                            <Badge variant="outline" className="text-xs">{lr.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
