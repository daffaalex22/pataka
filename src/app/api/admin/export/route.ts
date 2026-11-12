import { connection } from 'next/server'
import { getDb } from '@/lib/db'
import { isAdmin, unauthorized } from '@/lib/auth'
import { toCsv } from '@/lib/csv'

export async function GET(req: Request) {
  await connection()
  if (!isAdmin(req)) return unauthorized()
  const type = new URL(req.url).searchParams.get('type') ?? 'participants'
  const db = await getDb()

  const rows = await db.query<{
    code: string
    name: string
    email: string
    phone: string
    seat_id: string
    category_name: string
    status: string
    payment_method: string | null
    list_price_idr: number | null
    auto_discount_idr: number
    promo_discount_idr: number
    promo_code: string | null
    total_idr: number
    created_at: string
    paid_at: string | null
    checked_in_at: string | null
  }>(`
    SELECT o.code, o.name, o.email, o.phone, o.status, o.payment_method,
           o.list_price_idr, o.auto_discount_idr, o.promo_discount_idr, o.promo_code, o.total_idr,
           o.created_at, o.paid_at, o.checked_in_at,
           s.id AS seat_id, c.name AS category_name
    FROM orders o
    JOIN seats s ON s.id = o.seat_id
    JOIN ticket_categories c ON c.id = s.category_id
    ORDER BY o.created_at DESC
  `)

  let csv: string
  let filename: string

  if (type === 'transactions') {
    csv = toCsv(
      rows.map((row) => ({
        ...row,
        list_price_idr: row.list_price_idr ?? row.total_idr,
        discount_code: row.promo_code ?? '',
        discount_idr: row.auto_discount_idr + row.promo_discount_idr,
      })),
      [
        { key: 'code', label: 'Order Code' },
        { key: 'seat_id', label: 'Seat' },
        { key: 'category_name', label: 'Category' },
        { key: 'status', label: 'Status' },
        { key: 'payment_method', label: 'Payment Method' },
        { key: 'list_price_idr', label: 'List Price IDR' },
        { key: 'auto_discount_idr', label: 'Auto Discount IDR' },
        { key: 'promo_discount_idr', label: 'Promo Discount IDR' },
        { key: 'discount_code', label: 'Discount Code' },
        { key: 'discount_idr', label: 'Discount IDR' },
        { key: 'total_idr', label: 'Total IDR' },
        { key: 'created_at', label: 'Created At' },
        { key: 'paid_at', label: 'Paid At' },
      ],
    )
    filename = 'pataka-transactions.csv'
  } else {
    csv = toCsv(rows, [
      { key: 'code', label: 'Order Code' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'seat_id', label: 'Seat' },
      { key: 'category_name', label: 'Category' },
      { key: 'status', label: 'Order Status' },
      { key: 'checked_in_at', label: 'Checked In At' },
    ])
    filename = 'pataka-participants.csv'
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
