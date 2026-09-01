// Topbar with notifications dropdown, search button, and command palette trigger

'use client'

import { useApp, type AppView } from '@/lib/app-store'
import { Menu, Bell, Search, X } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api-client'
import { formatDateTime } from '@/lib/format'

const VIEW_TITLES: Record<AppView, string> = {
  dashboard: 'Dashboard',
  patients: 'Patients',
  'patient-detail': 'Patient Profile',
  'patient-new': 'New Patient',
  'patient-edit': 'Edit Patient',
  appointments: 'Appointments',
  'appointment-new': 'New Appointment',
  'appointment-detail': 'Appointment',
  calendar: 'Calendar',
  queue: 'Queue',
  doctors: 'Doctors',
  'doctors-schedule': 'Doctor Schedule',
  staff: 'Staff',
  services: 'Services',
  visits: 'Visits',
  'visit-new': 'New Visit',
  'visit-detail': 'Visit Details',
  prescriptions: 'Prescriptions',
  'prescription-detail': 'New Prescription',
  invoices: 'Invoices',
  'invoice-detail': 'Invoice',
  'invoice-new': 'New Invoice',
  payments: 'Payments',
  reports: 'Reports',
  'audit-logs': 'Audit Logs',
  settings: 'Settings',
  documents: 'Documents',
  'lab-results': 'Lab Results',
  'follow-ups': 'Follow-ups',
  'online-booking': 'Online Booking',
  'patient-portal': 'Patient Portal',
  'waiting-room': 'Waiting Room',
  branches: 'Branches & Rooms',
}

type Notification = {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

export function Topbar({ onOpenPalette }: { onOpenPalette?: () => void }) {
  const { view, setSidebarOpen, sidebarOpen, user, logout } = useApp()
  const [unread, setUnread] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadNotifications = async () => {
    if (!user) return
    try {
      const data = await api<{ notifications: Notification[]; unreadCount: number }>('/api/notifications')
      setNotifications(data.notifications)
      setUnread(data.unreadCount)
    } catch {
      // ignore — 401 handled globally
    }
  }

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const doLoad = async () => {
      try {
        const data = await api<{ notifications: Notification[]; unreadCount: number }>('/api/notifications')
        if (!cancelled) {
          setNotifications(data.notifications)
          setUnread(data.unreadCount)
        }
      } catch {
        // ignore
      }
    }
    doLoad()
    const id = setInterval(doLoad, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [user])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    try {
      await api('/api/notifications', { method: 'PATCH', body: JSON.stringify({ markAllRead: true }) })
      setUnread(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      // ignore
    }
  }

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

      {/* Notifications dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          className="relative p-2 rounded hover:bg-accent"
          onClick={() => {
            setShowDropdown(!showDropdown)
            if (!showDropdown && unread > 0) markAllRead()
          }}
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-80 bg-card border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="text-sm font-medium">Notifications</span>
              <button onClick={() => setShowDropdown(false)} className="p-1 hover:bg-accent rounded">
                <X className="w-3 h-3" />
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No notifications.
              </div>
            ) : (
              <div className="divide-y">
                {notifications.slice(0, 20).map((n) => (
                  <div key={n.id} className={`p-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium">{n.title}</div>
                      {!n.read && <span className="w-2 h-2 bg-primary rounded-full mt-1 shrink-0" />}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{formatDateTime(n.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
