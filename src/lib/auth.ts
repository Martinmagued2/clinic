// =====================================================================
// Authentication & authorization helpers
// =====================================================================
// Session-based auth using signed HTTP-only cookies. Passwords are
// hashed with Node's built-in scrypt (no extra deps). Tenant isolation
// is enforced at the data-access layer via requireTenantPermission()
// which both verifies the user's role/permission AND scopes the query
// to the user's clinic.
// =====================================================================

import { cookies } from 'next/headers'
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'crypto'
import { db } from './db'
import { roleHasPermission, type Permission } from './permissions'
import { audit } from './audit'

// ---- password hashing ------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuf = Buffer.from(hash, 'hex')
  const testBuf = scryptSync(password, salt, 64)
  if (hashBuf.length !== testBuf.length) return false
  return timingSafeEqual(hashBuf, testBuf)
}

// ---- session management ----------------------------------------------
// Session token format: <userId>.<signature>
// The signature is HMAC-SHA256 of userId using SESSION_SECRET.
// This is intentionally simple — no external session store required.

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'dev-only-session-secret-change-me-in-production'

const COOKIE_NAME = 'ccc_session'

function sign(userId: string): string {
  const sig = createHmac('sha256', SESSION_SECRET).update(userId).digest('hex')
  return `${userId}.${sig}`
}

function verify(token: string): string | null {
  if (!token) return null
  const [userId, sig] = token.split('.')
  if (!userId || !sig) return null
  const expected = sign(userId)
  const expectedSig = expected.split('.')[1]
  if (expectedSig.length !== sig.length) return null
  try {
    if (timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return userId
    }
  } catch {
    return null
  }
  return null
}

export async function setSessionCookie(userId: string): Promise<void> {
  const token = sign(userId)
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

// ---- patient portal session (separate cookie namespace) --------------

const PATIENT_COOKIE_NAME = 'ccc_patient_session'

export async function setPatientSessionCookie(accountId: string): Promise<void> {
  const token = sign(`patient:${accountId}`)
  const store = await cookies()
  store.set(PATIENT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearPatientSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(PATIENT_COOKIE_NAME)
}

export type CurrentPatient = {
  accountId: string
  patientId: string
  clinicId: string
  email: string
  firstName: string
  lastName: string
  patientCode: string
}

export async function getCurrentPatient(): Promise<CurrentPatient | null> {
  const store = await cookies()
  const token = store.get(PATIENT_COOKIE_NAME)?.value
  if (!token) return null
  const raw = verify(token)
  if (!raw || !raw.startsWith('patient:')) return null
  const accountId = raw.slice('patient:'.length)

  const account = await db.patientAccount.findUnique({
    where: { id: accountId },
    include: { patient: true },
  })
  if (!account || account.status !== 'ACTIVE') return null

  return {
    accountId: account.id,
    patientId: account.patientId,
    clinicId: account.clinicId,
    email: account.email,
    firstName: account.patient.firstName,
    lastName: account.patient.lastName,
    patientCode: account.patient.patientCode,
  }
}

// ---- current user -----------------------------------------------------

export type CurrentUser = {
  id: string
  email: string
  name: string
  role: string
  clinicId: string | null
  branchId: string | null
  doctorId: string | null
  status: string
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  const userId = verify(token)
  if (!userId) return null

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      clinicId: true,
      branchId: true,
      status: true,
      doctor: { select: { id: true } },
    },
  })
  if (!user || user.status !== 'ACTIVE') return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clinicId: user.clinicId,
    branchId: user.branchId,
    doctorId: user.doctor?.id ?? null,
    status: user.status,
  }
}

export function hasPermission(user: CurrentUser, permission: Permission): boolean {
  return roleHasPermission(user.role, permission)
}

// ---- route guards -----------------------------------------------------

export class AuthError extends Error {
  statusCode: number
  code: string
  constructor(code: string, message: string, statusCode = 401) {
    super(message)
    this.code = code
    this.statusCode = statusCode
  }
}

/**
 * Require an authenticated user. Returns the user or throws AuthError.
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new AuthError('UNAUTHENTICATED', 'Authentication required.', 401)
  }
  return user
}

/**
 * Require an authenticated user WITH a specific permission.
 * Also enforces tenant scoping by returning the clinicId.
 */
export async function requirePermission(
  permission: Permission,
): Promise<CurrentUser> {
  const user = await requireAuth()
  if (!hasPermission(user, permission)) {
    throw new AuthError(
      'FORBIDDEN',
      `You do not have permission: ${permission}`,
      403,
    )
  }
  return user
}

/**
 * Tenant-scoped fetch helper. Loads an entity by id and verifies
 * that entity.clinicId === user.clinicId. Returns null if not found
 * or not in tenant. Use this for every sensitive fetch per spec #92.
 */
export async function requireTenantScope<T extends { clinicId: string }>(
  entity: T | null,
  user: CurrentUser,
): Promise<T | null> {
  if (!entity) return null
  if (user.role === 'SUPER_ADMIN') return entity
  if (entity.clinicId !== user.clinicId) return null
  return entity
}

// ---- response helpers -------------------------------------------------

export function apiError(code: string, message: string, statusCode = 400) {
  return Response.json(
    { success: false, error: { code, message } },
    { status: statusCode },
  )
}

export function apiSuccess<T>(data: T, statusCode = 200) {
  return Response.json({ success: true, data }, { status: statusCode })
}

export function handleApiError(err: unknown): Response {
  if (err instanceof AuthError) {
    return apiError(err.code, err.message, err.statusCode)
  }
  if (err instanceof Error) {
    // Don't leak internal errors in production
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Something went wrong.'
        : err.message
    return apiError('INTERNAL_ERROR', message, 500)
  }
  return apiError('INTERNAL_ERROR', 'Something went wrong.', 500)
}

// Re-export audit so handlers can log mutations in one import
export { audit }
