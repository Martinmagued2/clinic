// Patient list with search + pagination (spec #8)

'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { calcAge, formatDate } from '@/lib/format'

type Patient = {
  id: string
  patientCode: string
  firstName: string
  lastName: string
  phone: string | null
  gender: string | null
  dateOfBirth: Date | string | null
  status: string
  createdAt: Date | string
}

export function PatientsView() {
  const { setView } = useApp()
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{
        patients: Patient[]
        pagination: { total: number; totalPages: number }
      }>(`/api/patients?search=${encodeURIComponent(search)}&page=${page}&pageSize=20`)
      setPatients(data.patients)
      setTotal(data.pagination.total)
      setTotalPages(data.pagination.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    const id = setTimeout(load, 250) // debounce
    return () => clearTimeout(id)
  }, [load])

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, patient code, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        {useApp.getState().hasPermission('patients.create') && (
          <Button onClick={() => setView('patient-new')}>
            <UserPlus className="w-4 h-4 mr-1.5" /> New Patient
          </Button>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Age</th>
                <th className="text-left px-4 py-3">Gender</th>
                <th className="text-left px-4 py-3">Registered</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No patients found.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setView('patient-detail', p.id)}
                    className="cursor-pointer hover:bg-accent/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{p.patientCode}</td>
                    <td className="px-4 py-3 font-medium">
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="px-4 py-3">{p.phone || '—'}</td>
                    <td className="px-4 py-3">{calcAge(p.dateOfBirth) ?? '—'}</td>
                    <td className="px-4 py-3">{p.gender || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
          <div className="text-muted-foreground">
            {total} patient{total !== 1 ? 's' : ''} total
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
