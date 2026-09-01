// Staff list (spec #40)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/permissions'
import { formatDate } from '@/lib/format'
import { toast } from 'sonner'

type Staff = {
  id: string
  email: string
  name: string
  role: string
  phone: string | null
  status: string
  lastLoginAt: string | null
  createdAt: string
}

export function StaffView() {
  const { hasPermission } = useApp()
  const [users, setUsers] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'RECEPTIONIST', phone: '' })

  const load = async () => {
    try {
      const data = await api<{ users: Staff[] }>('/api/staff')
      setUsers(data.users)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api('/api/staff', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('Staff member added.')
      setShowForm(false)
      setForm({ name: '', email: '', password: '', role: 'RECEPTIONIST', phone: '' })
      load()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to add staff.'
      toast.error(msg)
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Staff</h2>
        {hasPermission('staff.manage') && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Staff
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <form onSubmit={submit} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="h-9 px-3 border rounded-md text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="h-9 px-3 border rounded-md text-sm" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className="h-9 px-3 border rounded-md text-sm" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <input className="h-9 px-3 border rounded-md text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <select className="h-9 px-3 border rounded-md text-sm bg-background" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="CLINIC_ADMIN">Clinic Admin</option>
              <option value="DOCTOR">Doctor</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="NURSE">Nurse</option>
            </select>
            <Button type="submit" className="md:col-span-2">Add</Button>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Last Login</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{ROLE_LABELS[u.role] || u.role}</Badge></td>
                  <td className="px-4 py-3">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</td>
                  <td className="px-4 py-3"><Badge variant={u.status === 'ACTIVE' ? 'default' : 'secondary'}>{u.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
