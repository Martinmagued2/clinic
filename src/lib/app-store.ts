// =====================================================================
// SPA app store: current user, current view, sidebar open state.
// The single visible route is "/", so navigation is state-based.
// =====================================================================

import { create } from 'zustand'
import type { Permission } from './permissions'
import { roleHasPermission } from './permissions'

export type AppView =
  | 'dashboard'
  | 'patients'
  | 'patient-detail'
  | 'patient-new'
  | 'patient-edit'
  | 'appointments'
  | 'appointment-new'
  | 'appointment-detail'
  | 'calendar'
  | 'queue'
  | 'doctors'
  | 'staff'
  | 'services'
  | 'visits'
  | 'visit-new'
  | 'visit-detail'
  | 'prescriptions'
  | 'prescription-detail'
  | 'invoices'
  | 'invoice-detail'
  | 'invoice-new'
  | 'payments'
  | 'reports'
  | 'audit-logs'
  | 'settings'
  | 'documents'
  | 'lab-results'
  | 'follow-ups'
  | 'online-booking'
  | 'patient-portal'
  | 'waiting-room'
  | 'branches'
  | 'doctors-schedule'

type AppState = {
  user: {
    id: string
    email: string
    name: string
    role: string
    clinicId: string | null
    branchId: string | null
    doctorId: string | null
  } | null
  view: AppView
  viewParam: string | null // e.g. patient id, invoice id
  sidebarOpen: boolean

  setUser: (u: AppState['user']) => void
  setView: (v: AppView, param?: string | null) => void
  setSidebarOpen: (open: boolean) => void
  hasPermission: (p: Permission) => boolean
  logout: () => void
}

export const useApp = create<AppState>((set, get) => ({
  user: null,
  view: 'dashboard',
  viewParam: null,
  sidebarOpen: true,

  setUser: (u) => set({ user: u }),
  setView: (v, param = null) => set({ view: v, viewParam: param, sidebarOpen: false }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  hasPermission: (p) => {
    const user = get().user
    if (!user) return false
    return roleHasPermission(user.role, p)
  },
  logout: () => set({ user: null, view: 'dashboard', viewParam: null }),
}))
