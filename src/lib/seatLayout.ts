import { buildTribSeats } from './sawarga/scene/venue/layout'

export type SeatRow = {
  id: string
  categoryKey: string
  section: string
  row: string
  num: number
  x: number
  y: number
  z: number
}

/**
 * Approximate Sawarga Courtyard concert layout: VIP/CAT1/REG on the garden
 * floor in front of the north-end stage, Tribune on the second-floor balcony
 * terraces overlooking the courtyard.
 */
export function buildSummabaSeats(): SeatRow[] {
  const seats: SeatRow[] = []

  // VIP: rows A-D, 12 per row, closest to the stage (stage front at z -8.5)
  const vipRows = ['A', 'B', 'C', 'D']
  vipRows.forEach((row, r) => {
    for (let i = 0; i < 12; i++) {
      seats.push({
        id: `VIP-${row}${i + 1}`,
        categoryKey: 'VIP',
        section: 'VIP',
        row,
        num: i + 1,
        x: (i - 5.5) * 1.3,
        y: 0,
        z: -7.3 + r * 1.6,
      })
    }
  })

  // CAT1: rows E-L, 16 per row
  const cat1Rows = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
  cat1Rows.forEach((row, r) => {
    for (let i = 0; i < 16; i++) {
      seats.push({
        id: `CAT1-${row}${i + 1}`,
        categoryKey: 'CAT1',
        section: 'CAT1',
        row,
        num: i + 1,
        x: (i - 7.5) * 1.25,
        y: 0,
        z: -0.9 + r * 1.6,
      })
    }
  })

  // REG: rows M-Q, 30 per row, rear garden lawn
  const regRows = ['M', 'N', 'O', 'P', 'Q']
  regRows.forEach((row, r) => {
    for (let i = 0; i < 30; i++) {
      seats.push({
        id: `REG-${row}${i + 1}`,
        categoryKey: 'REG',
        section: 'REG',
        row,
        num: i + 1,
        x: (i - 14.5) * 1.1,
        y: 0,
        z: 11.3 + r * 1.6,
      })
    }
  })

  // TRIB: 3 stepped rows x 20 per side, re-laid on the curved
  // shell-attached balconies. Same IDs, counts, and rows as before.
  for (const seat of buildTribSeats()) {
    seats.push({
      id: seat.id,
      categoryKey: seat.categoryKey,
      section: seat.section,
      row: seat.row,
      num: seat.num,
      x: seat.x,
      y: seat.y,
      z: seat.z,
    })
  }

  return seats
}
