import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'
import { holdSeat } from '../src/services/seats'
import { createOrder } from '../src/services/orders'
import { createDiscount } from '../src/services/discounts'

let db: TestDb

beforeEach(async () => {
  db = await createTestDb()
  await migrate(db)
  await seed(db)
})

afterEach(async () => {
  await db.close()
})

async function holdAndOrder(seatId: string) {
  const held = await holdSeat(db, seatId)
  if (typeof held === 'string') throw new Error('hold failed')
  const order = await createOrder(db, {
    holdToken: held.holdToken,
    name: 'Rina Contoh',
    email: 'rina@example.com',
    phone: '081200000001',
  })
  if (typeof order === 'string') throw new Error(order)
  return order
}

const WINDOW = {
  startsAt: '2020-01-01T00:00:00.000Z',
  endsAt: '2030-01-01T00:00:00.000Z',
}

describe('createOrder pricing', () => {
  it('keeps the base price when no discount is configured', async () => {
    const order = await holdAndOrder('VIP-A1')
    expect(order.listPriceIdr).toBe(1_500_000)
    expect(order.autoDiscountIdr).toBe(0)
    expect(order.promoDiscountIdr).toBe(0)
    expect(order.totalIdr).toBe(1_500_000)
  })

  it('snapshots the best active phase on the order', async () => {
    await createDiscount(db, {
      kind: 'phase',
      name: 'Early Bird',
      nameEn: 'Early Bird',
      type: 'percent',
      value: 20,
      ...WINDOW,
    })

    const order = await holdAndOrder('VIP-A2')
    expect(order.listPriceIdr).toBe(1_500_000)
    expect(order.autoDiscountIdr).toBe(300_000)
    expect(order.autoDiscountName).toBe('Early Bird')
    expect(order.autoDiscountPercent).toBe(20)
    expect(order.subtotalIdr).toBe(1_200_000)
    expect(order.totalIdr).toBe(1_200_000)

    const [row] = await db.query<{
      list_price_idr: number
      auto_discount_idr: number
      total_idr: number
    }>('SELECT list_price_idr, auto_discount_idr, total_idr FROM orders WHERE code = $1', [order.orderCode])
    expect(row).toEqual({ list_price_idr: 1_500_000, auto_discount_idr: 300_000, total_idr: 1_200_000 })
  })

  it('returns the same breakdown when the same hold submits twice', async () => {
    const held = await holdSeat(db, 'VIP-A3')
    if (typeof held === 'string') throw new Error('hold failed')
    const input = { holdToken: held.holdToken, name: 'Sari', email: 'sari@example.com', phone: '081200000022' }
    const first = await createOrder(db, input)
    const second = await createOrder(db, input)
    expect(second).toEqual(first)
  })
})
