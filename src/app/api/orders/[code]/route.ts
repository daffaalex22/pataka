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
  }>(
    `SELECT o.code, o.name, o.status, o.payment_method, o.total_idr,
            o.created_at, o.paid_at, o.checked_in_at, o.hold_token,
            s.id AS seat_id, s.section, s.row, s.num,
            s.status AS seat_status, s.hold_token AS seat_hold_token, s.hold_expires_at,
            c.name AS category_name, c.name_en AS category_name_en
     FROM orders o
     JOIN seats s ON s.id = o.seat_id
     JOIN ticket_categories c ON c.id = s.category_id
     WHERE o.code = $1`,
    [code],
  )

  if (rows.length === 0) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
  const order = rows[0]
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
