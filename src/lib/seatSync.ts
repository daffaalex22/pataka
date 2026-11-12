import type { SqlDb } from './db'
import { EVENT_VENUE } from './event'
import { buildSummabaSeats } from './seatLayout'

export type SeatSyncResult = {
  seatsUpdated: number
  totalSeats: number
  venueUpdated: boolean
}

/** Real columns round at ~1 mm; ignore differences below that. */
const COORD_EPSILON = 0.001

/**
 * Align an existing database with the current seat layout.
 *
 * Counts, IDs, statuses, holds, and orders are never changed: only x/y/z are
 * updated by ID, plus the event venue. Refuses to run on a partial match so a
 * layout change cannot silently leave some rows behind. Idempotent.
 */
export async function syncSeatLayout(db: SqlDb): Promise<SeatSyncResult> {
  const layout = buildSummabaSeats()
  const existing = await db.query<{ id: string; x: number; y: number; z: number }>(
    'SELECT id, x, y, z FROM seats',
  )

  if (existing.length === 0) {
    return { seatsUpdated: 0, totalSeats: 0, venueUpdated: false }
  }

  const existingById = new Map(existing.map((seat) => [seat.id, seat]))
  const layoutIds = new Set(layout.map((seat) => seat.id))
  const missing = layout.filter((seat) => !existingById.has(seat.id)).map((seat) => seat.id)
  const extra = existing.filter((seat) => !layoutIds.has(seat.id)).map((seat) => seat.id)

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Seat layout mismatch: ${missing.length} missing [${missing.slice(0, 5).join(', ')}], ` +
        `${extra.length} extra [${extra.slice(0, 5).join(', ')}]. Refusing a partial sync.`,
    )
  }

  let seatsUpdated = 0
  let venueUpdated = false

  await db.transaction(async (tx) => {
    for (const seat of layout) {
      const current = existingById.get(seat.id)!
      if (
        Math.abs(current.x - seat.x) > COORD_EPSILON ||
        Math.abs(current.y - seat.y) > COORD_EPSILON ||
        Math.abs(current.z - seat.z) > COORD_EPSILON
      ) {
        await tx.query('UPDATE seats SET x = $1, y = $2, z = $3 WHERE id = $4', [
          seat.x,
          seat.y,
          seat.z,
          seat.id,
        ])
        seatsUpdated += 1
      }
    }

    const events = await tx.query<{ id: number }>(
      `UPDATE events
       SET venue = $1, venue_en = $1
       WHERE id = (SELECT id FROM events ORDER BY id LIMIT 1)
         AND (venue IS DISTINCT FROM $1 OR venue_en IS DISTINCT FROM $1)
       RETURNING id`,
      [EVENT_VENUE],
    )
    venueUpdated = events.length > 0
  })

  return { seatsUpdated, totalSeats: layout.length, venueUpdated }
}
