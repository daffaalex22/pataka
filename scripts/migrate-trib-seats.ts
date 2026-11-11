import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { getDb } from '../src/lib/db'
import { buildTribSeats } from '../src/lib/sawarga/scene/venue/layout'

/**
 * Re-lays the existing TRIB rows on the curved shell-attached balconies.
 * Idempotent: only x/y/z change; IDs, status, holds, and orders are untouched.
 */
async function main() {
  const db = await getDb()
  const seats = buildTribSeats()

  const existing = await db.query<{ id: string }>(
    `SELECT id FROM seats WHERE category_id IN (SELECT id FROM ticket_categories WHERE key = 'TRIB')`,
  )
  if (existing.length === 0) {
    throw new Error('No TRIB seats found. Run db:seed first.')
  }

  const byId = new Map(seats.map((seat) => [seat.id, seat]))
  const missing = existing.filter((row) => !byId.has(row.id))
  if (missing.length > 0) {
    throw new Error(`TRIB seats in DB without a layout match: ${missing.map((row) => row.id).join(', ')}`)
  }

  let updated = 0
  await db.transaction(async (tx) => {
    for (const seat of seats) {
      const rows = await tx.query<{ id: string }>(
        'UPDATE seats SET x = $1, y = $2, z = $3 WHERE id = $4 RETURNING id',
        [seat.x, seat.y, seat.z, seat.id],
      )
      if (rows.length === 0) {
        throw new Error(`Seat ${seat.id} is not in the database; refusing a partial migration.`)
      }
      updated += 1
    }
  })

  const sample = await db.query<{ id: string; x: number; y: number; z: number }>(
    `SELECT id, x, y, z FROM seats WHERE id IN ('TRIBL-A1', 'TRIBL-C20', 'TRIBR-A1', 'TRIBR-C20') ORDER BY id`,
  )
  console.log(`migrate-trib: ${updated} TRIB seats updated`)
  for (const row of sample) {
    console.log(`  ${row.id}: x=${row.x.toFixed(2)} y=${row.y.toFixed(2)} z=${row.z.toFixed(2)}`)
  }
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
