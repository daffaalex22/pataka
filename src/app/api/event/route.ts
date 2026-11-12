import { connection } from 'next/server'
import { getDb } from '@/lib/db'
import { expireStaleHolds } from '@/services/seats'

export async function GET() {
  await connection()
  const db = await getDb()
  await expireStaleHolds(db)

  const events = await db.query<{
    id: number
    name: string
    name_en: string
    venue: string
    venue_en: string
    starts_at: string
    description: string
    description_en: string
  }>('SELECT * FROM events LIMIT 1')

  if (events.length === 0) {
    return Response.json({ error: 'NOT_SEEDED' }, { status: 404 })
  }
  const event = events[0]

  const categories = await db.query<{
    id: number
    key: string
    name: string
    name_en: string
    price_idr: number
    color_hex: string
    sort_order: number
    quota: number
    sales_open: boolean
    available: number
    held: number
    sold: number
  }>(`
    SELECT c.id, c.key, c.name, c.name_en, c.price_idr, c.color_hex, c.sort_order, c.quota, c.sales_open,
           count(*) FILTER (WHERE s.status = 'available')::int AS available,
           count(*) FILTER (WHERE s.status = 'held')::int AS held,
           count(*) FILTER (WHERE s.status = 'sold')::int AS sold
    FROM ticket_categories c
    LEFT JOIN seats s ON s.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order
  `)

  return Response.json({
    event: {
      id: event.id,
      name: event.name,
      nameEn: event.name_en,
      venue: event.venue,
      venueEn: event.venue_en,
      startsAt: new Date(event.starts_at).toISOString(),
      description: event.description,
      descriptionEn: event.description_en,
    },
    categories: categories.map((c) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      nameEn: c.name_en,
      priceIdr: c.price_idr,
      colorHex: c.color_hex,
      sortOrder: c.sort_order,
      quota: c.quota,
      salesOpen: c.sales_open,
      available: c.available,
      held: c.held,
      sold: c.sold,
      remaining: Math.max(0, c.quota - c.held - c.sold),
    })),
  })
}
