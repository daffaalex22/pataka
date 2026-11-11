import { qrPayload, renderQrPngBase64 } from '@/lib/qr'
import { formatEventDate, formatIdr } from '@/lib/types'

export type TicketEmail = {
  to: string
  name: string
  eventName: string
  eventDateIso: string
  venue: string
  seatLabel: string
  categoryName: string
  orderCode: string
  listPriceIdr: number
  autoDiscountIdr: number
  autoDiscountName: string | null
  promoDiscountIdr: number
  promoCode: string | null
  totalIdr: number
  ticketUrl: string
}

export type EmailResult = 'sent' | 'not_configured' | 'failed'

export type EmailDeps = {
  apiKey?: string
  from?: string
  fetchImpl?: typeof fetch
  qrRenderer?: (payload: string) => Promise<string>
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

/** One label/value row in the ticket detail block. */
function detailRow(label: string, value: string): string {
  return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #efedf4;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8a8794;white-space:nowrap;vertical-align:top;width:88px">${label}</td>
      <td style="padding:8px 0;border-bottom:1px solid #efedf4;font-size:14px;line-height:1.5;color:#23222b;font-weight:600">${value}</td>
    </tr>`
}

/** Table-based, inline-styled ticket email. Email clients ignore classes and <style>. */
function buildTicketEmailHtml(
  ticket: TicketEmail,
  opts: { eventDateId: string; totalIdr: string; hasQr: boolean },
): string {
  const qrBlock = opts.hasQr
    ? `<tr><td align="center" style="padding:8px 32px 4px">
        <table role="presentation" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e6ee;border-radius:12px">
          <tr><td style="padding:14px">
            <img src="cid:tiket-qr" width="180" height="180" alt="QR check-in ${escapeHtml(ticket.orderCode)}" style="display:block;border:0" />
          </td></tr>
        </table>
      </td></tr>`
    : ''

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0a12;padding:32px 12px">
  <tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
      <tr><td style="background:#07060d;padding:24px 32px">
        <span style="color:#f5c542;font-size:18px;font-weight:700;letter-spacing:4px">✦ PATAKA</span>
      </td></tr>
      <tr><td style="padding:32px 32px 0">
        <p style="margin:0 0 12px;font-size:16px;color:#23222b">Halo ${escapeHtml(ticket.name)},</p>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#23222b">Terima kasih! Pembayaranmu terkonfirmasi — kursimu sudah terkunci.</p>
      </td></tr>
      <tr><td style="padding:20px 32px 8px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
          ${detailRow('Acara', escapeHtml(ticket.eventName))}
          ${detailRow('Waktu', escapeHtml(opts.eventDateId))}
          ${detailRow('Venue', escapeHtml(ticket.venue))}
          ${detailRow('Kursi', `${escapeHtml(ticket.seatLabel)} · ${escapeHtml(ticket.categoryName)}`)}
          ${detailRow('Harga', escapeHtml(formatIdr(ticket.listPriceIdr, 'id')))}
          ${ticket.autoDiscountIdr > 0 ? detailRow(escapeHtml(ticket.autoDiscountName ?? 'Diskon'), `-${escapeHtml(formatIdr(ticket.autoDiscountIdr, 'id'))}`) : ''}
          ${ticket.promoDiscountIdr > 0 ? detailRow(escapeHtml(ticket.promoCode ?? 'Kode promo'), `-${escapeHtml(formatIdr(ticket.promoDiscountIdr, 'id'))}`) : ''}
          ${detailRow('Total', escapeHtml(opts.totalIdr))}
          ${detailRow('Kode', escapeHtml(ticket.orderCode))}
        </table>
      </td></tr>
      ${qrBlock}
      <tr><td align="center" style="padding:20px 32px 8px">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td align="center" bgcolor="#f5c542" style="border-radius:10px">
            <a href="${escapeHtml(ticket.ticketUrl)}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:700;color:#07060d;text-decoration:none">Buka e-ticket &amp; QR →</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:12px 32px 32px">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8794">Tunjukkan QR${opts.hasQr ? ' di atas' : ''} ke panitia saat check-in di gerbang venue.<br/>— Pataka</p>
      </td></tr>
    </table>
  </td></tr>
</table>`
}

/**
 * Sends the e-ticket through a Resend-compatible HTTP API, with the signed
 * check-in QR embedded as a CID attachment. Without `RESEND_API_KEY` +
 * `EMAIL_FROM` the email is simulated as "not configured" — the ticket link
 * is still saved in the browser. If QR rendering fails, the email still goes
 * out link-only rather than not going out at all.
 */
export async function sendTicketEmail(ticket: TicketEmail, deps: EmailDeps = {}): Promise<EmailResult> {
  const apiKey = deps.apiKey ?? process.env.RESEND_API_KEY
  const from = deps.from ?? process.env.EMAIL_FROM
  if (!apiKey || !from) return 'not_configured'

  const fetchImpl = deps.fetchImpl ?? fetch
  const subject = `Tiket kamu siap — ${ticket.eventName} (${ticket.orderCode})`
  const eventDateId = formatEventDate(ticket.eventDateIso, 'id')
  const totalIdr = formatIdr(ticket.totalIdr, 'id')
  const text = [
    `Halo ${ticket.name},`,
    '',
    'Terima kasih! Pembayaranmu terkonfirmasi dan kursimu sudah terkunci.',
    '',
    `Acara: ${ticket.eventName}`,
    `Waktu: ${eventDateId}`,
    `Venue: ${ticket.venue}`,
    `Kursi: ${ticket.seatLabel} (${ticket.categoryName})`,
    `Harga: ${formatIdr(ticket.listPriceIdr, 'id')}`,
    ...(ticket.autoDiscountIdr > 0
      ? [`${ticket.autoDiscountName ?? 'Diskon'}: -${formatIdr(ticket.autoDiscountIdr, 'id')}`]
      : []),
    ...(ticket.promoDiscountIdr > 0
      ? [`${ticket.promoCode ?? 'Kode promo'}: -${formatIdr(ticket.promoDiscountIdr, 'id')}`]
      : []),
    `Kode pesanan: ${ticket.orderCode}`,
    `Total: ${totalIdr}`,
    '',
    `E-ticket + QR: ${ticket.ticketUrl}`,
    '',
    'Tunjukkan QR tersebut ke panitia saat check-in di gerbang venue.',
    '',
    '— Pataka',
  ].join('\n')

  let qrBase64: string | null = null
  try {
    const render = deps.qrRenderer ?? renderQrPngBase64
    qrBase64 = await render(qrPayload(ticket.orderCode))
  } catch {
    qrBase64 = null
  }

  const html = buildTicketEmailHtml(ticket, { eventDateId, totalIdr, hasQr: qrBase64 !== null })
  const payload: Record<string, unknown> = { from, to: [ticket.to], subject, text, html }
  if (qrBase64) {
    payload.attachments = [
      { content: qrBase64, filename: 'tiket-qr.png', content_type: 'image/png', content_id: 'tiket-qr' },
    ]
  }

  const signal =
    typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(5000) : undefined

  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    })
    return res.ok ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}
