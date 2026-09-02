// SaaS Subscriptions API (spec #81)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { z } from 'zod'

const PLANS = {
  STARTER: { name: 'Starter', monthlyFee: 500, maxUsers: 5, maxPatients: 500 },
  PROFESSIONAL: { name: 'Professional', monthlyFee: 1500, maxUsers: 20, maxPatients: 5000 },
  ENTERPRISE: { name: 'Enterprise', monthlyFee: 5000, maxUsers: 100, maxPatients: 50000 },
}

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth()
    let subscription = await db.subscription.findUnique({ where: { clinicId: user.clinicId! }, include: { events: { orderBy: { createdAt: 'desc' }, take: 10 } } })
    if (!subscription) {
      // Auto-create trial
      subscription = await db.subscription.create({
        data: {
          clinicId: user.clinicId!,
          plan: 'STARTER',
          status: 'TRIAL',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          monthlyFee: PLANS.STARTER.monthlyFee,
        },
        include: { events: true },
      })
      await db.subscriptionEvent.create({ data: { subscriptionId: subscription.id, type: 'TRIAL_STARTED', description: '14-day trial started' } })
    }
    return apiSuccess({ subscription, plans: PLANS })
  } catch (err) { return handleApiError(err) }
}

const schema = z.object({ plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']) })

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN') return apiError('FORBIDDEN', 'Admins only.', 403)
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid plan.', 400)

    const planInfo = PLANS[parsed.data.plan]
    let subscription = await db.subscription.findUnique({ where: { clinicId: user.clinicId! } })
    const oldPlan = subscription?.plan

    if (!subscription) {
      subscription = await db.subscription.create({ data: { clinicId: user.clinicId!, plan: parsed.data.plan, status: 'ACTIVE', monthlyFee: planInfo.monthlyFee, startDate: new Date() } })
    } else {
      subscription = await db.subscription.update({ where: { id: subscription.id }, data: { plan: parsed.data.plan, status: 'ACTIVE', monthlyFee: planInfo.monthlyFee } })
    }

    await db.subscriptionEvent.create({ data: { subscriptionId: subscription.id, type: oldPlan ? 'UPGRADED' : 'SUBSCRIBED', description: `Plan changed from ${oldPlan || 'none'} to ${parsed.data.plan}` } })

    return apiSuccess({ subscription, plans: PLANS })
  } catch (err) { return handleApiError(err) }
}
