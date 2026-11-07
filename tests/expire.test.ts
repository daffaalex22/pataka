import { describe, expect, it } from 'vitest'
import { createTestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'
import { expireStaleHolds } from '../src/services/seats'

describe('expireStaleHolds', () => {
  it('returns only expired held seats to available, leaving active holds and sold seats untouched', async () => {
    const db = await createTestDb()
    try {
      await migrate(db)
      await seed(db)

      // expired hold
      await db.query(
        "UPDATE seats SET status='held', hold_token='expired-token', hold_expires_at=now() - interval '1 minute' WHERE id='VIP-A1'",
      )
      // active hold
      await db.query(
        "UPDATE seats SET status='held', hold_token='active-token', hold_expires_at=now() + interval '5 minutes' WHERE id='VIP-A2'",
      )
      // sold seat
      await db.query("UPDATE seats SET status='sold' WHERE id='VIP-A3'")

      await expireStaleHolds(db)

      const rows = await db.query<{ id: string; status: string; hold_token: string | null }>(
        "SELECT id, status, hold_token FROM seats WHERE id IN ('VIP-A1','VIP-A2','VIP-A3') ORDER BY id",
      )
      const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
      expect(byId['VIP-A1']).toMatchObject({ status: 'available', hold_token: null })
      expect(byId['VIP-A2']).toMatchObject({ status: 'held', hold_token: 'active-token' })
      expect(byId['VIP-A3']).toMatchObject({ status: 'sold', hold_token: null })
    } finally {
      await db.close()
    }
  })
})
