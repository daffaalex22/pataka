import { getDb } from '@/lib/db'
import { expireStaleHolds } from '@/services/seats'

export async function GET() {
  const db = await getDb()
  await expireStaleHolds(db)

  const rows = await db.query<{
    id: string
    section: string
    row: string
    num: number
    x: number
    y: number
    z: number
    status: string
    hold_expires_at: string | null
    category_key: string
    category_name: string
    category_name_en: string
    price_idr: number
    color_hex: string
  }>(`
    SELECT s.id, s.section, s.row, s.num, s.x, s.y, s.z, s.status, s.hold_expires_at,
           c.key AS category_key, c.name AS category_name, c.name_en AS category_name_en,
           c.price_idr, c.color_hex
    FROM seats s
    JOIN ticket_categories c ON c.id = s.category_id
    ORDER BY s.section, s.row, s.num
  `)

  return Response.json(
    rows.map((s) => ({
      id: s.id,
      section: s.section,
      row: s.row,
      num: s.num,
      x: Number(s.x),
      y: Number(s.y),
      z: Number(s.z),
      status: s.status,
      holdExpiresAt: s.hold_expires_at ? new Date(s.hold_expires_at).toISOString() : null,
      categoryKey: s.category_key,
      categoryName: s.category_name,
      categoryNameEn: s.category_name_en,
      priceIdr: s.price_idr,
      colorHex: s.color_hex,
    })),
  )
}
