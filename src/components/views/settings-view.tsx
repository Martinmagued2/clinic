// Clinic settings (spec #44)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type ClinicInfo = {
  clinic: {
    id: string
    name: string
    legalName: string | null
    phone: string | null
    email: string | null
    address: string | null
    currency: string
    locale: string
    timezone: string
  } | null
  branches: Array<{ id: string; name: string; phone: string | null; address: string | null; status: string; rooms: unknown[] }>
}

export function SettingsView() {
  const [data, setData] = useState<ClinicInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const load = async () => {
    try {
      const d = await api<ClinicInfo>('/api/clinic')
      setData(d)
      if (d.clinic) {
        setForm({
          name: d.clinic.name,
          legalName: d.clinic.legalName || '',
          phone: d.clinic.phone || '',
          email: d.clinic.email || '',
          address: d.clinic.address || '',
          currency: d.clinic.currency,
          locale: d.clinic.locale,
          timezone: d.clinic.timezone,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api('/api/clinic', { method: 'PATCH', body: JSON.stringify(form) })
      toast.success('Settings saved.')
      load()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>
  if (!data || !data.clinic) return <div className="p-6 text-muted-foreground">No clinic configured.</div>

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-4">
      <h2 className="text-lg font-semibold">Clinic Settings</h2>

      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Clinic Name</Label>
            <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Legal Name</Label>
            <Input value={form.legalName || ''} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Address</Label>
            <Input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Localization</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Currency</Label>
            <select className="w-full h-9 px-3 border rounded-md bg-background text-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Language</Label>
            <select className="w-full h-9 px-3 border rounded-md bg-background text-sm" value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })}>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
              <option value="fr">French</option>
            </select>
          </div>
          <div>
            <Label>Timezone</Label>
            <select className="w-full h-9 px-3 border rounded-md bg-background text-sm" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
              {['Africa/Cairo', 'Asia/Riyadh', 'Asia/Dubai', 'Europe/London', 'America/New_York'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Branches ({data.branches.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.branches.map((b) => (
              <div key={b.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <div className="font-medium text-sm">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.address || '—'} · {b.rooms.length} rooms</div>
                </div>
                <span className="text-xs text-muted-foreground">{b.status}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
