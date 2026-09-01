// Invoices list + create + detail (spec #27, #28, #29)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, ArrowLeft, Loader2, Receipt } from 'lucide-react'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { toast } from 'sonner'

type Invoice = {
  id: string
  invoiceCode: string
  status: string
  subtotal: number
  discount: number
  tax: number
  total: number
  paidAmount: number
  createdAt: string
  patient: { firstName: string; lastName: string; patientCode: string }
  items: Array<{ id: string; description: string; quantity: number; unitPrice: number; total: number }>
  payments: Array<{ id: string; amount: number; paymentMethod: string; paymentDate: string }>
}

type Patient = { id: string; firstName: string; lastName: string; patientCode: string }
type Service = { id: string; name: string; price: number }

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
}

export function InvoicesView() {
  const { setView, hasPermission } = useApp()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const url = `/api/invoices${statusFilter ? `?status=${statusFilter}` : ''}`
        const data = await api<{ invoices: Invoice[] }>(url)
        if (!cancelled) setInvoices(data.invoices)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [statusFilter])

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <div className="flex gap-2">
          <select
            className="h-9 px-3 border rounded-md text-sm bg-background"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="ISSUED">Issued</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {hasPermission('billing.create') && (
            <Button onClick={() => setView('invoice-new')}>
              <Plus className="w-4 h-4 mr-1.5" /> New Invoice
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Patient</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Paid</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No invoices.</td></tr>
              ) : (
                invoices.map((i) => (
                  <tr
                    key={i.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => setView('invoice-detail', i.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{i.invoiceCode}</td>
                    <td className="px-4 py-3 font-medium">{i.patient.firstName} {i.patient.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(i.createdAt)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(i.total)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(i.paidAmount)}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[i.status]} variant="secondary">
                        {i.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
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

export function InvoiceDetailView() {
  const { viewParam, setView, hasPermission } = useApp()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    if (!viewParam) return
    try {
      const data = await api<{ invoice: Invoice }>(`/api/invoices/${viewParam}`)
      setInvoice(data.invoice)
      setPaymentAmount(String(Math.max(0, data.invoice.total - data.invoice.paidAmount)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [viewParam])

  const recordPayment = async () => {
    if (!invoice) return
    setSubmitting(true)
    try {
      await api(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(paymentAmount),
          paymentMethod,
        }),
      })
      toast.success('Payment recorded successfully.')
      setShowPayment(false)
      load()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to record payment.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>
  if (!invoice) return <div className="p-6 text-muted-foreground">Invoice not found.</div>

  const balance = invoice.total - invoice.paidAmount

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => setView('invoices')}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoice {invoice.invoiceCode}</CardTitle>
            <Badge className={STATUS_COLORS[invoice.status]} variant="secondary">
              {invoice.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Patient</div>
              <div className="font-medium">{invoice.patient.firstName} {invoice.patient.lastName}</div>
              <div className="text-xs text-muted-foreground">{invoice.patient.patientCode}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Date</div>
              <div className="font-medium">{formatDate(invoice.createdAt)}</div>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-right px-3 py-2">Qty</th>
                  <th className="text-right px-3 py-2">Unit Price</th>
                  <th className="text-right px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2">{it.description}</td>
                    <td className="px-3 py-2 text-right">{it.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(it.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <Row label="Subtotal" value={formatCurrency(invoice.subtotal)} />
              <Row label="Discount" value={`- ${formatCurrency(invoice.discount)}`} />
              <Row label="Tax" value={formatCurrency(invoice.tax)} />
              <div className="border-t pt-1 mt-1 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              <Row label="Paid" value={formatCurrency(invoice.paidAmount)} accent="text-green-600" />
              <div className="border-t pt-1 mt-1 flex justify-between font-bold">
                <span>Balance</span>
                <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(balance)}</span>
              </div>
            </div>
          </div>

          {balance > 0 && hasPermission('payments.create') && !showPayment && (
            <Button onClick={() => setShowPayment(true)}>
              <Receipt className="w-4 h-4 mr-1.5" /> Record Payment
            </Button>
          )}

          {showPayment && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                  </div>
                  <div>
                    <Label>Method</Label>
                    <select
                      className="w-full h-9 px-3 border rounded-md text-sm bg-background"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="ONLINE">Online</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={recordPayment} disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                    Confirm Payment
                  </Button>
                  <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {invoice.payments.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Payment History</div>
              <div className="space-y-1">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm border-l-2 border-green-500 pl-2 py-0.5">
                    <span>{formatDateTime(p.paymentDate)} · {p.paymentMethod}</span>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent}>{value}</span>
    </div>
  )
}

export function InvoiceNewView() {
  const { viewParam, setView } = useApp()
  const [patients, setPatients] = useState<Patient[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [patientId, setPatientId] = useState(viewParam || '')
  const [items, setItems] = useState<Array<{ serviceId?: string; description: string; quantity: number; unitPrice: number }>>([
    { description: '', quantity: 1, unitPrice: 0 },
  ])
  const [discount, setDiscount] = useState('0')

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([
          api<{ patients: Patient[] }>('/api/patients?pageSize=200'),
          api<{ services: Service[] }>('/api/services'),
        ])
        setPatients(p.patients)
        setServices(s.services)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const addItem = () => setItems([...items, { description: '', quantity: 1, unitPrice: 0 }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, patch: Partial<typeof items[0]>) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0)
  const total = Math.max(0, subtotal - Number(discount || 0))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || items.length === 0) {
      toast.error('Please select a patient and add at least one item.')
      return
    }
    setSubmitting(true)
    try {
      const result = await api<{ invoice: { id: string } }>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          items: items.map((it) => ({
            serviceId: it.serviceId || null,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
          discount: Number(discount || 0),
        }),
      })
      toast.success('Invoice created.')
      setView('invoice-detail', result.invoice.id)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create invoice.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => setView('invoices')}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
      </Button>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>New Invoice</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Patient *</Label>
              <select
                className="w-full h-9 px-3 border rounded-md bg-background text-sm"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              >
                <option value="">— Select patient —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientCode})</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Items</Label>
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 md:col-span-5">
                      <select
                        className="w-full h-9 px-3 border rounded-md text-sm bg-background"
                        value={it.serviceId || ''}
                        onChange={(e) => {
                          const svc = services.find((s) => s.id === e.target.value)
                          updateItem(idx, {
                            serviceId: e.target.value || undefined,
                            description: svc?.name || it.description,
                            unitPrice: svc?.price ?? it.unitPrice,
                          })
                        }}
                      >
                        <option value="">— Custom —</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.price} EGP)</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <Input placeholder="Description" value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                    </div>
                    <div className="col-span-3 md:col-span-1">
                      <Input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <Input type="number" step="0.01" value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-12 md:col-span-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(idx)} disabled={items.length === 1}>
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" size="sm" variant="outline" className="mt-2" onClick={addItem}>
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-xs ml-auto">
              <Label>Discount</Label>
              <Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              <div className="text-sm text-muted-foreground">Subtotal</div>
              <div className="text-sm text-right">{formatCurrency(subtotal)}</div>
              <div className="text-sm font-bold">Total</div>
              <div className="text-sm font-bold text-right">{formatCurrency(total)}</div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setView('invoices')}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Create Invoice
          </Button>
        </div>
      </form>
    </div>
  )
}
