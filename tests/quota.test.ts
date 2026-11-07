import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'
import { holdSeat } from '../src/services/seats'

let db: TestDb

beforeEach(async () => {
  db = await createTestDb()
  await migrate(db)
  await seed(db)
})

describe('category quota', () => {
  it('stops issuing holds once a category quota is reached', async () => {
    await db.query("UPDATE ticket_categories SET quota = 1 WHERE key = 'VIP'")

    const first = await holdSeat(db, 'VIP-A1')
    expect(typeof first).toBe('object')

    const second = await holdSeat(db, 'VIP-A2')
    expect(second).toBe('SEAT_UNAVAILABLE')
  })

  it('stops issuing holds when the category sales are closed', async () => {
    await db.query("UPDATE ticket_categories SET sales_open = false WHERE key = 'REG'")
    expect(await holdSeat(db, 'REG-M1')).toBe('SALES_CLOSED')
  })
})
