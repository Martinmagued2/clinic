// Printable prescription — returns an HTML page suitable for printing (spec #25)
// The frontend can open this in a new tab and call window.print().

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, handleApiError } from '@/lib/auth'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('prescriptions.view')
    const { id } = await params

    const rx = await db.prescription.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
        items: { include: { medication: true } },
      },
    })
    if (!rx || rx.clinicId !== user.clinicId) {
      return new Response('Not found', { status: 404 })
    }

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Prescription ${rx.prescriptionCode}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0ea5e9; padding-bottom: 16px; margin-bottom: 24px; }
  .clinic-name { font-size: 22px; font-weight: bold; color: #0ea5e9; }
  .clinic-info { font-size: 12px; color: #666; margin-top: 4px; }
  .rx-badge { font-size: 32px; font-weight: bold; color: #0ea5e9; font-family: serif; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .info-item { font-size: 13px; }
  .info-label { color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-value { font-weight: 500; margin-top: 2px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #0ea5e9; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; }
  td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .notes { font-size: 13px; background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 8px; }
  .signature { margin-top: 60px; display: flex; justify-content: space-between; }
  .sig-line { border-top: 1px solid #999; padding-top: 6px; font-size: 12px; width: 200px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="position:fixed;top:20px;right:20px;padding:10px 20px;background:#0ea5e9;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">Print</button>
  <div class="header">
    <div>
      <div class="clinic-name">${rx.clinic.name}</div>
      <div class="clinic-info">
        ${rx.clinic.address || ''} ${rx.clinic.phone ? '· ' + rx.clinic.phone : ''} ${rx.clinic.email ? '· ' + rx.clinic.email : ''}
      </div>
    </div>
    <div class="rx-badge">Rx</div>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Patient</div>
      <div class="info-value">${rx.patient.firstName} ${rx.patient.lastName}</div>
      <div style="font-size: 11px; color: #999;">${rx.patient.patientCode}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Prescription Code</div>
      <div class="info-value">${rx.prescriptionCode}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Doctor</div>
      <div class="info-value">${rx.doctor.name}</div>
      <div style="font-size: 11px; color: #999;">${rx.doctor.specialty}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Date</div>
      <div class="info-value">${new Date(rx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Medications</div>
    <table>
      <thead>
        <tr>
          <th>Medication</th>
          <th>Strength</th>
          <th>Dosage</th>
          <th>Frequency</th>
          <th>Duration</th>
          <th>Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${rx.items.map((item) => `
          <tr>
            <td><strong>${item.medicationName}</strong></td>
            <td>${item.strength || '—'}</td>
            <td>${item.dosage || '—'}</td>
            <td>${item.frequency || '—'}</td>
            <td>${item.duration || '—'}</td>
            <td>${item.instructions || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${rx.notes ? `<div class="section"><div class="section-title">Notes</div><div class="notes">${rx.notes}</div></div>` : ''}

  <div class="signature">
    <div class="sig-line">
      ${rx.doctor.name}<br>
      ${rx.doctor.specialty}${rx.doctor.licenseNumber ? ' · License: ' + rx.doctor.licenseNumber : ''}
    </div>
  </div>

  <div class="footer">
    This prescription was generated electronically by ${rx.clinic.name}. Please verify with the prescribing doctor if in doubt.
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
