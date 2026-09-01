// Follow-ups view (spec #9)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarClock, Plus } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { toast } from 'sonner'

type FollowUp = {
  id: string
  followUpDate: string
  patientId: string
  patientName: string
  patientCode: string
  doctorId: string
  doctorName: string
  diagnosis: string | null
  status: string
}

export function FollowUpsView() {
  const { setView, hasPermission } = useApp()
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await api<{ followUps: FollowUp[] }>('/api/follow-ups')
        if (!cancelled) setFollowUps(data.followUps)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Upcoming Follow-ups</h2>

      <Card>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : followUps.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div>No upcoming follow-ups.</div>
          </div>
        ) : (
          <div className="divide-y">
            {followUps.map((f) => {
              const isOverdue = new Date(f.followUpDate) < new Date()
              return (
                <div key={f.id} className="p-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded flex items-center justify-center text-xs font-bold ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-primary/10 text-primary'}`}>
                    {new Date(f.followUpDate).getDate()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {f.patientName} <span className="text-xs text-muted-foreground">({f.patientCode})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {f.doctorName} · {f.diagnosis || 'No diagnosis recorded'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                      {formatDate(f.followUpDate)}
                    </div>
                    {isOverdue && <Badge variant="outline" className="text-xs text-red-700">Overdue</Badge>}
                  </div>
                  {hasPermission('appointments.create') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setView('appointment-new', f.patientId)}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Book
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
