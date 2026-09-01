// =====================================================================
// Unit tests — permission system (spec #71)
// Run: bun run scripts/test-permissions.ts
// =====================================================================

import { roleHasPermission, PERMISSIONS, ROLE_PERMISSIONS } from '../src/lib/permissions'

let passed = 0
let failed = 0

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++
  } else {
    failed++
    console.error(`  ✗ ${msg}`)
  }
}

console.log('🧪 Testing permission system...')

// 1. Super admin has all permissions
console.log('  Super admin permissions...')
for (const p of PERMISSIONS) {
  assert(roleHasPermission('SUPER_ADMIN', p) === true, `SUPER_ADMIN should have ${p}`)
}

// 2. Clinic admin has clinical permissions but not super-admin only
console.log('  Clinic admin permissions...')
assert(roleHasPermission('CLINIC_ADMIN', 'patients.view') === true, 'CLINIC_ADMIN should view patients')
assert(roleHasPermission('CLINIC_ADMIN', 'billing.create') === true, 'CLINIC_ADMIN should create billing')
assert(roleHasPermission('CLINIC_ADMIN', 'audit.view') === true, 'CLINIC_ADMIN should view audit logs')
assert(roleHasPermission('CLINIC_ADMIN', 'settings.manage') === true, 'CLINIC_ADMIN should manage settings')

// 3. Doctor has medical but not staff management
console.log('  Doctor permissions...')
assert(roleHasPermission('DOCTOR', 'medical_records.create') === true, 'DOCTOR should create medical records')
assert(roleHasPermission('DOCTOR', 'prescriptions.create') === true, 'DOCTOR should create prescriptions')
assert(roleHasPermission('DOCTOR', 'staff.manage') === false, 'DOCTOR should NOT manage staff')
assert(roleHasPermission('DOCTOR', 'patients.delete') === false, 'DOCTOR should NOT delete patients')

// 4. Receptionist can do CRUD but not medical records
console.log('  Receptionist permissions...')
assert(roleHasPermission('RECEPTIONIST', 'patients.create') === true, 'RECEPTIONIST should create patients')
assert(roleHasPermission('RECEPTIONIST', 'appointments.create') === true, 'RECEPTIONIST should create appointments')
assert(roleHasPermission('RECEPTIONIST', 'payments.create') === true, 'RECEPTIONIST should create payments')
assert(roleHasPermission('RECEPTIONIST', 'medical_records.create') === false, 'RECEPTIONIST should NOT create medical records')
assert(roleHasPermission('RECEPTIONIST', 'prescriptions.create') === false, 'RECEPTIONIST should NOT create prescriptions')
assert(roleHasPermission('RECEPTIONIST', 'reports.view') === false, 'RECEPTIONIST should NOT view reports')

// 5. Nurse has limited permissions
console.log('  Nurse permissions...')
assert(roleHasPermission('NURSE', 'patients.view') === true, 'NURSE should view patients')
assert(roleHasPermission('NURSE', 'queue.manage') === true, 'NURSE should manage queue')
assert(roleHasPermission('NURSE', 'medical_records.create') === true, 'NURSE should create medical records')
assert(roleHasPermission('NURSE', 'billing.create') === false, 'NURSE should NOT create billing')
assert(roleHasPermission('NURSE', 'prescriptions.create') === false, 'NURSE should NOT create prescriptions')

// 6. Unknown role has no permissions
console.log('  Unknown role...')
assert(roleHasPermission('UNKNOWN', 'patients.view') === false, 'UNKNOWN role should have no permissions')

// 7. Each role's permissions are a subset of PERMISSIONS
console.log('  Permission catalog consistency...')
for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
  for (const p of perms) {
    assert(PERMISSIONS.includes(p), `${role} has unknown permission: ${p}`)
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
