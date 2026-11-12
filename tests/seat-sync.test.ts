import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'
import { syncSeatLayout } from '../src/lib/seatSync'
import { buildSummabaSeats } from '../src/lib/seatLayout'

let db: TestDb

beforeEach(async () => {
  db = await createTestDb()
  await migrate(db)
  await seed(db)
})

afterEach(async () => {
  await db.close()
})

describe('syncSeatLayout', () => {
  it('repairs stale floor coordinates and the event venue without touching status or orders', async () => {
    // Simulate the production drift: the old Central Plaza floor positions
    // and the old venue name, while the TRIB rows were already migrated.
    await db.query("UPDATE seats SET z = -20 WHERE id = 'VIP-A1'")
    await db.query("UPDATE seats SET z = -13.4 WHERE id = 'CAT1-E1'")
    await db.query("UPDATE seats SET z = 0.2 WHERE id = 'REG-M1'")
    await db.query(
      "UPDATE events SET venue = 'Central Plaza, Summarecon Mall Bandung', venue_en = 'Central Plaza, Summarecon Mall Bandung'",
    )

    // Status and orders must survive the coordinate sync untouched.
    await db.query("UPDATE seats SET status = 'sold' WHERE id = 'VIP-A1'")
    await db.query(
      "UPDATE seats SET status = 'held', hold_token = 'test-hold-token', hold_expires_at = now() + interval '10 minutes' WHERE id = 'CAT1-E1'",
    )
    await db.query(
      "INSERT INTO orders (code, seat_id, name, email, phone, total_idr) VALUES ('SYNC-1', 'VIP-A1', 'Rina Contoh', 'rina@example.com', '081200000001', 1500000)",
    )

    const result = await syncSeatLayout(db)

    expect(result).toEqual({ seatsUpdated: 3, totalSeats: 446, venueUpdated: true })

    const layout = new Map(buildSummabaSeats().map((seat) => [seat.id, seat]))
    const rows = await db.query<{ id: string; x: number; y: number; z: number }>(
      'SELECT id, x, y, z FROM seats',
    )
    expect(rows).toHaveLength(446)
    for (const row of rows) {
      const expected = layout.get(row.id)
      expect(expected, row.id).toBeDefined()
      expect(row.x, `${row.id} x`).toBeCloseTo(expected!.x, 3)
      expect(row.y, `${row.id} y`).toBeCloseTo(expected!.y, 3)
      expect(row.z, `${row.id} z`).toBeCloseTo(expected!.z, 3)
    }

    const [sold] = await db.query<{ status: string; hold_token: string | null }>(
      "SELECT status, hold_token FROM seats WHERE id = 'VIP-A1'",
    )
    expect(sold).toEqual({ status: 'sold', hold_token: null })

    const [held] = await db.query<{ status: string; hold_token: string | null }>(
      "SELECT status, hold_token FROM seats WHERE id = 'CAT1-E1'",
    )
    expect(held.status).toBe('held')
    expect(held.hold_token).toBe('test-hold-token')

    const orders = await db.query<{ code: string }>('SELECT code FROM orders')
    expect(orders).toEqual([{ code: 'SYNC-1' }])

    const [event] = await db.query<{ venue: string; venue_en: string }>(
      'SELECT venue, venue_en FROM events',
    )
    expect(event.venue).toBe('Sawarga Courtyard, Summarecon Mall Bandung')
    expect(event.venue_en).toBe('Sawarga Courtyard, Summarecon Mall Bandung')

    const second = await syncSeatLayout(db)
    expect(second).toEqual({ seatsUpdated: 0, totalSeats: 446, venueUpdated: false })
  })

  it('refuses to sync when the database seat set does not match the layout', async () => {
    // Corrupt one seat so a partial sync would be visible if it ran.
    await db.query("UPDATE seats SET z = -20 WHERE id = 'VIP-A2'")
    await db.query("DELETE FROM seats WHERE id = 'VIP-A1'")

    await expect(syncSeatLayout(db)).rejects.toThrow(/VIP-A1/)

    const [row] = await db.query<{ z: number }>("SELECT z FROM seats WHERE id = 'VIP-A2'")
    expect(row.z).toBe(-20)
  })

  it('refuses to sync when the database has a seat the layout does not', async () => {
    await db.query(
      `INSERT INTO seats (id, category_id, section, row, num, x, y, z, status)
       VALUES ('EXTRA-1', (SELECT id FROM ticket_categories WHERE key = 'VIP'), 'VIP', 'Z', 99, 0, 0, 0, 'available')`,
    )

    await expect(syncSeatLayout(db)).rejects.toThrow(/EXTRA-1/)
  })
})
