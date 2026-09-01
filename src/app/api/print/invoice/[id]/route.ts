// Printable invoice — returns HTML for printing (spec #28)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, handleApiError } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('billing.view')
    const { id } = await params

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        patient: true,
        clinic: true,
        items: true,
        payments: true,
        refunds: true,
      },
    })
    if (!invoice || invoice.clinicId !== user.clinicId) {
      return new Response('Not found', { status: 404 })
    }

    const totalRefunds = invoice.refunds.reduce((s, r) => s + r.amount, 0)
    const balance = invoice.total - invoice.paidAmount

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice ${invoice.invoiceCode}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0ea5e9; padding-bottom: 16px; margin-bottom: 24px; }
  .clinic-name { font-size: 22px; font-weight: bold; color: #0ea5e9; }
  .clinic-info { font-size: 12px; color: #666; margin-top: 4px; }
  .invoice-title { font-size: 24px; font-weight: bold; }
  .invoice-meta { font-size: 12px; color: #666; text-align: right; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .info-label { color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-value { font-weight: 500; margin-top: 2px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
  th { text-align: left; padding: 10px 8px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; }
  td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
  .totals { margin-left: auto; width: 280px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .total { border-top: 2px solid #1a1a1a; margin-top: 8px; padding-top: 8px; font-weight: bold; font-size: 16px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
  .badge-paid { background: #dcfce7; color: #166534; }
  .badge-issued { background: #dbeafe; color: #1e40af; }
  .badge-partial { background: #fef3c7; color: #92400e; }
  .badge-refunded { background: #f3e8ff; color: #6b21a8; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="position:fixed;top:20px;right:20px;padding:10px 20px;background:#0ea5e9;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">Print</button>
  <div class="header">
    <div>
      <div class="clinic-name">${invoice.clinic.name}</div>
      <div class="clinic-info">
        ${invoice.clinic.address || ''} ${invoice.clinic.phone ? '· ' + invoice.clinic.phone : ''} ${invoice.clinic.email ? '· ' + invoice.clinic.email : ''}
      </div>
    </div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-meta">
        <strong>${invoice.invoiceCode}</strong><br>
        ${new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}<br>
        <span class="badge badge-${invoice.status.toLowerCase().replace(/_/g, '-')}">${invoice.status.replace(/_/g, ' ')}</span>
      </div>
    </div>
  </div>

  <div class="info-grid">
    <div>
      <div class="info-label">Bill To</div>
      <div class="info-value">${invoice.patient.firstName} ${invoice.patient.lastName}</div>
      <div style="font-size: 11px; color: #999;">${invoice.patient.patientCode}</div>
      ${invoice.patient.phone ? `<div style="font-size: 11px; color: #999;">${invoice.patient.phone}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: right;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((item) => `
        <tr>
          <td>${item.description}</td>
          <td style="text-align: right;">${item.quantity}</td>
          <td style="text-align: right;">${item.unitPrice.toFixed(2)} ${invoice.clinic.currency}</td>
          <td style="text-align: right; font-weight: 500;">${item.total.toFixed(2)} ${invoice.clinic.currency}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${invoice.subtotal.toFixed(2)} ${invoice.clinic.currency}</span></div>
    ${invoice.discount > 0 ? `<div><span>Discount</span><span>- ${invoice.discount.toFixed(2)} ${invoice.clinic.currency}</span></div>` : ''}
    ${invoice.tax > 0 ? `<div><span>Tax</span><span>${invoice.tax.toFixed(2)} ${invoice.clinic.currency}</span></div>` : ''}
    <div class="total"><span>Total</span><span>${invoice.total.toFixed(2)} ${invoice.clinic.currency}</span></div>
    <div><span>Paid</span><span style="color: #16a34a;">${invoice.paidAmount.toFixed(2)} ${invoice.clinic.currency}</span></div>
    ${totalRefunds > 0 ? `<div><span>Refunded</span><span style="color: #dc2626;">- ${totalRefunds.toFixed(2)} ${invoice.clinic.currency}</span></div>` : ''}
    <div style="border-top: 1px solid #999; margin-top: 8px; padding-top: 8px; font-weight: bold;">
      <span>Balance Due</span>
      <span style="color: ${balance > 0 ? '#dc2626' : '#16a34a'};">${Math.max(0, balance).toFixed(2)} ${invoice.clinic.currency}</span>
    </div>
  </div>

  ${invoice.payments.length > 0 ? `
    <div style="margin-top: 24px;">
      <div style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Payment History</div>
      <table>
        <thead>
          <tr><th>Date</th><th>Method</th><th>Reference</th><th style="text-align: right;">Amount</th></tr>
        </thead>
        <tbody>
          ${invoice.payments.map((p) => `
            <tr>
              <td>${new Date(p.paymentDate).toLocaleDateString('en-GB')}</td>
              <td>${p.paymentMethod.replace(/_/g, ' ')}</td>
              <td>${p.reference || '—'}</td>
              <td style="text-align: right;">${p.amount.toFixed(2)} ${invoice.clinic.currency}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''}

  <div class="footer">
    Thank you for choosing ${invoice.clinic.name}. This invoice was generated electronically.
  </div>
</body>
</html>`

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
