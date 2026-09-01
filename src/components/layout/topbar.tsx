// Topbar with mobile menu toggle, page title, notifications

'use client'

import { useApp, type AppView } from '@/lib/app-store'
import { Menu, Bell, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'

const VIEW_TITLES: Record<AppView, string> = {
  dashboard: 'Dashboard',
  patients: 'Patients',
  'patient-detail': 'Patient Profile',
  'patient-new': 'New Patient',
  appointments: 'Appointments',
  'appointment-new': 'New Appointment',
  calendar: 'Calendar',
  queue: 'Queue',
  doctors: 'Doctors',
  staff: 'Staff',
  services: 'Services',
  visits: 'Visits',
  'visit-new': 'New Visit',
  prescriptions: 'Prescriptions',
  invoices: 'Invoices',
  'invoice-detail': 'Invoice',
  'invoice-new': 'New Invoice',
  payments: 'Payments',
  reports: 'Reports',
  'audit-logs': 'Audit Logs',
  settings: 'Settings',
}

export function Topbar({ onOpenPalette }: { onOpenPalette?: () => void }) {
  const { view, setSidebarOpen, sidebarOpen, user, logout } = useApp()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      try {
        const data = await api<{ unreadCount: number }>('/api/notifications')
        if (!cancelled) setUnread(data.unreadCount)
      } catch {
        // ignore
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [user])

  return (
    <header className="h-16 border-b bg-card sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-6">
      <button
        className="lg:hidden p-2 rounded hover:bg-accent"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="text-lg font-semibold flex-1 truncate">
        {VIEW_TITLES[view] || 'Clinic Command Center'}
      </h1>

      {onOpenPalette && (
        <button
          className="hidden md:flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs text-muted-foreground hover:bg-accent"
          onClick={onOpenPalette}
          title="Open command palette (Ctrl+K)"
        >
          <Search className="w-3 h-3" />
          <span>Search...</span>
          <kbd className="border px-1 rounded text-[10px]">⌘K</kbd>
        </button>
      )}

      <button
        className="relative p-2 rounded hover:bg-accent"
        onClick={async () => {
          await api('/api/notifications', { method: 'PATCH', body: JSON.stringify({ markAllRead: true }) })
          setUnread(0)
        }}
        title="Mark notifications read"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <button
        onClick={async () => {
          await api('/api/auth', { method: 'DELETE' })
          logout()
        }}
        className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded hover:bg-accent"
      >
        Logout
      </button>
    </header>
  )
}
