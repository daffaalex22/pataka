import { describe, expect, it } from 'vitest'
import { buildIcs } from '../src/lib/ics'

describe('ics', () => {
  it('builds a valid single-event calendar for the ticket', () => {
    const ics = buildIcs({
      code: 'PTK-ABC123',
      name: 'Rina Contoh',
      seatLabel: 'VIP-A3',
      startsAt: '2026-11-14T19:00:00+07:00',
      venue: 'Central Plaza, Summarecon Mall Bandung',
      title: 'Bandung Innovation Week 2026 — Closing Night Concert',
    })
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('UID:PTK-ABC123@pataka')
    expect(ics).toContain('DTSTART:20261114T120000Z')
    expect(ics).toContain('DTEND:20261114T150000Z')
    expect(ics).toContain('SUMMARY:')
    expect(ics).toContain('VIP-A3')
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true)
  })
})
