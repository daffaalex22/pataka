export type TicketEmail = {
  to: string
  name: string
  eventName: string
  eventDateIso: string
  venue: string
  seatLabel: string
  categoryName: string
  orderCode: string
  totalIdr: number
  ticketUrl: string
}

export type EmailResult = 'sent' | 'not_configured' | 'failed'

export type EmailDeps = {
  apiKey?: string
  from?: string
  fetchImpl?: typeof fetch
}

/** Per-order send throttle for the email endpoint (in-memory, best effort). */
export function createCooldown(windowMs: number) {
  const last = new Map<string, number>()
  return {
    allow(key: string, now = Date.now()): boolean {
      const previous = last.get(key)
      if (previous !== undefined && now - previous < windowMs) return false
      last.set(key, now)
      return true
    },
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * Sends the e-ticket link through a Resend-compatible HTTP API.
 * Without `RESEND_API_KEY` + `EMAIL_FROM` the email is simulated as
 * "not configured" — the ticket link is still saved in the browser.
 */
export async function sendTicketEmail(ticket: TicketEmail, deps: EmailDeps = {}): Promise<EmailResult> {
  const apiKey = deps.apiKey ?? process.env.RESEND_API_KEY
  const from = deps.from ?? process.env.EMAIL_FROM
  if (!apiKey || !from) return 'not_configured'

  const fetchImpl = deps.fetchImpl ?? fetch
  const subject = `Tiket Pataka — ${ticket.orderCode}`
  const text = [
    `Halo ${ticket.name},`,
    '',
    `Tiket kamu untuk ${ticket.eventName} sudah siap.`,
    `Kursi: ${ticket.seatLabel}`,
    `Kode pesanan: ${ticket.orderCode}`,
    '',
    `E-ticket + QR: ${ticket.ticketUrl}`,
    '',
    'Tunjukkan QR tersebut ke panitia saat check-in.',
    '— Pataka (prototype)',
  ].join('\n')
  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.6">
  <p>Halo ${escapeHtml(ticket.name)},</p>
  <p>Tiket kamu untuk <strong>${escapeHtml(ticket.eventName)}</strong> sudah siap.</p>
  <p><strong>Kursi:</strong> ${escapeHtml(ticket.seatLabel)}<br/><strong>Kode pesanan:</strong> ${escapeHtml(ticket.orderCode)}</p>
  <p><a href="${escapeHtml(ticket.ticketUrl)}">Buka e-ticket &amp; QR</a></p>
  <p style="color:#666;font-size:12px">Tunjukkan QR tersebut ke panitia saat check-in. — Pataka (prototype)</p>
</div>`

  const signal =
    typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(5000) : undefined

  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [ticket.to], subject, text, html }),
      signal,
    })
    return res.ok ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}
