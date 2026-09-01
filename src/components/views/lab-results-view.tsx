// Lab results view (spec #34)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FlaskConical } from 'lucide-react'
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

const STATUS_COLORS: Record<string, string> = {
  NORMAL: 'bg-green-100 text-green-700',
  ABNORMAL: 'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export function LabResultsView() {
  const { setView, hasPermission } = useApp()
  const [results, setResults] = useState<LabResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await api<{ labResults: LabResult[] }>('/api/lab-results')
        if (!cancelled) setResults(data.labResults)
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
        <h2 className="text-lg font-semibold">Lab Results</h2>
        {hasPermission('medical_records.create') && (
          <Button onClick={() => toast.info('Use the patient profile to add lab results.')}>
            <Plus className="w-4 h-4 mr-1.5" /> Help
          </Button>
        )}
      </div>

      <Card>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : results.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div>No lab results recorded.</div>
            <div className="text-xs mt-1">Add lab results from a patient's profile.</div>
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
