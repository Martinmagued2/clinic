// Command palette (Ctrl+K) — quick actions (spec #47)

'use client'

import { useEffect, useState } from 'react'
import { useApp, type AppView } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import {
  LayoutDashboard, Users, CalendarDays, CalendarRange, ListOrdered,
  Stethoscope, UserCog, ClipboardList, Pill, Receipt, CreditCard,
  BarChart3, ShieldCheck, Settings, FileText, FlaskConical,
  CalendarClock, Building2, Plus, Search, DoorOpen, Tv, Globe,
  Tag, MessageSquare,
} from 'lucide-react'

type Command = {
  id: string
  label: string
  hint?: string
  icon: typeof LayoutDashboard
  view?: AppView
  viewParam?: string
  permission?: string
  keywords?: string
}

const ALL_COMMANDS: Command[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { id: 'patients', label: 'Patients', icon: Users, view: 'patients', permission: 'patients.view' },
  { id: 'new-patient', label: 'New Patient', icon: Plus, view: 'patient-new', permission: 'patients.create', keywords: 'add create' },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, view: 'appointments', permission: 'appointments.view' },
  { id: 'new-appointment', label: 'New Appointment', icon: Plus, view: 'appointment-new', permission: 'appointments.create', keywords: 'book schedule' },
  { id: 'calendar', label: 'Calendar', icon: CalendarRange, view: 'calendar', permission: 'appointments.view' },
  { id: 'queue', label: 'Queue', icon: ListOrdered, view: 'queue', permission: 'queue.view' },
  { id: 'doctors', label: 'Doctors', icon: Stethoscope, view: 'doctors', permission: 'doctors.view' },
  { id: 'staff', label: 'Staff', icon: UserCog, view: 'staff', permission: 'staff.view' },
  { id: 'visits', label: 'Visits', icon: ClipboardList, view: 'visits', permission: 'medical_records.view' },
  { id: 'new-visit', label: 'New Visit', icon: Plus, view: 'visit-new', permission: 'medical_records.create', keywords: 'consultation' },
  { id: 'prescriptions', label: 'Prescriptions', icon: Pill, view: 'prescriptions', permission: 'prescriptions.view' },
  { id: 'invoices', label: 'Invoices', icon: Receipt, view: 'invoices', permission: 'billing.view' },
  { id: 'new-invoice', label: 'New Invoice', icon: Plus, view: 'invoice-new', permission: 'billing.create' },
  { id: 'payments', label: 'Payments', icon: CreditCard, view: 'payments', permission: 'billing.view' },
  { id: 'reports', label: 'Reports', icon: BarChart3, view: 'reports', permission: 'reports.view' },
  { id: 'audit', label: 'Audit Logs', icon: ShieldCheck, view: 'audit-logs', permission: 'audit.view' },
  { id: 'settings', label: 'Settings', icon: Settings, view: 'settings', permission: 'settings.view' },
  { id: 'documents', label: 'Documents', icon: FileText, view: 'documents', permission: 'patients.view' },
  { id: 'lab-results', label: 'Lab Results', icon: FlaskConical, view: 'lab-results', permission: 'patients.view' },
  { id: 'follow-ups', label: 'Follow-ups', icon: CalendarClock, view: 'follow-ups', permission: 'medical_records.view' },
  { id: 'branches', label: 'Branches & Rooms', icon: Building2, view: 'branches' },
  { id: 'waiting-room', label: 'Waiting Room Display', icon: Tv, view: 'waiting-room' },
  { id: 'online-booking', label: 'Online Booking (Public)', icon: Globe, view: 'online-booking' },
  { id: 'patient-portal', label: 'Patient Portal', icon: UserCog, view: 'patient-portal' },
  { id: 'inventory', label: 'Inventory', icon: Tag, view: 'inventory' },
  { id: 'insurance', label: 'Insurance', icon: ShieldCheck, view: 'insurance' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, view: 'messages' },
  { id: 'subscription', label: 'Subscription', icon: Settings, view: 'subscription', permission: 'settings.view' },
  { id: 'waitlist', label: 'Waitlist', icon: ListOrdered, view: 'waitlist' },
]

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setView, hasPermission, user } = useApp()
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)

  const filtered = ALL_COMMANDS.filter((c) => {
    if (c.permission && !hasPermission(c.permission as never)) return false
    if (!query) return true
    const q = query.toLowerCase()
    return (
      c.label.toLowerCase().includes(q) ||
      (c.keywords?.toLowerCase().includes(q) ?? false)
    )
  })

  // Reset query/highlight when palette closes (using derived state instead of effect)
  const effectiveQuery = open ? query : ''
  const effectiveHighlight = open ? highlight : 0

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => Math.min(h + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => Math.max(h - 1, 0))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = filtered[highlight]
        if (cmd?.view) {
          setView(cmd.view, cmd.viewParam)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, highlight, onClose, setView])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24 p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 p-3 border-b">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlight(0) }}
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <kbd className="text-xs text-muted-foreground border px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No commands found.</div>
          ) : (
            filtered.map((c, i) => {
              const Icon = c.icon
              return (
                <button
                  key={c.id}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => { if (c.view) { setView(c.view, c.viewParam); onClose() } }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left ${i === highlight ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{c.label}</span>
                  {c.hint && <span className="text-xs opacity-70">{c.hint}</span>}
                </button>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}
