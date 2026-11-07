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

    // Idempotent: the same hold token always maps to one pending order.
    const existing = await tx.query<{ code: string; total_idr: number }>(
      `SELECT code, total_idr FROM orders WHERE hold_token = $1 AND status = 'pending' LIMIT 1`,
      [input.holdToken],
    )
    if (existing.length > 0) {
      return { orderCode: existing[0].code, totalIdr: Number(existing[0].total_idr) }
    }

    // Any older pending order on this seat is stale — the current hold token owns the seat now.
    await tx.query(
      `UPDATE orders SET status = 'cancelled', cancelled_at = now()
       WHERE seat_id = $1 AND status = 'pending' AND (hold_token IS NULL OR hold_token <> $2)`,
      [seat.id, input.holdToken],
    )

    const code = newOrderCode()
    await tx.query(
      `INSERT INTO orders (code, seat_id, hold_token, name, email, phone, total_idr)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [code, seat.id, input.holdToken, input.name, input.email, input.phone, seat.price_idr],
    )
    return { orderCode: code, totalIdr: Number(seat.price_idr) }
  })
}

/** Simulated payment: the order must still own the seat's live hold, then seat becomes sold. */
export async function payOrder(db: SqlDb, code: string, method: string): Promise<PayResult> {
  return db.transaction(async (tx) => {
    const rows = await tx.query<{
      status: string
      seat_id: string
      hold_token: string | null
      seat_status: string
      seat_hold_token: string | null
      hold_fresh: boolean
    }>(
      `SELECT o.status, o.seat_id, o.hold_token, s.status AS seat_status,
              s.hold_token AS seat_hold_token,
              (s.hold_expires_at > now()) AS hold_fresh
       FROM orders o JOIN seats s ON s.id = o.seat_id
       WHERE o.code = $1`,
      [code],
    )
    if (rows.length === 0) return 'NOT_FOUND'

    const order = rows[0]
    if (order.status === 'cancelled') return 'ORDER_CANCELLED'
    if (order.status === 'paid') return 'paid'

    const ownsSeat = order.hold_token !== null && order.hold_token === order.seat_hold_token
    if (order.seat_status !== 'held' || !order.hold_fresh || !ownsSeat) {
      await tx.query(
        `UPDATE seats SET status = 'available', hold_token = NULL, hold_expires_at = NULL
         WHERE id = $1 AND status = 'held' AND hold_expires_at <= now()`,
        [order.seat_id],
      )
      return 'HOLD_EXPIRED'
    }

    const sold = await tx.query(
      `UPDATE seats SET status = 'sold', hold_token = NULL, hold_expires_at = NULL
       WHERE id = $1 AND status = 'held' AND hold_token = $2
       RETURNING id`,
      [order.seat_id, order.hold_token],
    )
    if (sold.length === 0) return 'HOLD_EXPIRED'

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

/** Admin action: manually confirm a pending payment even if the hold lapsed, as long as nobody else owns the seat. */
export async function confirmPayment(db: SqlDb, code: string): Promise<PayResult> {
  return db.transaction(async (tx) => {
    const rows = await tx.query<{ status: string; seat_id: string; hold_token: string | null }>(
      'SELECT status, seat_id, hold_token FROM orders WHERE code = $1',
      [code],
    )
    if (rows.length === 0) return 'NOT_FOUND'

    const order = rows[0]
    if (order.status === 'cancelled') return 'ORDER_CANCELLED'
    if (order.status === 'paid') return 'paid'

    const sold = await tx.query(
      `UPDATE seats SET status = 'sold', hold_token = NULL, hold_expires_at = NULL
       WHERE id = $1
         AND (status = 'available' OR (status = 'held' AND hold_token = $2))
       RETURNING id`,
      [order.seat_id, order.hold_token],
    )
    if (sold.length === 0) return 'HOLD_EXPIRED'

    await tx.query(
      `UPDATE orders SET status = 'paid', payment_method = 'manual', paid_at = now() WHERE code = $1`,
      [code],
    )
    return 'paid'
  })
}
