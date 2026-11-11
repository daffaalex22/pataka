import { connection } from 'next/server'
import { getDb } from '@/lib/db'
import { isAdmin, unauthorized } from '@/lib/auth'

export async function GET(req: Request) {
  await connection()
  if (!isAdmin(req)) return unauthorized()
  const db = await getDb()

  const rows = await db.query<{
    code: string
    name: string
    email: string
    phone: string
    status: string
    payment_method: string | null
    list_price_idr: number | null
    auto_discount_idr: number
    auto_discount_name: string | null
    promo_discount_idr: number
    promo_code: string | null
    total_idr: number
    created_at: string
    paid_at: string | null
    checked_in_at: string | null
    seat_id: string
    category_key: string
    category_name: string
    category_name_en: string
  }>(`
    SELECT o.code, o.name, o.email, o.phone, o.status, o.payment_method,
           o.list_price_idr, o.auto_discount_idr, o.auto_discount_name,
           o.promo_discount_idr, o.promo_code, o.total_idr,
           o.created_at, o.paid_at, o.checked_in_at,
           s.id AS seat_id, c.key AS category_key, c.name AS category_name, c.name_en AS category_name_en
    FROM orders o
    JOIN seats s ON s.id = o.seat_id
    JOIN ticket_categories c ON c.id = s.category_id
    ORDER BY o.created_at DESC
    LIMIT 500
  `)

  return Response.json(
    rows.map((row) => ({
      code: row.code,
      name: row.name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      paymentMethod: row.payment_method,
      listPriceIdr: row.list_price_idr ?? row.total_idr,
      autoDiscountIdr: row.auto_discount_idr,
      autoDiscountName: row.auto_discount_name,
      promoDiscountIdr: row.promo_discount_idr,
      promoCode: row.promo_code,
      totalIdr: row.total_idr,
      createdAt: row.created_at,
      paidAt: row.paid_at,
      checkedInAt: row.checked_in_at,
      seatLabel: row.seat_id,
      categoryKey: row.category_key,
      categoryName: row.category_name,
      categoryNameEn: row.category_name_en,
    })),
  )
}
