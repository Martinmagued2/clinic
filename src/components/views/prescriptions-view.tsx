// Prescriptions list (spec #23, #25) with print + create buttons

'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pill, Plus, Printer } from 'lucide-react'
import { formatDateTime } from '@/lib/format'

type Prescription = {
  id: string
  prescriptionCode: string
  notes: string | null
  status: string
  createdAt: string
  patient: { firstName: string; lastName: string; patientCode: string }
  doctor: { name: string }
  items: Array<{
    medicationName: string
    strength: string | null
    dosage: string | null
    frequency: string | null
    duration: string | null
  }>
}

export function PrescriptionsView() {
  const { setView, hasPermission } = useApp()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await api<{ prescriptions: Prescription[] }>('/api/prescriptions')
        if (!cancelled) setPrescriptions(data.prescriptions)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Prescriptions</h2>
        {hasPermission('prescriptions.create') && (
          <Button onClick={() => setView('prescription-detail', '')}>
            <Plus className="w-4 h-4 mr-1.5" /> New Prescription
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : prescriptions.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            <Pill className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div>No prescriptions yet.</div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {prescriptions.map((rx) => (
            <Card key={rx.id}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-sm font-medium">{rx.prescriptionCode}</div>
                  <Badge variant={rx.status === 'ISSUED' ? 'default' : 'secondary'}>{rx.status}</Badge>
                </div>
                <div className="text-sm font-medium">{rx.patient.firstName} {rx.patient.lastName}</div>
                <div className="text-xs text-muted-foreground mb-3">{rx.doctor.name} · {formatDateTime(rx.createdAt)}</div>
                <div className="space-y-1.5 mb-3">
                  {rx.items.map((it, i) => (
                    <div key={i} className="text-xs bg-muted/50 rounded p-2">
                      <div className="font-medium">{it.medicationName} {it.strength}</div>
                      <div className="text-muted-foreground">
                        {it.dosage} · {it.frequency} · {it.duration}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`/api/print/prescription/${rx.id}`, '_blank')}
                >
                  <Printer className="w-3 h-3 mr-1" /> Print
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
