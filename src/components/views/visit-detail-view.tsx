// Visit detail view (spec #19, #20)

'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Printer, Pill } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/format'

type Visit = {
  id: string
  chiefComplaint: string | null
  symptoms: string | null
  examination: string | null
  assessment: string | null
  diagnosis: string | null
  treatmentPlan: string | null
  followUpDate: string | null
  status: string
  createdAt: string
  patient: { id: string; firstName: string; lastName: string; patientCode: string; allergies: string | null }
  doctor: { id: string; name: string; specialty: string }
  vitals: {
    bloodPressure: string | null
    heartRate: number | null
    temperature: number | null
    weight: number | null
    height: number | null
    oxygenSaturation: number | null
    respiratoryRate: number | null
  } | null
  prescriptions: Array<{
    id: string
    prescriptionCode: string
    createdAt: string
    items: Array<{ medicationName: string; strength: string | null; dosage: string | null; frequency: string | null; duration: string | null }>
  }>
}

export function VisitDetailView() {
  const { viewParam, setView, hasPermission } = useApp()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!viewParam) return
    const load = async () => {
      try {
        const data = await api<{ visit: Visit }>(`/api/visits/${viewParam}`)
        setVisit(data.visit)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [viewParam])

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>
  if (!visit) return <div className="p-6 text-muted-foreground">Not found.</div>

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-4">
      <div className="flex justify-between items-center">
        <Button variant="ghost" size="sm" onClick={() => setView('visits')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        <div className="flex gap-2">
          {visit.prescriptions.length > 0 && hasPermission('prescriptions.view') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(`/api/print/prescription/${visit.prescriptions[0].id}`, '_blank')}
            >
              <Printer className="w-4 h-4 mr-1.5" /> Print Rx
            </Button>
          )}
          {hasPermission('prescriptions.create') && (
            <Button size="sm" onClick={() => setView('prescription-detail', visit.id)}>
              <Pill className="w-4 h-4 mr-1.5" /> New Prescription
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Visit Details</CardTitle>
            <Badge variant={visit.status === 'COMPLETED' ? 'default' : 'secondary'}>{visit.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Patient</div>
              <button className="font-medium hover:underline" onClick={() => setView('patient-detail', visit.patient.id)}>
                {visit.patient.firstName} {visit.patient.lastName}
              </button>
              <div className="text-xs text-muted-foreground">{visit.patient.patientCode}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Doctor</div>
              <div className="font-medium">{visit.doctor.name}</div>
              <div className="text-xs text-muted-foreground">{visit.doctor.specialty}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Date</div>
              <div className="font-medium">{formatDateTime(visit.createdAt)}</div>
            </div>
          </div>

          {visit.patient.allergies && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-2 text-sm">
              ⚠️ Allergies: {visit.patient.allergies}
            </div>
          )}

          {visit.vitals && (
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground mb-2">Vital Signs</div>
              <div className="grid grid-cols-3 md:grid-cols-7 gap-2 text-sm">
                <Vital label="BP" value={visit.vitals.bloodPressure} />
                <Vital label="HR" value={visit.vitals.heartRate ? `${visit.vitals.heartRate} bpm` : null} />
                <Vital label="Temp" value={visit.vitals.temperature ? `${visit.vitals.temperature}°C` : null} />
                <Vital label="Weight" value={visit.vitals.weight ? `${visit.vitals.weight} kg` : null} />
                <Vital label="Height" value={visit.vitals.height ? `${visit.vitals.height} cm` : null} />
                <Vital label="O2 Sat" value={visit.vitals.oxygenSaturation ? `${visit.vitals.oxygenSaturation}%` : null} />
                <Vital label="RR" value={visit.vitals.respiratoryRate ? `${visit.vitals.respiratoryRate}/min` : null} />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Section title="Chief Complaint" value={visit.chiefComplaint} />
            <Section title="Symptoms" value={visit.symptoms} />
            <Section title="Examination" value={visit.examination} />
            <Section title="Assessment" value={visit.assessment} />
            <Section title="Diagnosis" value={visit.diagnosis} />
            <Section title="Treatment Plan" value={visit.treatmentPlan} />
            {visit.followUpDate && (
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground mb-1">Follow-up</div>
                <div className="text-sm">{formatDate(visit.followUpDate)}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {visit.prescriptions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Prescriptions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visit.prescriptions.map((rx) => (
                <div key={rx.id} className="border rounded-md p-3">
                  <div className="flex justify-between text-sm">
                    <div className="font-mono font-medium">{rx.prescriptionCode}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(rx.createdAt)}</div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {rx.items.map((it, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-medium">{it.medicationName}</span>
                        <span className="text-muted-foreground"> — {it.dosage} · {it.frequency} · {it.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Vital({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-muted/30 rounded p-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium text-sm">{value || '—'}</div>
    </div>
  )
}

function Section({ title, value }: { title: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs font-medium uppercase text-muted-foreground mb-1">{title}</div>
      <div className="text-sm bg-muted/30 p-2 rounded">{value}</div>
    </div>
  )
}
