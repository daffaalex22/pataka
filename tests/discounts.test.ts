import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'
import { holdSeat } from '../src/services/seats'
import { cancelOrder, confirmPayment, createOrder, payOrder } from '../src/services/orders'
import { applyPromoToOrder, clearPromoFromOrder, createDiscount } from '../src/services/discounts'

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

async function comeBackLater(seatId: string, code = 'LIMIT1') {
  const order = await holdAndOrder(seatId)
  const applied = await applyPromoToOrder(db, order.orderCode, code)
  if (!applied.ok) throw new Error(applied.error)
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

describe('applyPromoToOrder', () => {
  async function seedPhaseAndCode() {
    await createDiscount(db, {
      kind: 'phase',
      name: 'Early Bird',
      nameEn: 'Early Bird',
      type: 'percent',
      value: 20,
      ...WINDOW,
    })
    await createDiscount(db, {
      kind: 'code',
      code: 'PATKA10',
      name: 'Pataka 10',
      nameEn: 'Pataka 10',
      type: 'percent',
      value: 10,
      maxUses: 100,
      ...WINDOW,
    })
  }

  it('stacks a code on the phase subtotal and removes it again', async () => {
    await seedPhaseAndCode()
    const order = await holdAndOrder('VIP-A4')

    const applied = await applyPromoToOrder(db, order.orderCode, ' patka10 ')
    expect(applied.ok).toBe(true)
    if (!applied.ok) throw new Error(applied.error)
    expect(applied.breakdown.promoDiscountIdr).toBe(120_000)
    expect(applied.breakdown.totalIdr).toBe(1_080_000)
    expect(applied.breakdown.promoCode).toBe('PATKA10')

    const cleared = await clearPromoFromOrder(db, order.orderCode)
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) throw new Error(cleared.error)
    expect(cleared.breakdown.promoDiscountIdr).toBe(0)
    expect(cleared.breakdown.totalIdr).toBe(1_200_000)
  })

  it('replaces the previous code and keeps one code per order', async () => {
    await seedPhaseAndCode()
    await createDiscount(db, {
      kind: 'code',
      code: 'HEMAT20',
      name: 'Hemat 20',
      nameEn: 'Hemat 20',
      type: 'fixed',
      value: 200_000,
      ...WINDOW,
    })
    const order = await holdAndOrder('VIP-A8')

    const first = await applyPromoToOrder(db, order.orderCode, 'PATKA10')
    expect(first.ok).toBe(true)
    if (!first.ok) throw new Error(first.error)
    expect(first.breakdown.totalIdr).toBe(1_080_000)

    const second = await applyPromoToOrder(db, order.orderCode, 'HEMAT20')
    expect(second.ok).toBe(true)
    if (!second.ok) throw new Error(second.error)
    expect(second.breakdown.promoCode).toBe('HEMAT20')
    expect(second.breakdown.promoDiscountIdr).toBe(200_000)
    expect(second.breakdown.totalIdr).toBe(1_000_000)

    const cleared = await clearPromoFromOrder(db, order.orderCode)
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) throw new Error(cleared.error)
    expect(cleared.breakdown.totalIdr).toBe(1_200_000)
  })

  it('rejects invalid, inactive, expired, wrong-category, below-minimum, and exhausted codes', async () => {
    const order = await holdAndOrder('VIP-A5')

    const unknown = await applyPromoToOrder(db, order.orderCode, 'NOPE')
    expect(unknown).toEqual({ ok: false, error: 'CODE_NOT_FOUND' })

    await createDiscount(db, {
      kind: 'code', code: 'OFF', name: 'Off', nameEn: 'Off', type: 'fixed', value: 10_000, active: false, ...WINDOW,
    })
    expect(await applyPromoToOrder(db, order.orderCode, 'OFF')).toEqual({ ok: false, error: 'CODE_INACTIVE' })

    await createDiscount(db, {
      kind: 'code', code: 'LATE', name: 'Late', nameEn: 'Late', type: 'fixed', value: 10_000,
      startsAt: '2030-01-01T00:00:00.000Z',
    })
    expect(await applyPromoToOrder(db, order.orderCode, 'LATE')).toEqual({ ok: false, error: 'CODE_NOT_STARTED' })

    await createDiscount(db, {
      kind: 'code', code: 'OLD', name: 'Old', nameEn: 'Old', type: 'fixed', value: 10_000,
      startsAt: '2020-01-01T00:00:00.000Z', endsAt: '2020-02-01T00:00:00.000Z',
    })
    expect(await applyPromoToOrder(db, order.orderCode, 'OLD')).toEqual({ ok: false, error: 'CODE_EXPIRED' })

    await createDiscount(db, {
      kind: 'code', code: 'REGONLY', name: 'Reg', nameEn: 'Reg', type: 'fixed', value: 10_000,
      categoryKey: 'REG', ...WINDOW,
    })
    expect(await applyPromoToOrder(db, order.orderCode, 'REGONLY')).toEqual({ ok: false, error: 'CODE_CATEGORY' })

    await createDiscount(db, {
      kind: 'code', code: 'BIGSPEND', name: 'Big', nameEn: 'Big', type: 'fixed', value: 10_000,
      minOrderIdr: 5_000_000, ...WINDOW,
    })
    expect(await applyPromoToOrder(db, order.orderCode, 'BIGSPEND')).toEqual({ ok: false, error: 'CODE_MIN_ORDER' })

    await createDiscount(db, {
      kind: 'code', code: 'USED', name: 'Used', nameEn: 'Used', type: 'fixed', value: 10_000,
      maxUses: 1, ...WINDOW,
    })
    await db.query("UPDATE discounts SET used_count = 1 WHERE code = 'USED'")
    expect(await applyPromoToOrder(db, order.orderCode, 'USED')).toEqual({ ok: false, error: 'CODE_EXHAUSTED' })
  })

  it('refuses to reprice a paid or cancelled order', async () => {
    await seedPhaseAndCode()
    const order = await holdAndOrder('VIP-A6')
    await db.query("UPDATE orders SET status = 'paid' WHERE code = $1", [order.orderCode])

    expect(await applyPromoToOrder(db, order.orderCode, 'PATKA10')).toEqual({
      ok: false,
      error: 'ORDER_NOT_EDITABLE',
    })
    expect(await clearPromoFromOrder(db, order.orderCode)).toEqual({
      ok: false,
      error: 'ORDER_NOT_EDITABLE',
    })
  })

  it('refuses to reprice an order whose hold has expired', async () => {
    await seedPhaseAndCode()
    const order = await holdAndOrder('VIP-A7')
    await db.query("UPDATE seats SET hold_expires_at = now() - interval '1 minute' WHERE id = 'VIP-A7'")

    expect(await applyPromoToOrder(db, order.orderCode, 'PATKA10')).toEqual({
      ok: false,
      error: 'HOLD_EXPIRED',
    })
  })
})

