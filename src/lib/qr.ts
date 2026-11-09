import { createHmac, timingSafeEqual } from 'node:crypto'
import { toBuffer } from 'qrcode'

function secret() {
  const value = process.env.CHECKIN_SECRET
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CHECKIN_SECRET must be set in production')
    }
    return 'dev-secret'
  }
  return value
}

function sign(orderCode: string) {
  return createHmac('sha256', secret()).update(orderCode).digest('hex').slice(0, 16)
}

/** Signed QR payload: PTK|<orderCode>|<hmac16> — check-in validates the signature offline. */
export function qrPayload(orderCode: string): string {
  return `PTK|${orderCode}|${sign(orderCode)}`
}

/** Renders a QR payload as a base64 PNG for email embedding (dark modules on white). */
export async function renderQrPngBase64(payload: string): Promise<string> {
  const buffer = await toBuffer(payload, {
    errorCorrectionLevel: 'M',
    width: 360,
    margin: 2,
    color: { dark: '#07060d', light: '#ffffff' },
  })
  return buffer.toString('base64')
}

export function parseQrPayload(payload: string): { orderCode: string } | null {
  const parts = payload.split('|')
  if (parts.length !== 3 || parts[0] !== 'PTK' || !parts[1] || !parts[2]) return null
  const expected = sign(parts[1])
  const given = parts[2]
  if (given.length !== expected.length) return null
  const valid = timingSafeEqual(Buffer.from(given, 'utf8'), Buffer.from(expected, 'utf8'))
  return valid ? { orderCode: parts[1] } : null
}
