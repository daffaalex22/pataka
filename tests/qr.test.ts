import { describe, expect, it } from 'vitest'
import { parseQrPayload, qrPayload, renderQrPngBase64 } from '../src/lib/qr'

process.env.CHECKIN_SECRET = 'test-secret'

describe('qr payload', () => {
  it('signs an order code with an HMAC signature', () => {
    const payload = qrPayload('PTK-ABC123')
    expect(payload).toMatch(/^PTK\|PTK-ABC123\|[0-9a-f]{16}$/)
  })

  it('parses its own payload back to the order code', () => {
    expect(parseQrPayload(qrPayload('PTK-ABC123'))).toEqual({ orderCode: 'PTK-ABC123' })
  })

  it('rejects tampered signatures and unknown formats', () => {
    expect(parseQrPayload('PTK|PTK-ABC123|0000000000000000')).toBeNull()
    expect(parseQrPayload('NOPE|PTK-ABC123|deadbeefdeadbeef')).toBeNull()
    expect(parseQrPayload('garbage')).toBeNull()
  })
})

describe('renderQrPngBase64', () => {
  it('renders the payload as a base64 PNG', async () => {
    const base64 = await renderQrPngBase64('PTK|PTK-ABC123|deadbeefdeadbeef')
    expect(base64.startsWith('iVBORw0KGgo')).toBe(true) // PNG magic in base64
    expect(base64.length).toBeGreaterThan(500)
  })
})
