import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'
import { holdSeat, releaseHold } from '../src/services/seats'
import { cancelOrder, confirmPayment, createOrder, payOrder } from '../src/services/orders'

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

async function expireSeat(seatId: string) {
  await db.query("UPDATE seats SET hold_expires_at = now() - interval '1 minute' WHERE id = $1", [seatId])
}

describe('double-booking prevention', () => {
  it('only one of two concurrent holds on the same seat wins', async () => {
    const [first, second] = await Promise.all([holdSeat(db, 'VIP-A1'), holdSeat(db, 'VIP-A1')])
    const results = [first, second]
    expect(results.filter((r) => typeof r === 'object')).toHaveLength(1)
    expect(results.filter((r) => r === 'SEAT_UNAVAILABLE')).toHaveLength(1)
  })

  it('does not let an expired order pay a seat re-held by someone else', async () => {
    const oldOrder = await holdAndOrder('CAT1-F1')
    await expireSeat('CAT1-F1')

    const rehold = await holdSeat(db, 'CAT1-F1')
    expect(typeof rehold).toBe('object')

    expect(await payOrder(db, oldOrder.orderCode, 'ewallet')).toBe('HOLD_EXPIRED')

    const [seat] = await db.query<{ status: string }>("SELECT status FROM seats WHERE id='CAT1-F1'")
    expect(seat.status).toBe('held')
  })

  it('lets a new visitor order a re-held seat and cancels the stale pending order', async () => {
    const stale = await holdAndOrder('CAT1-F2')
    await expireSeat('CAT1-F2')

    const rehold = await holdSeat(db, 'CAT1-F2')
    if (typeof rehold === 'string') throw new Error('rehold failed')

    const fresh = await createOrder(db, {
      holdToken: rehold.holdToken,
      name: 'Budi Baru',
      email: 'budi.baru@example.com',
      phone: '081200000021',
    })
    expect(typeof fresh).toBe('object')

    const [staleRow] = await db.query<{ status: string }>('SELECT status FROM orders WHERE code = $1', [
      stale.orderCode,
    ])
    expect(staleRow.status).toBe('cancelled')
  })

  it('is idempotent when the same hold submits the order twice', async () => {
    const held = await holdSeat(db, 'CAT1-F3')
    if (typeof held === 'string') throw new Error('hold failed')
    const input = { holdToken: held.holdToken, name: 'Sari', email: 'sari@example.com', phone: '081200000022' }

    const first = await createOrder(db, input)
    const second = await createOrder(db, input)
    expect(second).toEqual(first)

    const [row] = await db.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM orders WHERE seat_id = 'CAT1-F3'",
    )
    expect(row.count).toBe(1)
  })
})

describe('orders', () => {
  it('rejects order creation from an expired hold', async () => {
    const held = await holdSeat(db, 'VIP-A2')
    if (typeof held === 'string') throw new Error('hold failed')
    await expireSeat('VIP-A2')

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
    await expireSeat('VIP-A3')

    expect(await payOrder(db, order.orderCode, 'ewallet')).toBe('HOLD_EXPIRED')

    const [seat] = await db.query<{ status: string }>("SELECT status FROM seats WHERE id='VIP-A3'")
    expect(seat.status).not.toBe('sold')
  })

  it('pays a pending order: order becomes paid and seat becomes sold', async () => {
    const order = await holdAndOrder('VIP-A4')
    expect(await payOrder(db, order.orderCode, 'ewallet')).toBe('paid')

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

  it('lets the admin confirm a pending order after its hold expired if the seat is free', async () => {
    const order = await holdAndOrder('CAT1-F4')
    await db.query(
      "UPDATE seats SET status='available', hold_token=NULL, hold_expires_at=NULL WHERE id='CAT1-F4'",
    )

    expect(await confirmPayment(db, order.orderCode)).toBe('paid')

    const [seat] = await db.query<{ status: string }>("SELECT status FROM seats WHERE id='CAT1-F4'")
    expect(seat.status).toBe('sold')
  })
})

describe('releaseHold', () => {
  it('releases a held seat when the visitor backs out, but not someone else\'s hold', async () => {
    const held = await holdSeat(db, 'REG-N1')
    if (typeof held === 'string') throw new Error('hold failed')

    expect(await releaseHold(db, 'REG-N1', 'wrong-token')).toBe(false)
    expect(await releaseHold(db, 'REG-N1', held.holdToken)).toBe(true)

    const [seat] = await db.query<{ status: string }>("SELECT status FROM seats WHERE id='REG-N1'")
    expect(seat.status).toBe('available')
  })
})
