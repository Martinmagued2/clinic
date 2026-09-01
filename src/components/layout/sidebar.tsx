// Role-aware sidebar (spec #93)

'use client'

import { useApp, type AppView } from '@/lib/app-store'
import { roleHasPermission, type Permission } from '@/lib/permissions'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarRange,
  ListOrdered,
  Stethoscope,
  UserCog,
  Tag,
  ClipboardList,
  Pill,
  Receipt,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Settings,
  HeartPulse,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  view: AppView
  label: string
  icon: typeof LayoutDashboard
  permission?: Permission
  roles?: string[] // if set, only show for these roles
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Patients',
    items: [
      { view: 'patients', label: 'Patients', icon: Users, permission: 'patients.view' },
      { view: 'appointments', label: 'Appointments', icon: CalendarDays, permission: 'appointments.view' },
      { view: 'calendar', label: 'Calendar', icon: CalendarRange, permission: 'appointments.view' },
      { view: 'queue', label: 'Queue', icon: ListOrdered, permission: 'queue.view' },
    ],
  },
  {
    title: 'Medical',
    items: [
      { view: 'visits', label: 'Visits', icon: ClipboardList, permission: 'medical_records.view' },
      { view: 'prescriptions', label: 'Prescriptions', icon: Pill, permission: 'prescriptions.view' },
    ],
  },
  {
    title: 'Billing',
    items: [
      { view: 'invoices', label: 'Invoices', icon: Receipt, permission: 'billing.view' },
      { view: 'payments', label: 'Payments', icon: CreditCard, permission: 'billing.view' },
      { view: 'services', label: 'Services', icon: Tag, permission: 'patients.view' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { view: 'doctors', label: 'Doctors', icon: Stethoscope, permission: 'doctors.view' },
      { view: 'staff', label: 'Staff', icon: UserCog, permission: 'staff.view' },
      { view: 'reports', label: 'Reports', icon: BarChart3, permission: 'reports.view' },
      { view: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck, permission: 'audit.view' },
      { view: 'settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
    ],
  },
]

export function Sidebar() {
  const { user, view, setView, sidebarOpen } = useApp()
  if (!user) return null

  const canSee = (item: NavItem): boolean => {
    if (item.roles && !item.roles.includes(user.role)) return false
    if (item.permission) return roleHasPermission(user.role, item.permission)
    return true
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r flex flex-col transition-transform lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="h-16 flex items-center gap-2 px-5 border-b">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <HeartPulse className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-semibold leading-tight">Clinic Command</div>
          <div className="text-xs text-muted-foreground">Center</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter(canSee)
          if (items.length === 0) return null
          return (
            <div key={section.title}>
              <div className="px-3 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon
                  const active = view === item.view
                  return (
                    <button
                      key={item.view}
                      onClick={() => setView(item.view)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors text-left',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-accent',
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="p-3 border-t text-xs text-muted-foreground">
        <div className="font-medium text-foreground">{user.name}</div>
        <div>{user.role.replace('_', ' ')}</div>
      </div>
    </aside>
  )
}
