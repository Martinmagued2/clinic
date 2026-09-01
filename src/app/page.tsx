// =====================================================================
// Clinic Command Center — single-page app entry
// (Per skill rules, only the "/" route is exposed to the user.)
// =====================================================================

'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/app-store'
import { api, ApiError } from '@/lib/api-client'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { LoginView } from '@/components/views/login-view'
import { DashboardView } from '@/components/views/dashboard-view'
import { PatientsView } from '@/components/views/patients-view'
import { PatientNewView } from '@/components/views/patient-new-view'
import { PatientDetailView } from '@/components/views/patient-detail-view'
import { AppointmentsView } from '@/components/views/appointments-view'
import { AppointmentNewView } from '@/components/views/appointment-new-view'
import { CalendarView } from '@/components/views/calendar-view'
import { QueueView } from '@/components/views/queue-view'
import { DoctorsView } from '@/components/views/doctors-view'
import { StaffView } from '@/components/views/staff-view'
import { ServicesView } from '@/components/views/services-view'
import { VisitsView, VisitNewView } from '@/components/views/visits-view'
import { PrescriptionsView } from '@/components/views/prescriptions-view'
import { InvoicesView, InvoiceDetailView, InvoiceNewView } from '@/components/views/invoices-view'
import { PaymentsView } from '@/components/views/payments-view'
import { ReportsView } from '@/components/views/reports-view'
import { AuditLogsView } from '@/components/views/audit-logs-view'
import { SettingsView } from '@/components/views/settings-view'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { user, view, setUser, setView } = useApp()
  const [bootstrapping, setBootstrapping] = useState(true)

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const data = await api<{ user: { id: string; email: string; name: string; role: string; clinicId: string | null; branchId: string | null; doctorId: string | null } }>('/api/auth')
        setUser(data.user)
      } catch (err) {
        // 401 is expected when not logged in
        if (!(err instanceof ApiError && err.status === 401)) {
          // ignore
        }
      } finally {
        setBootstrapping(false)
      }
    }
    restore()
  }, [setUser])

  // Close sidebar on view change (mobile)
  useEffect(() => {
    useApp.getState().setSidebarOpen(false)
  }, [view])

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return <LoginView />
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1">{renderView(view)}</main>
        <footer className="mt-auto border-t bg-card px-4 py-3 text-xs text-muted-foreground text-center">
          Clinic Command Center · Multi-tenant Clinic Management SaaS · Built with Next.js, Prisma &amp; shadcn/ui
        </footer>
      </div>

      {/* Mobile sidebar overlay */}
      {useApp.getState().sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => useApp.getState().setSidebarOpen(false)}
        />
      )}
    </div>
  )

  function renderView(v: typeof view) {
    switch (v) {
      case 'dashboard': return <DashboardView />
      case 'patients': return <PatientsView />
      case 'patient-new': return <PatientNewView />
      case 'patient-detail': return <PatientDetailView />
      case 'appointments': return <AppointmentsView />
      case 'appointment-new': return <AppointmentNewView />
      case 'calendar': return <CalendarView />
      case 'queue': return <QueueView />
      case 'doctors': return <DoctorsView />
      case 'staff': return <StaffView />
      case 'services': return <ServicesView />
      case 'visits': return <VisitsView />
      case 'visit-new': return <VisitNewView />
      case 'prescriptions': return <PrescriptionsView />
      case 'invoices': return <InvoicesView />
      case 'invoice-detail': return <InvoiceDetailView />
      case 'invoice-new': return <InvoiceNewView />
      case 'payments': return <PaymentsView />
      case 'reports': return <ReportsView />
      case 'audit-logs': return <AuditLogsView />
      case 'settings': return <SettingsView />
      default: return <DashboardView />
    }
  }
}
