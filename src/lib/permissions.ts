// =====================================================================
// Permission catalog & role definitions
// =====================================================================
// Granular permissions per spec section #5. Roles are collections of
// permissions; clinic admins can extend (future). The currentUser
// helper exposes hasPermission() so UI and API can both check.
// =====================================================================

export const PERMISSIONS = [
  // Patients
  'patients.view',
  'patients.create',
  'patients.update',
  'patients.delete',
  // Appointments
  'appointments.view',
  'appointments.create',
  'appointments.update',
  'appointments.cancel',
  // Queue
  'queue.view',
  'queue.manage',
  // Medical records
  'medical_records.view',
  'medical_records.create',
  'medical_records.update',
  // Prescriptions
  'prescriptions.view',
  'prescriptions.create',
  // Billing
  'billing.view',
  'billing.create',
  'billing.update',
  'payments.create',
  // Reports
  'reports.view',
  // Staff / Doctors
  'staff.view',
  'staff.manage',
  'doctors.view',
  'doctors.manage',
  // Settings
  'settings.view',
  'settings.manage',
  // Audit logs
  'audit.view',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: [...PERMISSIONS],

  CLINIC_ADMIN: [
    'patients.view', 'patients.create', 'patients.update', 'patients.delete',
    'appointments.view', 'appointments.create', 'appointments.update', 'appointments.cancel',
    'queue.view', 'queue.manage',
    'medical_records.view', 'medical_records.create', 'medical_records.update',
    'prescriptions.view', 'prescriptions.create',
    'billing.view', 'billing.create', 'billing.update', 'payments.create',
    'reports.view',
    'staff.view', 'staff.manage',
    'doctors.view', 'doctors.manage',
    'settings.view', 'settings.manage',
    'audit.view',
  ],

  DOCTOR: [
    'patients.view',
    'appointments.view', 'appointments.update', 'appointments.cancel',
    'queue.view', 'queue.manage',
    'medical_records.view', 'medical_records.create', 'medical_records.update',
    'prescriptions.view', 'prescriptions.create',
    'billing.view',
    'reports.view',
  ],

  RECEPTIONIST: [
    'patients.view', 'patients.create', 'patients.update',
    'appointments.view', 'appointments.create', 'appointments.update', 'appointments.cancel',
    'queue.view', 'queue.manage',
    'prescriptions.view',
    'billing.view', 'billing.create', 'billing.update', 'payments.create',
  ],

  NURSE: [
    'patients.view',
    'appointments.view',
    'queue.view', 'queue.manage',
    'medical_records.view', 'medical_records.create',
    'prescriptions.view',
  ],
}

export function roleHasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? []
  return perms.includes(permission)
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CLINIC_ADMIN: 'Clinic Admin',
  DOCTOR: 'Doctor',
  RECEPTIONIST: 'Receptionist',
  NURSE: 'Nurse',
}
