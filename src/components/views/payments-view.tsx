// Payments list (spec #29, #31)

'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/format'

type Payment = {
  id: string
  amount: number
  paymentMethod: string
  paymentDate: string
  reference: string | null
  invoice: { invoiceCode: string; patient: { firstName: string; lastName: string } }
  receivedBy: { name: string }
}

export function PaymentsView() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await api<{ payments: Payment[] }>('/api/payments')
        if (!cancelled) setPayments(data.payments)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const total = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Payments</h2>
        <div className="text-sm text-muted-foreground">
          Total received: <span className="font-bold text-foreground">{formatCurrency(total)}</span>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Invoice</th>
                <th className="text-left px-4 py-3">Patient</th>
                <th className="text-left px-4 py-3">Method</th>
                <th className="text-left px-4 py-3">Received By</th>
                <th className="text-right px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    No payments recorded.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(p.paymentDate)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.invoice.invoiceCode}</td>
                    <td className="px-4 py-3 font-medium">{p.invoice.patient.firstName} {p.invoice.patient.lastName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{p.paymentMethod.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.receivedBy.name}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">+{formatCurrency(p.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
