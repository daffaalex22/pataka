import type { SqlDb } from '@/lib/db'
import type { PriceBreakdown } from '@/lib/discounts'
import { redeemPromoForPayment, releasePromoForPaidCancel, resolvePrice } from '@/services/discounts'

export type CreateOrderInput = {
  holdToken: string
  name: string
  email: string
  phone: string
}

export type CreateOrderResult =
  | ({ orderCode: string } & PriceBreakdown)
  | 'HOLD_EXPIRED'
  | 'SALES_CLOSED'

export type PayResult =
  | 'paid'
  | 'HOLD_EXPIRED'
  | 'ORDER_CANCELLED'
  | 'NOT_FOUND'
  | 'DISCOUNT_UNAVAILABLE'

/**
 * Thrown inside a payment transaction when the seat update fails after a promo
 * use was already counted. The adapter commits on a normal return, so only a
 * throw rolls the increment back; callers translate it to 'HOLD_EXPIRED'.
 */
class HoldLostError extends Error {}

function newOrderCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `PTK-${code}`
}

/** Create a pending order from a live hold. The hold token proves seat ownership. */
export async function createOrder(db: SqlDb, input: CreateOrderInput): Promise<CreateOrderResult> {
  return db.transaction(async (tx) => {
    const valid = await tx.query<{
      id: string
      price_idr: number
      category_key: string
      sales_open: boolean
    }>(
      `SELECT s.id, c.price_idr, c.key AS category_key, c.sales_open
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

    const breakdown = await resolvePrice(tx, seat.category_key, Number(seat.price_idr), new Date())

    // Idempotent: the same hold token always maps to one pending order.
    const existing = await tx.query<{
      code: string
      list_price_idr: number
      auto_discount_id: number | null
      auto_discount_idr: number
      auto_discount_name: string | null
      auto_discount_name_en: string | null
      promo_discount_id: number | null
      promo_discount_idr: number
      promo_code: string | null
      total_idr: number
      auto_discount_type: string | null
      auto_discount_value: number | null
    }>(
      `SELECT o.code, o.list_price_idr, o.auto_discount_id, o.auto_discount_idr,
              o.auto_discount_name, o.auto_discount_name_en,
              o.promo_discount_id, o.promo_discount_idr, o.promo_code, o.total_idr,
              d.type AS auto_discount_type, d.value AS auto_discount_value
       FROM orders o
       LEFT JOIN discounts d ON d.id = o.auto_discount_id
       WHERE o.hold_token = $1 AND o.status = 'pending'
       LIMIT 1`,
      [input.holdToken],
    )
    if (existing.length > 0) {
      const row = existing[0]
      const listPriceIdr = Number(row.list_price_idr)
      const autoDiscountIdr = Number(row.auto_discount_idr)
      const promoDiscountIdr = Number(row.promo_discount_idr)
      return {
        orderCode: row.code,
        listPriceIdr,
        autoDiscountId: row.auto_discount_id,
        autoDiscountIdr,
        autoDiscountName: row.auto_discount_name,
        autoDiscountNameEn: row.auto_discount_name_en,
        autoDiscountPercent:
          row.auto_discount_type === 'percent' ? Number(row.auto_discount_value) : null,
        subtotalIdr: listPriceIdr - autoDiscountIdr,
        promoDiscountId: row.promo_discount_id,
        promoDiscountIdr,
        promoCode: row.promo_code,
        totalIdr: Number(row.total_idr),
      }
    }

    // Any older pending order on this seat is stale — the current hold token owns the seat now.
    await tx.query(
      `UPDATE orders SET status = 'cancelled', cancelled_at = now()
       WHERE seat_id = $1 AND status = 'pending' AND (hold_token IS NULL OR hold_token <> $2)`,
      [seat.id, input.holdToken],
    )

    const code = newOrderCode()
    await tx.query(
      `INSERT INTO orders (code, seat_id, hold_token, name, email, phone, total_idr,
                           list_price_idr, auto_discount_id, auto_discount_idr,
                           auto_discount_name, auto_discount_name_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        code,
        seat.id,
        input.holdToken,
        input.name,
        input.email,
        input.phone,
        breakdown.totalIdr,
        breakdown.listPriceIdr,
        breakdown.autoDiscountId,
        breakdown.autoDiscountIdr,
        breakdown.autoDiscountName,
        breakdown.autoDiscountNameEn,
      ],
    )
    return { orderCode: code, ...breakdown }
  })
}

