// Audit logs with filtering (spec #48)

'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { formatDateTime } from '@/lib/format'

type Log = {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  createdAt: string
  user: { name: string; email: string } | null
}

export function AuditLogsView() {
  const [logs, setLogs] = useState<Log[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ action: '', entityType: '', from: '', to: '' })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: '50' })
        if (filters.action) params.set('action', filters.action)
        if (filters.entityType) params.set('entityType', filters.entityType)
        if (filters.from) params.set('from', filters.from)
        if (filters.to) params.set('to', filters.to)
        const data = await api<{ logs: Log[]; pagination: { totalPages: number } }>(
          `/api/audit-logs?${params}`,
        )
        if (!cancelled) {
          setLogs(data.logs)
          setTotalPages(data.pagination.totalPages)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [page, filters])

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Audit Logs</h2>

      <Card>
        <div className="p-3 border-b grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="flex items-center gap-1 col-span-2 md:col-span-1">
            <Filter className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium">Filters:</span>
          </div>
          <Input placeholder="Action contains..." value={filters.action} onChange={(e) => { setFilters({ ...filters, action: e.target.value }); setPage(1) }} className="h-8 text-sm" />
          <select className="h-8 px-2 border rounded-md text-sm bg-background" value={filters.entityType} onChange={(e) => { setFilters({ ...filters, entityType: e.target.value }); setPage(1) }}>
            <option value="">All entity types</option>
            {['Patient', 'Appointment', 'Visit', 'Prescription', 'Invoice', 'Payment', 'User', 'Doctor', 'Refund', 'Document'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <Input type="date" value={filters.from} onChange={(e) => { setFilters({ ...filters, from: e.target.value }); setPage(1) }} className="h-8 text-sm" />
          <Input type="date" value={filters.to} onChange={(e) => { setFilters({ ...filters, to: e.target.value }); setPage(1) }} className="h-8 text-sm" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Timestamp</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No audit logs match the filters.</td></tr>
              ) : logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{formatDateTime(l.createdAt)}</td>
                  <td className="px-4 py-2">{l.user?.name || '—'}</td>
                  <td className="px-4 py-2"><Badge variant="outline" className="text-xs">{l.action}</Badge></td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {l.entityType ? `${l.entityType}#${l.entityId?.slice(0, 8)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs">Page {page} of {Math.max(1, totalPages)}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
