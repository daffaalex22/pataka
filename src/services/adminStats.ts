import type { SqlDb } from '@/lib/db'
import type { AdminStats } from '@/lib/types'

/** Shared admin aggregates used by the event dashboard and the mall portfolio. */
export async function getAdminStats(db: SqlDb): Promise<AdminStats> {
  const [orderStats] = await db.query<{
    total: number
    pending: number
    paid: number
    cancelled: number
    checked_in: number
    revenue: number
  }>(`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE status = 'pending')::int AS pending,
           count(*) FILTER (WHERE status = 'paid')::int AS paid,
           count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
           count(*) FILTER (WHERE checked_in_at IS NOT NULL)::int AS checked_in,
           COALESCE(sum(total_idr) FILTER (WHERE status = 'paid'), 0)::int AS revenue
    FROM orders
  `)

  const seatStats = await db.query<{ status: string; count: number }>(
    'SELECT status, count(*)::int AS count FROM seats GROUP BY status',
  )
  const seats = { available: 0, held: 0, sold: 0 }
  for (const row of seatStats) {
    if (row.status === 'available' || row.status === 'held' || row.status === 'sold') {
      seats[row.status] = row.count
    }
  }

  const categories = await db.query<{
    id: number
    key: string
    name: string
    name_en: string
    price_idr: number
    quota: number
    sales_open: boolean
    color_hex: string
    available: number
    held: number
    sold: number
  }>(`
    SELECT c.id, c.key, c.name, c.name_en, c.price_idr, c.quota, c.sales_open, c.color_hex,
           count(*) FILTER (WHERE s.status = 'available')::int AS available,
           count(*) FILTER (WHERE s.status = 'held')::int AS held,
           count(*) FILTER (WHERE s.status = 'sold')::int AS sold
    FROM ticket_categories c
    LEFT JOIN seats s ON s.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order
  `)

  return {
    orders: {
      total: orderStats.total,
      pending: orderStats.pending,
      paid: orderStats.paid,
      cancelled: orderStats.cancelled,
      checkedIn: orderStats.checked_in,
      revenueIdr: orderStats.revenue,
    },
    seats,
    categories: categories.map((c) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      nameEn: c.name_en,
      priceIdr: c.price_idr,
      quota: c.quota,
      salesOpen: c.sales_open,
      colorHex: c.color_hex,
      available: c.available,
      held: c.held,
      sold: c.sold,
    })),
  }
}
