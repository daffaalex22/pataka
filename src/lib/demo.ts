import type { SqlDb } from './db'
import type { DiscountInput } from '@/lib/discounts'
import { expireStaleHolds, holdSeat } from '@/services/seats'
import { createOrder, payOrder } from '@/services/orders'
import { createDiscount } from '@/services/discounts'

const DEMO_PEOPLE = [
  { name: 'Rina Contoh', email: 'rina@example.com', phone: '081200000001', seat: 'VIP-A1' },
  { name: 'Budi Contoh', email: 'budi@example.com', phone: '081200000002', seat: 'VIP-A2' },
  { name: 'Sari Contoh', email: 'sari@example.com', phone: '081200000003', seat: 'CAT1-E1' },
  { name: 'Tono Contoh', email: 'tono@example.com', phone: '081200000004', seat: 'CAT1-E2' },
  { name: 'Dewi Contoh', email: 'dewi@example.com', phone: '081200000005', seat: 'TRIBL-A1' },
  { name: 'Eko Contoh', email: 'eko@example.com', phone: '081200000006', seat: 'REG-M1' },
]

const DEMO_DISCOUNT_START = '2026-10-01T00:00:00+07:00'
const DEMO_DISCOUNT_END = '2026-11-15T23:59:59+07:00'

async function ensurePhase(db: SqlDb, input: DiscountInput): Promise<void> {
  const [existing] = await db.query('SELECT id FROM discounts WHERE kind = $1 AND name = $2', [input.kind, input.name])
  if (existing) return
  const result = await createDiscount(db, input)
  if (result === 'CATEGORY_NOT_FOUND') {
    throw new Error(`demo discount category missing: ${input.categoryKey}`)
  }
}

async function ensureCode(db: SqlDb, input: DiscountInput): Promise<void> {
  const [existing] = await db.query('SELECT id FROM discounts WHERE upper(code) = upper($1)', [input.code])
  if (existing) return
  const result = await createDiscount(db, input)
  if (result === 'CODE_TAKEN') return
  if (result === 'CATEGORY_NOT_FOUND') {
    throw new Error(`demo discount category missing: ${input.categoryKey}`)
  }
}

async function seedDemoDiscounts(db: SqlDb): Promise<void> {
  await ensurePhase(db, {
    kind: 'phase',
    name: 'Early Bird',
    nameEn: 'Early Bird',
    type: 'percent',
    value: 20,
    startsAt: DEMO_DISCOUNT_START,
    endsAt: '2026-11-13T23:59:59+07:00',
    active: true,
  })
  await ensurePhase(db, {
    kind: 'phase',
    name: 'Final Call',
    nameEn: 'Final Call',
    type: 'percent',
    value: 10,
    startsAt: '2026-11-14T00:00:00+07:00',
    endsAt: DEMO_DISCOUNT_END,
    active: true,
  })
  await ensureCode(db, {
    kind: 'code',
    code: 'PATKA10',
    name: 'Pataka 10',
    nameEn: 'Pataka 10',
    type: 'percent',
    value: 10,
    maxUses: 100,
    startsAt: DEMO_DISCOUNT_START,
    endsAt: DEMO_DISCOUNT_END,
    active: true,
  })
  await ensureCode(db, {
    kind: 'code',
    code: 'HEMAT50',
    name: 'Hemat 50',
    nameEn: 'Hemat 50',
    type: 'fixed',
    value: 50_000,
    minOrderIdr: 500_000,
    maxUses: 50,
    startsAt: DEMO_DISCOUNT_START,
    endsAt: DEMO_DISCOUNT_END,
    active: true,
  })
  await ensureCode(db, {
    kind: 'code',
    code: 'VIP100',
    name: 'VIP 100',
    nameEn: 'VIP 100',
    type: 'fixed',
    value: 100_000,
    categoryKey: 'VIP',
    maxUses: 20,
    startsAt: DEMO_DISCOUNT_START,
    endsAt: DEMO_DISCOUNT_END,
    active: true,
  })
}

/** Populate a lively demo state: discount phases and promo codes, paid orders, a pending order, a live hold, and one checked-in guest. */
export async function seedDemo(db: SqlDb): Promise<{ paid: number; pending: number }> {
  await expireStaleHolds(db)
  await seedDemoDiscounts(db)
  let paid = 0
  let pending = 0

  for (let i = 0; i < DEMO_PEOPLE.length; i++) {
    const person = DEMO_PEOPLE[i]
    const held = await holdSeat(db, person.seat)
    if (typeof held === 'string') continue
    const order = await createOrder(db, {
      holdToken: held.holdToken,
      name: person.name,
      email: person.email,
      phone: person.phone,
    })
    if (typeof order === 'string') continue

    if (i === 5) {
      pending += 1
      continue
    }
    const result = await payOrder(db, order.orderCode, 'ewallet')
    if (result === 'paid') paid += 1
  }

  // one guest already checked in at the gate
  await db.query(
    `UPDATE orders SET checked_in_at = now() - interval '5 minutes'
     WHERE status = 'paid' AND seat_id = 'CAT1-E1'`,
  )

  // a live 10-minute hold, as if another visitor is deciding right now
  const holdTarget = await holdSeat(db, 'TRIBR-C3')

  return { paid, pending }
}
