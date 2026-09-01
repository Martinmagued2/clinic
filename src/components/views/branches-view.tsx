// Branches & Rooms management (spec #42, #43)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, DoorOpen } from 'lucide-react'
import { toast } from 'sonner'

type Branch = {
  id: string
  name: string
  phone: string | null
  address: string | null
  status: string
  rooms: Array<{ id: string; name: string; type: string; status: string }>
  _count?: { appointments: number }
}

export function BranchesView() {
  const { user } = useApp()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showRoomForm, setShowRoomForm] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [roomForm, setRoomForm] = useState({ name: '', type: 'CONSULTATION' })

  const canManage = user?.role === 'CLINIC_ADMIN' || user?.role === 'SUPER_ADMIN'

  const load = async () => {
    try {
      const data = await api<{ branches: Branch[] }>('/api/branches')
      setBranches(data.branches)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api('/api/branches', { method: 'POST', body: JSON.stringify(form) })
      toast.success('Branch created.')
      setShowForm(false)
      setForm({ name: '', phone: '', address: '' })
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed.')
    }
  }

  const createRoom = async (branchId: string, e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api('/api/rooms', { method: 'POST', body: JSON.stringify({ ...roomForm, branchId }) })
      toast.success('Room created.')
      setShowRoomForm(null)
      setRoomForm({ name: '', type: 'CONSULTATION' })
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed.')
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Branches & Rooms</h2>
        {canManage && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1.5" /> New Branch
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <form onSubmit={createBranch} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <Button type="submit" className="md:col-span-3">Create Branch</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : branches.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div>No branches configured.</div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((b) => (
            <Card key={b.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{b.name}</CardTitle>
                  <Badge variant={b.status === 'ACTIVE' ? 'default' : 'secondary'}>{b.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {b.phone && <div>{b.phone}</div>}
                  {b.address && <div>{b.address}</div>}
                  {b._count && <div>{b._count.appointments} appointments</div>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium uppercase text-muted-foreground">Rooms ({b.rooms.length})</div>
                  {canManage && (
                    <Button size="sm" variant="ghost" onClick={() => setShowRoomForm(showRoomForm === b.id ? null : b.id)}>
                      <Plus className="w-3 h-3 mr-1" /> Add Room
                    </Button>
                  )}
                </div>
                {showRoomForm === b.id && (
                  <form onSubmit={(e) => createRoom(b.id, e)} className="grid grid-cols-2 gap-2 mb-2 p-2 border rounded">
                    <Input placeholder="Room name" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} required />
                    <select className="h-9 px-3 border rounded-md text-sm bg-background" value={roomForm.type} onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}>
                      <option value="CONSULTATION">Consultation</option>
                      <option value="PROCEDURE">Procedure</option>
                      <option value="DENTAL">Dental</option>
                      <option value="LAB">Lab</option>
                    </select>
                    <Button type="submit" size="sm" className="col-span-2">Add</Button>
                  </form>
                )}
                <div className="space-y-1">
                  {b.rooms.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-sm">
                      <DoorOpen className="w-3 h-3 text-muted-foreground" />
                      <span>{r.name}</span>
                      <Badge variant="outline" className="text-xs">{r.type}</Badge>
                    </div>
                  ))}
                  {b.rooms.length === 0 && <div className="text-xs text-muted-foreground">No rooms.</div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
