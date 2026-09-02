// Subscription / SaaS billing view (spec #81)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'

type Subscription = { id: string; plan: string; status: string; startDate: string; trialEndsAt: string | null; monthlyFee: number; events: Array<{ id: string; type: string; description: string | null; createdAt: string }> }
type Plans = Record<string, { name: string; monthlyFee: number; maxUsers: number; maxPatients: number }>

export function SubscriptionView() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plans>({})
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

  const load = async () => { try { const d = await api<{ subscription: Subscription; plans: Plans }>('/api/subscriptions'); setSubscription(d.subscription); setPlans(d.plans) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  const upgrade = async (plan: string) => {
    setUpgrading(true)
    try { await api('/api/subscriptions', { method: 'POST', body: JSON.stringify({ plan }) }); toast.success(`Upgraded to ${plan}.`); load() } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Failed.') } finally { setUpgrading(false) }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h2 className="text-lg font-semibold">Subscription & Billing</h2>

      {subscription && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-muted-foreground">Current Plan</div>
                <div className="text-2xl font-bold">{plans[subscription.plan]?.name || subscription.plan}</div>
              </div>
              <Badge variant={subscription.status === 'ACTIVE' ? 'default' : 'secondary'}>{subscription.status}</Badge>
            </div>
            <div className="text-sm text-muted-foreground space-y-0.5">
              <div>Monthly fee: {formatCurrency(subscription.monthlyFee)}</div>
              <div>Started: {formatDate(subscription.startDate)}</div>
              {subscription.trialEndsAt && <div>Trial ends: {formatDate(subscription.trialEndsAt)}</div>}
            </div>
            {subscription.events.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <div className="text-xs font-medium uppercase text-muted-foreground mb-2">Recent Events</div>
                <div className="space-y-1">
                  {subscription.events.slice(0, 5).map((e) => (
                    <div key={e.id} className="text-xs flex justify-between"><span>{e.type.replace(/_/g, ' ')}: {e.description}</span><span className="text-muted-foreground">{formatDate(e.createdAt)}</span></div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <div className="text-sm font-medium mb-3">Available Plans</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(plans).map(([key, plan]) => (
            <Card key={key} className={subscription?.plan === key ? 'border-primary' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  {key === 'ENTERPRISE' && <Crown className="w-4 h-4 text-amber-500" />}
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                </div>
                <div className="text-2xl font-bold mb-3">{formatCurrency(plan.monthlyFee)}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <div className="space-y-1.5 text-sm mb-4">
                  <div className="flex items-center gap-2"><Check className="w-3 h-3 text-green-600" /> Up to {plan.maxUsers} users</div>
                  <div className="flex items-center gap-2"><Check className="w-3 h-3 text-green-600" /> Up to {plan.maxPatients} patients</div>
                  <div className="flex items-center gap-2"><Check className="w-3 h-3 text-green-600" /> All core features</div>
                  {key !== 'STARTER' && <div className="flex items-center gap-2"><Check className="w-3 h-3 text-green-600" /> Advanced reports</div>}
                  {key === 'ENTERPRISE' && <div className="flex items-center gap-2"><Check className="w-3 h-3 text-green-600" /> Multi-branch + API</div>}
                </div>
                <Button className="w-full" variant={subscription?.plan === key ? 'outline' : 'default'} disabled={subscription?.plan === key || upgrading} onClick={() => upgrade(key)}>
                  {subscription?.plan === key ? 'Current Plan' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
