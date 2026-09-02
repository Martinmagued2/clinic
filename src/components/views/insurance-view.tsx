// Insurance management view (spec #80)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Shield } from 'lucide-react'
import { toast } from 'sonner'

type Provider = { id: string; name: string; phone: string | null; email: string | null; status: string; plans: Array<{ id: string; name: string; coveragePercent: number; copayAmount: number }>; _count: { patientInsurance: number } }

export function InsuranceView() {
  const { hasPermission } = useApp()
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' })

  const load = async () => { try { const d = await api<{ providers: Provider[] }>('/api/insurance/providers'); setProviders(d.providers) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await api('/api/insurance/providers', { method: 'POST', body: JSON.stringify(form) }); toast.success('Provider added.'); setShowForm(false); setForm({ name: '', phone: '', email: '', address: '' }); load() } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Failed.') }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Insurance</h2>
        {hasPermission('settings.manage') && <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1.5" /> New Provider</Button>}
      </div>

      {showForm && (
        <Card><form onSubmit={create} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <Button type="submit" className="md:col-span-2">Add Provider</Button>
        </form></Card>
      )}

      {loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : providers.length === 0 ? (
        <Card><div className="py-12 text-center text-muted-foreground"><Shield className="w-10 h-10 mx-auto mb-2 opacity-50" />No insurance providers.</div></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((p) => (
            <Card key={p.id}><div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{p.name}</div>
                <Badge variant={p.status === 'ACTIVE' ? 'default' : 'secondary'}>{p.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {p.phone && <div>📞 {p.phone}</div>}
                {p.email && <div>✉️ {p.email}</div>}
                <div>👥 {p._count.patientInsurance} patient(s) insured</div>
              </div>
              {p.plans.length > 0 && <div className="mt-3 pt-3 border-t"><div className="text-xs font-medium mb-1">Plans</div><div className="flex flex-wrap gap-1">{p.plans.map((pl) => <Badge key={pl.id} variant="outline" className="text-xs">{pl.name} ({pl.coveragePercent}%)</Badge>)}</div></div>}
            </div></Card>
          ))}
        </div>
      )}
    </div>
  )
}
