// Services list + create (spec #26)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'

type Service = {
  id: string
  name: string
  description: string | null
  price: number
  duration: number
  status: string
}

export function ServicesView() {
  const { hasPermission } = useApp()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '500', duration: '30' })

  const load = async () => {
    try {
      const data = await api<{ services: Service[] }>('/api/services')
      setServices(data.services)
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
      await api('/api/services', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          duration: Number(form.duration),
        }),
      })
      toast.success('Service created.')
      setShowForm(false)
      setForm({ name: '', description: '', price: '500', duration: '30' })
      load()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed.'
      toast.error(msg)
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Services</h2>
        {hasPermission('settings.manage') && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1.5" /> New Service
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <form onSubmit={submit} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="h-9 px-3 border rounded-md text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="h-9 px-3 border rounded-md text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input className="h-9 px-3 border rounded-md text-sm" placeholder="Price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <input className="h-9 px-3 border rounded-md text-sm" placeholder="Duration (min)" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            <Button type="submit" className="md:col-span-2">Create</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-right px-4 py-3">Price</th>
                  <th className="text-right px-4 py-3">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {services.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.description || '—'}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(s.price)}</td>
                    <td className="px-4 py-3 text-right">{s.duration} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
