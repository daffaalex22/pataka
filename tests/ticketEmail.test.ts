import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'
import { holdSeat } from '../src/services/seats'
import { createOrder, payOrder } from '../src/services/orders'
import { loadTicketEmail } from '../src/services/ticketEmail'

let db: TestDb

beforeEach(async () => {
  db = await createTestDb()
  await migrate(db)
  await seed(db)
})

describe('loadTicketEmail', () => {
  it('carries event time, venue, category, and total for a paid order', async () => {
    const held = await holdSeat(db, 'VIP-A8')
    if (typeof held === 'string') throw new Error('hold failed')
    const order = await createOrder(db, {
      holdToken: held.holdToken,
      name: 'Rina Contoh',
      email: 'rina@example.com',
      phone: '081200000001',
    })
    if (typeof order === 'string') throw new Error('order failed')
    await payOrder(db, order.orderCode, 'ewallet')

    const loaded = await loadTicketEmail(db, order.orderCode, 'https://pataka.example')
    expect(loaded?.status).toBe('paid')
    expect(loaded?.ticket.eventDateIso).toBe('2026-11-14T12:00:00.000Z')
    expect(loaded?.ticket.venue).toBe('Sawarga Courtyard, Summarecon Mall Bandung')
    expect(loaded?.ticket.seatLabel).toBe('VIP-A8')
    const [{ price }] = await db.query<{ price: number }>(
      `SELECT c.price_idr AS price FROM seats s JOIN ticket_categories c ON c.id = s.category_id WHERE s.id = 'VIP-A8'`,
    )
    expect(loaded?.ticket.totalIdr).toBe(price)
    expect(loaded?.ticket.listPriceIdr).toBe(price)
    expect(loaded?.ticket.autoDiscountIdr).toBe(0)
    expect(loaded?.ticket.promoDiscountIdr).toBe(0)
    expect(loaded?.ticket.promoCode).toBeNull()
    expect(loaded?.ticket.categoryName.length ?? 0).toBeGreaterThan(0)
  })
})
