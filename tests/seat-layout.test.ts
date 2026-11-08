import { describe, expect, it } from 'vitest'
import { buildSummabaSeats } from '@/lib/seatLayout'

const seats = buildSummabaSeats()

describe('buildSummabaSeats', () => {
  it('produces 446 seats with the approved category split', () => {
    expect(seats).toHaveLength(446)
    const count = (key: string) => seats.filter((seat) => seat.categoryKey === key).length
    expect(count('VIP')).toBe(48)
    expect(count('CAT1')).toBe(128)
    expect(count('TRIB')).toBe(120)
    expect(count('REG')).toBe(150)
  })

  it('keeps the existing seat ID scheme', () => {
    const ids = new Set(seats.map((seat) => seat.id))
    for (const id of ['VIP-A1', 'VIP-D12', 'CAT1-E1', 'CAT1-L16', 'REG-M1', 'REG-Q30', 'TRIBL-A1', 'TRIBR-C20']) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it('places ground seats on the courtyard floor', () => {
    for (const seat of seats.filter((entry) => entry.categoryKey !== 'TRIB')) {
      expect(seat.y).toBe(0)
      expect(Math.abs(seat.x)).toBeLessThanOrEqual(22)
      expect(seat.z).toBeGreaterThanOrEqual(-8)
      expect(seat.z).toBeLessThanOrEqual(18)
    }
  })

  it('places tribune seats on the second-floor balconies', () => {
    for (const seat of seats.filter((entry) => entry.categoryKey === 'TRIB')) {
      expect(seat.y).toBeGreaterThanOrEqual(5.2)
      expect(Math.abs(seat.x)).toBeGreaterThanOrEqual(14)
      expect(Math.abs(seat.x)).toBeLessThanOrEqual(20)
      expect(seat.z).toBeGreaterThanOrEqual(-14)
      expect(seat.z).toBeLessThanOrEqual(14)
    }
  })

  it('keeps every pair of seats at least 0.8 units apart', () => {
    for (let a = 0; a < seats.length; a++) {
      for (let b = a + 1; b < seats.length; b++) {
        const dx = seats[a].x - seats[b].x
        const dy = seats[a].y - seats[b].y
        const dz = seats[a].z - seats[b].z
        const distance = Math.hypot(dx, dy, dz)
        expect(distance, `${seats[a].id} vs ${seats[b].id}`).toBeGreaterThanOrEqual(0.8)
      }
    }
  })
})
