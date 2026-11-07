import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'
import { holdSeat } from '../src/services/seats'
import { createOrder, payOrder } from '../src/services/orders'
import { scan } from '../src/services/checkin'
import { qrPayload } from '../src/lib/qr'

process.env.CHECKIN_SECRET = 'test-secret'

let db: TestDb

beforeEach(async () => {
  db = await createTestDb()
  await migrate(db)
  await seed(db)
})

async function paidOrder(seatId = 'VIP-A7') {
  const held = await holdSeat(db, seatId)
  if (typeof held === 'string') throw new Error('hold failed')
  const order = await createOrder(db, {
    holdToken: held.holdToken,
    name: 'Sari Contoh',
    email: 'sari@example.com',
    phone: '081200000011',
  })
  if (typeof order === 'string') throw new Error(`order failed: ${order}`)
  const paid = await payOrder(db, order.orderCode, 'ewallet')
  if (paid !== 'paid') throw new Error('payment failed')
  return order
}

describe('check-in scan', () => {
  it('marks attendance on first valid scan and reports already_used on the second', async () => {
    const order = await paidOrder()
    const payload = qrPayload(order.orderCode)

    const first = await scan(db, payload)
    expect(first).toMatchObject({ result: 'valid', seatLabel: 'VIP-A7', name: 'Sari Contoh' })

    const [before] = await db.query<{ checked_in_at: string }>(
      'SELECT checked_in_at FROM orders WHERE code = $1',
      [order.orderCode],
    )
    expect(before.checked_in_at).not.toBeNull()

    const second = await scan(db, payload)
    expect(second.result).toBe('already_used')

    const [after] = await db.query<{ checked_in_at: string }>(
      'SELECT checked_in_at FROM orders WHERE code = $1',
      [order.orderCode],
    )
    expect(new Date(after.checked_in_at).getTime()).toBe(new Date(before.checked_in_at).getTime())
  })

  it('rejects a tampered payload without marking attendance', async () => {
    const order = await paidOrder()
    const valid = qrPayload(order.orderCode)
    const tampered = valid.slice(0, -1) + (valid.endsWith('0') ? '1' : '0')

    expect((await scan(db, tampered)).result).toBe('invalid')

    const [row] = await db.query<{ checked_in_at: string | null }>(
      'SELECT checked_in_at FROM orders WHERE code = $1',
      [order.orderCode],
    )
    expect(row.checked_in_at).toBeNull()
  })

  it('rejects a signed payload for an unpaid order', async () => {
    const held = await holdSeat(db, 'VIP-A8')
    if (typeof held === 'string') throw new Error('hold failed')
    const order = await createOrder(db, {
      holdToken: held.holdToken,
      name: 'Tono Contoh',
      email: 'tono@example.com',
      phone: '081200000012',
    })
    if (typeof order === 'string') throw new Error('order failed')

    expect((await scan(db, qrPayload(order.orderCode))).result).toBe('invalid')
  })

  it('logs every scan attempt', async () => {
    const order = await paidOrder()
    const payload = qrPayload(order.orderCode)
    await scan(db, payload)
    await scan(db, payload)
    await scan(db, 'garbage')

    const [row] = await db.query<{ count: number }>('SELECT count(*)::int AS count FROM scans')
    expect(row.count).toBe(3)
  })
})
