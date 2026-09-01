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
import { CommandPalette } from '@/components/layout/command-palette'
import { LoginView } from '@/components/views/login-view'
import { DashboardView } from '@/components/views/dashboard-view'
import { PatientsView } from '@/components/views/patients-view'
import { PatientNewView } from '@/components/views/patient-new-view'
import { PatientEditView } from '@/components/views/patient-edit-view'
import { PatientDetailView } from '@/components/views/patient-detail-view'
import { AppointmentsView } from '@/components/views/appointments-view'
import { AppointmentNewView } from '@/components/views/appointment-new-view'
import { AppointmentDetailView } from '@/components/views/appointment-detail-view'
import { CalendarView } from '@/components/views/calendar-view'
import { QueueView } from '@/components/views/queue-view'
import { DoctorsView } from '@/components/views/doctors-view'
import { DoctorScheduleView } from '@/components/views/doctor-schedule-view'
import { StaffView } from '@/components/views/staff-view'
import { ServicesView } from '@/components/views/services-view'
import { VisitsView, VisitNewView } from '@/components/views/visits-view'
import { VisitDetailView } from '@/components/views/visit-detail-view'
import { PrescriptionsView } from '@/components/views/prescriptions-view'
import { PrescriptionNewView } from '@/components/views/prescription-new-view'
import { InvoicesView, InvoiceDetailView, InvoiceNewView } from '@/components/views/invoices-view'
import { PaymentsView } from '@/components/views/payments-view'
import { ReportsView } from '@/components/views/reports-view'
import { AuditLogsView } from '@/components/views/audit-logs-view'
import { SettingsView } from '@/components/views/settings-view'
import { DocumentsView } from '@/components/views/documents-view'
import { LabResultsView } from '@/components/views/lab-results-view'
import { FollowUpsView } from '@/components/views/follow-ups-view'
import { BranchesView } from '@/components/views/branches-view'
import { WaitingRoomView } from '@/components/views/waiting-room-view'
import { OnlineBookingView } from '@/components/views/online-booking-view'
import { PatientPortalView } from '@/components/views/patient-portal-view'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { user, view, setUser, setView } = useApp()
  const [bootstrapping, setBootstrapping] = useState(true)
  const [paletteOpen, setPaletteOpen] = useState(false)

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

  // Command palette hotkey (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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

  // Public views — no auth required
  if (view === 'online-booking' || view === 'waiting-room' || view === 'patient-portal') {
    return (
      <>
        {renderView(view)}
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </>
    )
  }

  if (!user) {
    return (
      <>
        <LoginView />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Topbar onOpenPalette={() => setPaletteOpen(true)} />
        <main className="flex-1">{renderView(view)}</main>
        <footer className="mt-auto border-t bg-card px-4 py-3 text-xs text-muted-foreground text-center">
          Clinic Command Center · Multi-tenant Clinic Management SaaS · Built with Next.js, Prisma &amp; shadcn/ui
          <span className="ml-2 hidden md:inline">· Press <kbd className="border px-1 rounded">Ctrl+K</kbd> for commands</span>
        </footer>
      </div>

      {/* Mobile sidebar overlay */}
      {useApp.getState().sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => useApp.getState().setSidebarOpen(false)}
        />
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )

  function renderView(v: typeof view) {
    switch (v) {
      case 'dashboard': return <DashboardView />
      case 'patients': return <PatientsView />
      case 'patient-new': return <PatientNewView />
      case 'patient-edit': return <PatientEditView />
      case 'patient-detail': return <PatientDetailView />
      case 'appointments': return <AppointmentsView />
      case 'appointment-new': return <AppointmentNewView />
      case 'appointment-detail': return <AppointmentDetailView />
      case 'calendar': return <CalendarView />
      case 'queue': return <QueueView />
      case 'doctors': return <DoctorsView />
      case 'doctors-schedule': return <DoctorScheduleView />
      case 'staff': return <StaffView />
      case 'services': return <ServicesView />
      case 'visits': return <VisitsView />
      case 'visit-new': return <VisitNewView />
      case 'visit-detail': return <VisitDetailView />
      case 'prescriptions': return <PrescriptionsView />
      case 'prescription-detail': return <PrescriptionNewView />
      case 'invoices': return <InvoicesView />
      case 'invoice-detail': return <InvoiceDetailView />
      case 'invoice-new': return <InvoiceNewView />
      case 'payments': return <PaymentsView />
      case 'reports': return <ReportsView />
      case 'audit-logs': return <AuditLogsView />
      case 'settings': return <SettingsView />
      case 'documents': return <DocumentsView />
      case 'lab-results': return <LabResultsView />
      case 'follow-ups': return <FollowUpsView />
      case 'branches': return <BranchesView />
      case 'waiting-room': return <WaitingRoomView />
      case 'online-booking': return <OnlineBookingView />
      case 'patient-portal': return <PatientPortalView />
      default: return <DashboardView />
    }
  }
}
