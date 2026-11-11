import { describe, expect, it } from 'vitest'
import { findNextSeat } from '@/lib/seatNavigation'
import type { Seat } from '@/lib/types'

function seat(id: string, x: number, z: number, overrides: Partial<Seat> = {}): Seat {
  return {
    id,
    section: 'CAT1',
    row: 'H',
    num: 1,
    x,
    y: 0,
    z,
    status: 'available',
    holdExpiresAt: null,
    categoryKey: 'CAT1',
    categoryName: 'CAT 1',
    categoryNameEn: 'CAT 1',
    priceIdr: 900_000,
    listPriceIdr: 900_000,
    autoDiscountIdr: 0,
    autoDiscountName: null,
    autoDiscountNameEn: null,
    autoDiscountPercent: null,
    colorHex: '#22d3ee',
    ...overrides,
  }
}

const grid = [
  seat('A', 0, 0),
  seat('B', 1, 0),
  seat('C', 2, 0),
  seat('D', 0, 1),
  seat('E', 1, 1),
  seat('F', 2, 1),
  seat('G', 0, 2),
  seat('H', 1, 2),
  seat('I', 2, 2),
]

describe('findNextSeat', () => {
  it('moves to the nearest seat on each axis', () => {
    expect(findNextSeat(grid, 'E', 'right')?.id).toBe('F')
    expect(findNextSeat(grid, 'E', 'left')?.id).toBe('D')
    expect(findNextSeat(grid, 'E', 'up')?.id).toBe('B')
    expect(findNextSeat(grid, 'E', 'down')?.id).toBe('H')
  })

  it('returns null when there is no seat in that direction', () => {
    expect(findNextSeat(grid, 'A', 'left')).toBeNull()
    expect(findNextSeat(grid, 'A', 'up')).toBeNull()
    expect(findNextSeat(grid, 'I', 'right')).toBeNull()
    expect(findNextSeat(grid, 'I', 'down')).toBeNull()
  })

  it('returns the first seat when no current seat is supplied', () => {
    expect(findNextSeat(grid, null, 'right')?.id).toBe('A')
  })

  it('returns null for an empty map', () => {
    expect(findNextSeat([], 'A', 'right')).toBeNull()
    expect(findNextSeat([], null, 'down')).toBeNull()
  })

  it('ignores the current seat', () => {
    expect(findNextSeat([seat('ONLY', 0, 0)], 'ONLY', 'right')).toBeNull()
  })

  it('prefers a close on-axis seat over a distant diagonal one', () => {
    const seats = [seat('CENTER', 0, 0), seat('NEAR', 1, 0.2), seat('FAR', 3, 3)]
    expect(findNextSeat(seats, 'CENTER', 'right')?.id).toBe('NEAR')
  })

  it('navigates by the map plane, not the balcony height', () => {
    const seats = [
      seat('CENTER', 0, 0, { y: 0 }),
      seat('BELOW', 0, 1, { y: 6 }),
      seat('RIGHT', 1, 0, { y: 0 }),
    ]
    expect(findNextSeat(seats, 'CENTER', 'down')?.id).toBe('BELOW')
  })
})
