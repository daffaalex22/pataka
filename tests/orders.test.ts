import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'
import { holdSeat } from '../src/services/seats'
import { cancelOrder, createOrder, payOrder } from '../src/services/orders'

let db: TestDb

beforeEach(async () => {
  db = await createTestDb()
  await migrate(db)
  await seed(db)
})

async function holdAndOrder(seatId: string) {
  const held = await holdSeat(db, seatId)
  if (held === 'SEAT_UNAVAILABLE' || held === 'SALES_CLOSED') throw new Error('hold failed')
  const order = await createOrder(db, {
    holdToken: held.holdToken,
    name: 'Rina Contoh',
    email: 'rina@example.com',
    phone: '081200000001',
  })
  if (typeof order === 'string') throw new Error(`order failed: ${order}`)
  return order
}

describe('double-booking prevention', () => {
  it('only one of two concurrent holds on the same seat wins', async () => {
    const [first, second] = await Promise.all([holdSeat(db, 'VIP-A1'), holdSeat(db, 'VIP-A1')])
    const results = [first, second]
    expect(results.filter((r) => typeof r === 'object')).toHaveLength(1)
    expect(results.filter((r) => r === 'SEAT_UNAVAILABLE')).toHaveLength(1)
  })
})

describe('orders', () => {
  it('rejects order creation from an expired hold', async () => {
    const held = await holdSeat(db, 'VIP-A2')
    if (typeof held === 'string') throw new Error('hold failed')
    await db.query("UPDATE seats SET hold_expires_at = now() - interval '1 minute' WHERE id='VIP-A2'")

    const result = await createOrder(db, {
      holdToken: held.holdToken,
      name: 'Budi Contoh',
      email: 'budi@example.com',
      phone: '081200000002',
    })
    expect(result).toBe('HOLD_EXPIRED')
  })

  it('rejects payment after the hold expired and leaves the seat unsold', async () => {
    const order = await holdAndOrder('VIP-A3')
    await db.query("UPDATE seats SET hold_expires_at = now() - interval '1 minute' WHERE id='VIP-A3'")

    const result = await payOrder(db, order.orderCode, 'ewallet')
    expect(result).toBe('HOLD_EXPIRED')

    const [seat] = await db.query<{ status: string }>("SELECT status FROM seats WHERE id='VIP-A3'")
    expect(seat.status).not.toBe('sold')
  })

  it('pays a pending order: order becomes paid and seat becomes sold', async () => {
    const order = await holdAndOrder('VIP-A4')
    const result = await payOrder(db, order.orderCode, 'ewallet')
    expect(result).toBe('paid')

    const [row] = await db.query<{ order_status: string; seat_status: string; total_idr: number }>(
      `SELECT o.status AS order_status, s.status AS seat_status, o.total_idr
       FROM orders o JOIN seats s ON s.id = o.seat_id WHERE o.code = $1`,
      [order.orderCode],
    )
    expect(row.order_status).toBe('paid')
    expect(row.seat_status).toBe('sold')
    expect(row.total_idr).toBe(1500000)
  })

  it('rejects payment for a cancelled order', async () => {
    const order = await holdAndOrder('VIP-A5')
    await cancelOrder(db, order.orderCode)

    expect(await payOrder(db, order.orderCode, 'va')).toBe('ORDER_CANCELLED')
  })

  it('cancelling a paid order releases the seat for someone else', async () => {
    const order = await holdAndOrder('VIP-A6')
    await payOrder(db, order.orderCode, 'qrpay')

    expect(await cancelOrder(db, order.orderCode)).toBe(true)

    const [seat] = await db.query<{ status: string }>("SELECT status FROM seats WHERE id='VIP-A6'")
    expect(seat.status).toBe('available')

    const rehold = await holdSeat(db, 'VIP-A6')
    expect(typeof rehold).toBe('object')
  })
})
