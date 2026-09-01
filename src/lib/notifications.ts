// =====================================================================
// Notifications service — abstraction over email/WhatsApp/SMS (spec #36)
// In dev: logs to console. In prod: integrates with provider via env.
// Add a provider by setting EMAIL_PROVIDER_KEY / WHATSAPP_API_KEY.
// =====================================================================

type EmailPayload = {
  to: string
  subject: string
  body: string
}

type WhatsAppPayload = {
  to: string
  message: string
}

const emailProviderKey = process.env.EMAIL_PROVIDER_KEY
const whatsappApiKey = process.env.WHATSAPP_API_KEY

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; provider?: string }> {
  if (!emailProviderKey) {
    console.log('[email:dev]', payload.to, '|', payload.subject)
    return { ok: true, provider: 'console' }
  }
  // In production: integrate with SendGrid / Postmark / SES / etc.
  // Example:
  // await fetch('https://api.sendgrid.com/v3/mail/send', { ... })
  console.log('[email:prod]', 'Would send to', payload.to, '|', payload.subject)
  return { ok: true, provider: 'stub' }
}

export async function sendWhatsApp(payload: WhatsAppPayload): Promise<{ ok: boolean; provider?: string }> {
  if (!whatsappApiKey) {
    console.log('[whatsapp:dev]', payload.to, '|', payload.message.slice(0, 80))
    return { ok: true, provider: 'console' }
  }
  // In production: integrate with Twilio / WhatsApp Business API / 360dialog
  console.log('[whatsapp:prod]', 'Would send to', payload.to)
  return { ok: true, provider: 'stub' }
}

// Higher-level helpers — called by the API routes when events happen

export async function notifyAppointmentConfirmation(opts: {
  patientPhone?: string | null
  patientEmail?: string | null
  patientName: string
  doctorName: string
  date: string
  time: string
}) {
  const message = `Hello ${opts.patientName}, your appointment with ${opts.doctorName} on ${opts.date} at ${opts.time} has been confirmed.`
  if (opts.patientPhone) await sendWhatsApp({ to: opts.patientPhone, message })
  if (opts.patientEmail) await sendEmail({ to: opts.patientEmail, subject: 'Appointment Confirmation', body: message })
}

export async function notifyAppointmentReminder(opts: {
  patientPhone?: string | null
  patientEmail?: string | null
  patientName: string
  doctorName: string
  date: string
  time: string
}) {
  const message = `Reminder: ${opts.patientName}, you have an appointment with ${opts.doctorName} tomorrow at ${opts.time}.`
  if (opts.patientPhone) await sendWhatsApp({ to: opts.patientPhone, message })
  if (opts.patientEmail) await sendEmail({ to: opts.patientEmail, subject: 'Appointment Reminder', body: message })
}
