// Messages / Communication hub view

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, MessageSquare, Send } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'

type Msg = { id: string; fromType: string; subject: string | null; body: string; read: boolean; createdAt: string; patientId: string; patient: { firstName: string; lastName: string; patientCode: string } }
type Patient = { id: string; firstName: string; lastName: string; patientCode: string }

export function MessagesView() {
  const { hasPermission } = useApp()
  const [messages, setMessages] = useState<Msg[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ patientId: '', subject: '', body: '' })

  const load = async () => { try { const d = await api<{ messages: Msg[] }>('/api/messages'); setMessages(d.messages) } finally { setLoading(false) } }
  useEffect(() => { load(); api<{ patients: Patient[] }>('/api/patients?pageSize=200').then((d) => setPatients(d.patients)).catch(() => {}) }, [])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await api('/api/messages', { method: 'POST', body: JSON.stringify(form) }); toast.success('Message sent.'); setShowForm(false); setForm({ patientId: '', subject: '', body: '' }); load() } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Failed.') }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Messages</h2>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1.5" /> New Message</Button>
      </div>

      {showForm && (
        <Card><form onSubmit={send} className="p-4 space-y-3">
          <div><Label>To (Patient)</Label><select className="w-full h-9 px-3 border rounded-md text-sm bg-background" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} required><option value="">— Select patient —</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientCode})</option>)}</select></div>
          <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><Label>Message</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required rows={3} /></div>
          <Button type="submit"><Send className="w-4 h-4 mr-1.5" /> Send</Button>
        </form></Card>
      )}

      <Card>
        {loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : messages.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground"><MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />No messages.</div>
        ) : (
          <div className="divide-y">{messages.map((m) => (
            <div key={m.id} className="p-3 flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${m.fromType === 'STAFF' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'}`}>{m.fromType === 'STAFF' ? 'S' : 'P'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{m.patient.firstName} {m.patient.lastName}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</span>
                </div>
                {m.subject && <div className="text-sm text-muted-foreground">{m.subject}</div>}
                <div className="text-sm mt-0.5">{m.body}</div>
              </div>
              {!m.read && <span className="w-2 h-2 bg-primary rounded-full mt-2" />}
            </div>
          ))}</div>
        )}
      </Card>
    </div>
  )
}