/** Simulated payment: the order must still own the seat's live hold, then seat becomes sold. */
export async function payOrder(db: SqlDb, code: string, method: string): Promise<PayResult> {
  try {
    return await db.transaction(async (tx) => {
      const rows = await tx.query<{
        status: string
        seat_id: string
        hold_token: string | null
        promo_discount_id: number | null
        seat_status: string
        seat_hold_token: string | null
        hold_fresh: boolean
      }>(
        `SELECT o.status, o.seat_id, o.hold_token, o.promo_discount_id, s.status AS seat_status,
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

      // Redeem before any mutation: a stale or exhausted code fails the payment cleanly.
      const redeemed = await redeemPromoForPayment(tx, { promoDiscountId: order.promo_discount_id })
      if (!redeemed) return 'DISCOUNT_UNAVAILABLE'

      const sold = await tx.query(
        `UPDATE seats SET status = 'sold', hold_token = NULL, hold_expires_at = NULL
         WHERE id = $1 AND status = 'held' AND hold_token = $2
         RETURNING id`,
        [order.seat_id, order.hold_token],
      )
      if (sold.length === 0) throw new HoldLostError()

      await tx.query(
        `UPDATE orders SET status = 'paid', payment_method = $1, paid_at = now() WHERE code = $2`,
        [method, code],
      )
      return 'paid'
    })
  } catch (error) {
    if (error instanceof HoldLostError) return 'HOLD_EXPIRED'
    throw error
  }
}

/** Admin action: cancel an order and release its seat only if the seat is still owned by it. */
export async function cancelOrder(db: SqlDb, code: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const rows = await tx.query<{
      status: string
      seat_id: string
      hold_token: string | null
      promo_discount_id: number | null
    }>('SELECT status, seat_id, hold_token, promo_discount_id FROM orders WHERE code = $1', [code])
    if (rows.length === 0) return false

    const order = rows[0]
    if (order.status === 'cancelled') return true

    // Only a paid order ever counted a promo use; pending cancellation must not touch it.
    if (order.status === 'paid') {
      await releasePromoForPaidCancel(tx, order.promo_discount_id)
    }

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
  try {
    return await db.transaction(async (tx) => {
      const rows = await tx.query<{
        status: string
        seat_id: string
        hold_token: string | null
        promo_discount_id: number | null
      }>('SELECT status, seat_id, hold_token, promo_discount_id FROM orders WHERE code = $1', [code])
      if (rows.length === 0) return 'NOT_FOUND'

      const order = rows[0]
      if (order.status === 'cancelled') return 'ORDER_CANCELLED'
      if (order.status === 'paid') return 'paid'

      // Organizer override: honor the snapshot even past max_uses; only a deleted rule fails.
      const redeemed = await redeemPromoForPayment(
        tx,
        { promoDiscountId: order.promo_discount_id },
        { allowOverLimit: true },
      )
      if (!redeemed) return 'DISCOUNT_UNAVAILABLE'

      const sold = await tx.query(
        `UPDATE seats SET status = 'sold', hold_token = NULL, hold_expires_at = NULL
         WHERE id = $1
           AND (status = 'available' OR (status = 'held' AND hold_token = $2))
         RETURNING id`,
        [order.seat_id, order.hold_token],
      )
      if (sold.length === 0) throw new HoldLostError()

      await tx.query(
        `UPDATE orders SET status = 'paid', payment_method = 'manual', paid_at = now() WHERE code = $1`,
        [code],
      )
      return 'paid'
    })
  } catch (error) {
    if (error instanceof HoldLostError) return 'HOLD_EXPIRED'
    throw error
  }
}
