// =====================================================================
// Audit log helper — wraps db.auditLog.create with safe JSON
// serialization and never throws (audit failures must not break the
// main request flow per spec #48).
// =====================================================================

import { db } from './db'

export async function audit(params: {
  clinicId?: string | null
  userId?: string | null
  action: string
  entityType?: string
  entityId?: string
  oldValues?: unknown
  newValues?: unknown
  ipAddress?: string | null
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        clinicId: params.clinicId ?? null,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        ipAddress: params.ipAddress ?? null,
      },
    })
  } catch (err) {
    // Audit failures must not break business operations.
    console.error('[audit] failed to write audit log:', err)
  }
}
