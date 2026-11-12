import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'

let db: TestDb

beforeEach(async () => {
  db = await createTestDb()
})

afterEach(async () => {
  await db.close()
})

describe('discount schema', () => {
  it('creates the discounts table and order breakdown columns', async () => {
    await migrate(db)

    const [row] = await db.query<{ id: number }>(
      `INSERT INTO discounts (kind, code, name, name_en, type, value)
       VALUES ('code', 'TEST10', 'Test', 'Test', 'percent', 10)
       RETURNING id`,
    )
    expect(row.id).toBeTypeOf('number')

    const orders = await db.query(
      `SELECT list_price_idr, auto_discount_idr, auto_discount_name,
              promo_discount_idr, promo_code
       FROM orders`,
    )
    expect(orders).toEqual([])
  })

  it('can run twice without error', async () => {
    await migrate(db)
    await migrate(db)
  })

  it('backfills list_price_idr for orders that predate the column', async () => {
    await migrate(db)
    await seed(db)
    await db.query(
      `INSERT INTO orders (code, seat_id, name, email, phone, total_idr)
       VALUES ('PTK-OLD', 'VIP-A1', 'Old Buyer', 'old@example.com', '0800000000', 1500000)`,
    )

    await migrate(db)

    const [row] = await db.query<{ list_price_idr: number }>(
      "SELECT list_price_idr FROM orders WHERE code = 'PTK-OLD'",
    )
    expect(row.list_price_idr).toBe(1_500_000)
  })
})
