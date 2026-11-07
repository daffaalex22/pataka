import type { SqlDb } from '@/lib/db'

export type CreateOrderInput = {
  holdToken: string
  name: string
  email: string
  phone: string
}

export type CreateOrderResult =
  | { orderCode: string; totalIdr: number }
  | 'HOLD_EXPIRED'
  | 'SALES_CLOSED'

export type PayResult = 'paid' | 'HOLD_EXPIRED' | 'ORDER_CANCELLED' | 'NOT_FOUND'

function newOrderCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `PTK-${code}`
}

/** Create a pending order from a live hold. The hold token proves seat ownership. */
export async function createOrder(db: SqlDb, input: CreateOrderInput): Promise<CreateOrderResult> {
  return db.transaction(async (tx) => {
    const valid = await tx.query<{ id: string; price_idr: number; sales_open: boolean }>(
      `SELECT s.id, c.price_idr, c.sales_open
       FROM seats s JOIN ticket_categories c ON c.id = s.category_id
       WHERE s.hold_token = $1 AND s.status = 'held' AND s.hold_expires_at > now()`,
      [input.holdToken],
    )

    if (valid.length === 0) {
      await tx.query(
        `UPDATE seats SET status = 'available', hold_token = NULL, hold_expires_at = NULL
         WHERE hold_token = $1 AND status = 'held'`,
        [input.holdToken],
      )
      return 'HOLD_EXPIRED'
    }

    const seat = valid[0]
    if (!seat.sales_open) return 'SALES_CLOSED'

    const code = newOrderCode()
    await tx.query(
      `INSERT INTO orders (code, seat_id, hold_token, name, email, phone, total_idr)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [code, seat.id, input.holdToken, input.name, input.email, input.phone, seat.price_idr],
    )
    return { orderCode: code, totalIdr: Number(seat.price_idr) }
  })
}

/** Simulated payment: validates the hold is still live, then marks order paid and seat sold. */
export async function payOrder(db: SqlDb, code: string, method: string): Promise<PayResult> {
  return db.transaction(async (tx) => {
    const rows = await tx.query<{
      status: string
      seat_id: string
      seat_status: string
      hold_fresh: boolean
    }>(
      `SELECT o.status, o.seat_id, s.status AS seat_status,
              (s.hold_expires_at > now()) AS hold_fresh
       FROM orders o JOIN seats s ON s.id = o.seat_id
       WHERE o.code = $1`,
      [code],
    )
    if (rows.length === 0) return 'NOT_FOUND'

    const order = rows[0]
    if (order.status === 'cancelled') return 'ORDER_CANCELLED'
    if (order.status === 'paid') return 'paid'

    if (order.seat_status !== 'held' || !order.hold_fresh) {
      await tx.query(
        `UPDATE seats SET status = 'available', hold_token = NULL, hold_expires_at = NULL
         WHERE id = $1 AND status = 'held' AND hold_expires_at <= now()`,
        [order.seat_id],
      )
      return 'HOLD_EXPIRED'
    }

    await tx.query(
      `UPDATE seats SET status = 'sold', hold_token = NULL, hold_expires_at = NULL WHERE id = $1`,
      [order.seat_id],
    )
    await tx.query(
      `UPDATE orders SET status = 'paid', payment_method = $1, paid_at = now() WHERE code = $2`,
      [method, code],
    )
    return 'paid'
  })
}

/** Admin action: cancel an order and release its seat only if the seat is still owned by it. */
export async function cancelOrder(db: SqlDb, code: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const rows = await tx.query<{ status: string; seat_id: string; hold_token: string | null }>(
      'SELECT status, seat_id, hold_token FROM orders WHERE code = $1',
      [code],
    )
    if (rows.length === 0) return false

    const order = rows[0]
    if (order.status === 'cancelled') return true

    await tx.query(`UPDATE orders SET status = 'cancelled', cancelled_at = now() WHERE code = $1`, [code])

    if (order.status === 'paid') {
      await tx.query(
        `UPDATE seats SET status = 'available', hold_token = NULL, hold_expires_at = NULL WHERE id = $1`,
        [order.seat_id],
      )
    } else {
      await tx.query(
        `UPDATE seats SET status = 'available', hold_token = NULL, hold_expires_at = NULL
         WHERE id = $1 AND status = 'held' AND hold_token = $2`,
        [order.seat_id, order.hold_token],
      )
    }
    return true
  })
}

/** Admin action: manually confirm a pending payment. */
export async function confirmPayment(db: SqlDb, code: string): Promise<PayResult> {
  return payOrder(db, code, 'manual')
}