async function orderWithCode(seatId: string) {
  await createDiscount(db, {
    kind: 'code', code: 'LIMIT1', name: 'Limit 1', nameEn: 'Limit 1',
    type: 'fixed', value: 100_000, maxUses: 1, ...WINDOW,
  })
  const order = await holdAndOrder(seatId)
  const applied = await applyPromoToOrder(db, order.orderCode, 'LIMIT1')
  if (!applied.ok) throw new Error(applied.error)
  return order
}

describe('promo redemption', () => {
  it('counts a use on payment and releases it when the paid order is cancelled', async () => {
    const order = await orderWithCode('CAT1-F1')
    expect(await payOrder(db, order.orderCode, 'ewallet')).toBe('paid')

    const [used] = await db.query<{ used_count: number }>("SELECT used_count FROM discounts WHERE code = 'LIMIT1'")
    expect(used.used_count).toBe(1)

    expect(await cancelOrder(db, order.orderCode)).toBe(true)
    const [released] = await db.query<{ used_count: number }>("SELECT used_count FROM discounts WHERE code = 'LIMIT1'")
    expect(released.used_count).toBe(0)
  })

  it('rejects payment when the code was deactivated after it was applied', async () => {
    const order = await orderWithCode('CAT1-F2')
    await db.query("UPDATE discounts SET active = false WHERE code = 'LIMIT1'")

    expect(await payOrder(db, order.orderCode, 'ewallet')).toBe('DISCOUNT_UNAVAILABLE')
    const [seat] = await db.query<{ status: string }>("SELECT status FROM seats WHERE id = 'CAT1-F2'")
    expect(seat.status).toBe('held')
    const [used] = await db.query<{ used_count: number }>("SELECT used_count FROM discounts WHERE code = 'LIMIT1'")
    expect(used.used_count).toBe(0)
  })

  it('lets exactly one of two orders use the last remaining use', async () => {
    const first = await orderWithCode('CAT1-F3')
    const second = await comeBackLater('CAT1-F4')

    expect(await payOrder(db, first.orderCode, 'ewallet')).toBe('paid')
    expect(await payOrder(db, second.orderCode, 'ewallet')).toBe('DISCOUNT_UNAVAILABLE')
  })

  it('rejects payment when the code expired after it was applied', async () => {
    const order = await orderWithCode('CAT1-F9')
    await db.query("UPDATE discounts SET ends_at = now() - interval '1 minute' WHERE code = 'LIMIT1'")

    expect(await payOrder(db, order.orderCode, 'ewallet')).toBe('DISCOUNT_UNAVAILABLE')
    const [seat] = await db.query<{ status: string }>("SELECT status FROM seats WHERE id = 'CAT1-F9'")
    expect(seat.status).toBe('held')
  })

  it('rolls back a manual confirmation if the seat is owned by someone else', async () => {
    const order = await orderWithCode('CAT1-F8')
    await db.query("UPDATE seats SET hold_expires_at = now() - interval '1 minute' WHERE id = 'CAT1-F8'")
    const rehold = await holdSeat(db, 'CAT1-F8')
    expect(typeof rehold).toBe('object')

    expect(await confirmPayment(db, order.orderCode)).toBe('HOLD_EXPIRED')
    const [used] = await db.query<{ used_count: number }>("SELECT used_count FROM discounts WHERE code = 'LIMIT1'")
    expect(used.used_count).toBe(0)
  })

  it('lets an organizer confirm a pending order after the hold expired, even past the limit', async () => {
    const first = await orderWithCode('CAT1-F5')
    const second = await comeBackLater('CAT1-F6', 'LIMIT1')

    expect(await payOrder(db, first.orderCode, 'ewallet')).toBe('paid')
    await db.query("UPDATE seats SET hold_expires_at = now() - interval '1 minute' WHERE id = 'CAT1-F6'")

    expect(await confirmPayment(db, second.orderCode)).toBe('paid')
    const [used] = await db.query<{ used_count: number }>("SELECT used_count FROM discounts WHERE code = 'LIMIT1'")
    expect(used.used_count).toBe(2)
  })
})
