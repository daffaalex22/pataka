import { describe, expect, it } from 'vitest'
import { createCooldown, sendTicketEmail, type TicketEmail } from '@/services/email'
import { resolveTicketOrigin } from '@/services/ticketEmail'

const ticket: TicketEmail = {
  to: 'rina@example.com',
  name: 'Rina Contoh',
  eventName: 'Bandung Innovation Week 2026',
  seatLabel: 'VIP-A3',
  orderCode: 'PTK-ABC123',
  ticketUrl: 'https://pataka.example/eticket/PTK-ABC123',
}

describe('sendTicketEmail', () => {
  it('returns not_configured without an api key or sender', async () => {
    expect(await sendTicketEmail(ticket, { apiKey: '', from: '', fetchImpl: fetchStub() })).toBe('not_configured')
    expect(await sendTicketEmail(ticket, { apiKey: 'key', from: '', fetchImpl: fetchStub() })).toBe('not_configured')
  })

  it('posts the ticket link to the email provider', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fetchImpl = fetchStub((url, init) => {
      calls.push({ url, init })
      return { ok: true, status: 200 } as Response
    })

    const result = await sendTicketEmail(ticket, { apiKey: 'key-123', from: 'tickets@pataka.test', fetchImpl })

    expect(result).toBe('sent')
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://api.resend.com/emails')
    const body = JSON.parse(String(calls[0].init.body)) as {
      to: string[]
      from: string
      subject: string
      text: string
    }
    expect(body.to).toEqual(['rina@example.com'])
    expect(body.from).toBe('tickets@pataka.test')
    expect(body.subject).toContain('PTK-ABC123')
    expect(body.text).toContain('https://pataka.example/eticket/PTK-ABC123')
    expect(body.text).toContain('VIP-A3')
  })

  it('reports failed when the provider rejects the email', async () => {
    const result = await sendTicketEmail(ticket, {
      apiKey: 'key-123',
      from: 'tickets@pataka.test',
      fetchImpl: fetchStub(() => ({ ok: false, status: 500 }) as Response),
    })
    expect(result).toBe('failed')
  })

  it('reports failed when the network call throws', async () => {
    const result = await sendTicketEmail(ticket, {
      apiKey: 'key-123',
      from: 'tickets@pataka.test',
      fetchImpl: (() => Promise.reject(new Error('offline'))) as typeof fetch,
    })
    expect(result).toBe('failed')
  })
})

describe('resolveTicketOrigin', () => {
  it('prefers the configured app URL and strips trailing slashes', () => {
    expect(resolveTicketOrigin('http://evil.test', { APP_URL: 'https://pataka.example/' })).toBe('https://pataka.example')
  })

  it('uses the Vercel deployment URL when present', () => {
    expect(resolveTicketOrigin('http://evil.test', { VERCEL_URL: 'pataka-abc.vercel.app' })).toBe(
      'https://pataka-abc.vercel.app',
    )
  })

  it('falls back to the request origin', () => {
    expect(resolveTicketOrigin('http://localhost:3000')).toBe('http://localhost:3000')
  })
})

describe('createCooldown', () => {
  it('allows the first send and blocks repeats inside the window', () => {
    const cooldown = createCooldown(60_000)
    expect(cooldown.allow('PTK-A', 1_000)).toBe(true)
    expect(cooldown.allow('PTK-A', 2_000)).toBe(false)
    expect(cooldown.allow('PTK-B', 2_000)).toBe(true)
    expect(cooldown.allow('PTK-A', 62_000)).toBe(true)
  })
})

function fetchStub(handler?: (url: string, init: RequestInit) => Response): typeof fetch {
  return ((url: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler ? handler(String(url), init ?? {}) : ({ ok: true, status: 200 } as Response))) as typeof fetch
}
