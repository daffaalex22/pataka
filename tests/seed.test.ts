import { describe, expect, it } from 'vitest'
import { createTestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'

describe('seed', () => {
  it('creates the event, four ticket categories, and 446 available seats', async () => {
    const db = await createTestDb()
    try {
      await migrate(db)
      await seed(db)

      const events = await db.query<{ name: string }>('SELECT name FROM events')
      expect(events).toHaveLength(1)
      expect(events[0].name).toContain('Closing Night Concert')

      const categories = await db.query<{ key: string; price_idr: number }>(
        'SELECT key, price_idr FROM ticket_categories ORDER BY sort_order',
      )
      expect(categories.map((c) => c.key)).toEqual(['VIP', 'CAT1', 'TRIB', 'REG'])
      expect(categories.map((c) => c.price_idr)).toEqual([1500000, 900000, 600000, 350000])

      const counts = await db.query<{ section: string; count: number }>(
        'SELECT section, count(*)::int AS count FROM seats GROUP BY section ORDER BY section',
      )
      expect(Object.fromEntries(counts.map((c) => [c.section, c.count]))).toEqual({
        CAT1: 128,
        REG: 150,
        TRIBL: 60,
        TRIBR: 60,
        VIP: 48,
      })

      const [{ count: total }] = await db.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM seats',
      )
      expect(total).toBe(446)

      const [{ count: available }] = await db.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM seats WHERE status = 'available'",
      )
      expect(available).toBe(446)

      const samples = await db.query<{ id: string; x: number; z: number }>(
        "SELECT id, x, z FROM seats WHERE id IN ('VIP-A1', 'TRIBL-A1', 'REG-M1') ORDER BY id",
      )
      expect(samples).toHaveLength(3)
      for (const seat of samples) expect(Number.isFinite(seat.x) && Number.isFinite(seat.z)).toBe(true)
    } finally {
      await db.close()
    }
  })
})
