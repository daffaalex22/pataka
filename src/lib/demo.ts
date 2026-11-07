import type { SqlDb } from './db'
import { expireStaleHolds, holdSeat } from '@/services/seats'
import { createOrder, payOrder } from '@/services/orders'

const DEMO_PEOPLE = [
  { name: 'Rina Contoh', email: 'rina@example.com', phone: '081200000001', seat: 'VIP-A1' },
  { name: 'Budi Contoh', email: 'budi@example.com', phone: '081200000002', seat: 'VIP-A2' },
  { name: 'Sari Contoh', email: 'sari@example.com', phone: '081200000003', seat: 'CAT1-E1' },
  { name: 'Tono Contoh', email: 'tono@example.com', phone: '081200000004', seat: 'CAT1-E2' },
  { name: 'Dewi Contoh', email: 'dewi@example.com', phone: '081200000005', seat: 'TRIBL-A1' },
  { name: 'Eko Contoh', email: 'eko@example.com', phone: '081200000006', seat: 'REG-M1' },
]

/** Populate a lively demo state: paid orders, a pending order, a live hold, and one checked-in guest. */
export async function seedDemo(db: SqlDb): Promise<{ paid: number; pending: number }> {
  await expireStaleHolds(db)
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
