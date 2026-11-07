import { createHmac, timingSafeEqual } from 'node:crypto'

function secret() {
  return process.env.CHECKIN_SECRET ?? 'dev-secret'
}

function sign(orderCode: string) {
  return createHmac('sha256', secret()).update(orderCode).digest('hex').slice(0, 16)
}

/** Signed QR payload: PTK|<orderCode>|<hmac16> — check-in validates the signature offline. */
export function qrPayload(orderCode: string): string {
  return `PTK|${orderCode}|${sign(orderCode)}`
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
