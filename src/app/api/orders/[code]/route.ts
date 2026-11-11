import { connection } from 'next/server'
import { getDb } from '@/lib/db'
import { qrPayload } from '@/lib/qr'

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  await connection()
  const { code } = await ctx.params
  const db = await getDb()
  const rows = await db.query<{
    code: string
    name: string
    status: string
    payment_method: string | null
    total_idr: number
    created_at: string
    paid_at: string | null
    checked_in_at: string | null
    hold_token: string | null
    seat_id: string
    section: string
    row: string
    num: number
    category_name: string
    category_name_en: string
    seat_status: string
    seat_hold_token: string | null
    hold_expires_at: string | null
    list_price_idr: number | null
    auto_discount_id: number | null
    auto_discount_idr: number
    auto_discount_name: string | null
    auto_discount_name_en: string | null
    promo_discount_id: number | null
    promo_discount_idr: number
    promo_code: string | null
    auto_discount_type: string | null
    auto_discount_value: number | null
  }>(
    `SELECT o.code, o.name, o.status, o.payment_method, o.total_idr,
            o.created_at, o.paid_at, o.checked_in_at, o.hold_token,
            s.id AS seat_id, s.section, s.row, s.num,
            s.status AS seat_status, s.hold_token AS seat_hold_token, s.hold_expires_at,
            c.name AS category_name, c.name_en AS category_name_en,
            o.list_price_idr, o.auto_discount_id, o.auto_discount_idr,
            o.auto_discount_name, o.auto_discount_name_en,
            o.promo_discount_id, o.promo_discount_idr, o.promo_code,
            d.type AS auto_discount_type, d.value AS auto_discount_value
     FROM orders o
     JOIN seats s ON s.id = o.seat_id
     JOIN ticket_categories c ON c.id = s.category_id
     LEFT JOIN discounts d ON d.id = o.auto_discount_id
     WHERE o.code = $1`,
    [code],
  )

  if (rows.length === 0) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
  const order = rows[0]
  const listPriceIdr = Number(order.list_price_idr ?? order.total_idr)
  const autoDiscountIdr = Number(order.auto_discount_idr)
  const holdExpiresAt = order.hold_expires_at ? new Date(order.hold_expires_at).toISOString() : null
  const holdActive =
    order.status === 'pending' &&
    order.seat_status === 'held' &&
    order.hold_token !== null &&
    order.hold_token === order.seat_hold_token &&
    holdExpiresAt !== null &&
    new Date(holdExpiresAt).getTime() > Date.now()

  return Response.json({
    orderCode: order.code,
    name: order.name,
    status: order.status,
    paymentMethod: order.payment_method,
    listPriceIdr,
    autoDiscountId: order.auto_discount_id,
    autoDiscountIdr,
    autoDiscountName: order.auto_discount_name,
    autoDiscountNameEn: order.auto_discount_name_en,
    autoDiscountPercent: order.auto_discount_type === 'percent' ? Number(order.auto_discount_value) : null,
    subtotalIdr: listPriceIdr - autoDiscountIdr,
    promoDiscountId: order.promo_discount_id,
    promoDiscountIdr: Number(order.promo_discount_idr),
    promoCode: order.promo_code,
    totalIdr: order.total_idr,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    checkedInAt: order.checked_in_at,
    holdExpiresAt,
    holdActive,
    seatLabel: order.seat_id,
    section: order.section,
    seatRow: order.row,
    seatNum: order.num,
    categoryName: order.category_name,
    categoryNameEn: order.category_name_en,
    qrPayload: order.status === 'paid' ? qrPayload(order.code) : null,
  })
}
