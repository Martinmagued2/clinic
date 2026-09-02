// Health check endpoint (spec #32)
// Returns basic app status without exposing sensitive info.

import { NextRequest } from 'next/server'
import { apiSuccess, handleApiError } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    // Quick database connectivity check
    let dbStatus: 'ok' | 'error' = 'ok'
    try {
      await db.$queryRaw`SELECT 1`
    } catch {
      dbStatus = 'error'
    }

    return apiSuccess({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        storage: process.env.SUPABASE_URL ? 'configured' : 'local',
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
