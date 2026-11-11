import type { SqlDb } from '@/lib/db'
import type { TicketEmail } from '@/services/email'

/**
 * Absolute origin used in emailed links. Prefers configuration over request
 * headers so a spoofed Host header cannot point the ticket link elsewhere.
 */
export function resolveTicketOrigin(
  requestUrl: string,
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.APP_URL) return env.APP_URL.replace(/\/+$/, '')
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL.replace(/\/+$/, '')}`
  return new URL(requestUrl).origin
}

type OrderRow = {
  name: string
  email: string
  status: string
  seat_label: string
  event_name: string
  starts_at: string
  venue: string
  category_name: string
  list_price_idr: number | null
  auto_discount_idr: number
  auto_discount_name: string | null
  promo_discount_idr: number
  promo_code: string | null
  total_idr: number
}

/** Loads the data needed to email an e-ticket link for an order. */
export async function loadTicketEmail(
  db: SqlDb,
  code: string,
  origin: string,
): Promise<{ status: string; ticket: TicketEmail } | null> {
  const rows = await db.query<OrderRow>(
    `SELECT o.name, o.email, o.status,
            s.id AS seat_label,
            e.name AS event_name,
            e.starts_at,
            e.venue,
            c.name AS category_name,
            o.list_price_idr,
            o.auto_discount_idr,
            o.auto_discount_name,
            o.promo_discount_idr,
            o.promo_code,
            o.total_idr
     FROM orders o
     JOIN seats s ON s.id = o.seat_id
     JOIN ticket_categories c ON c.id = s.category_id
     JOIN events e ON e.id = c.event_id
     WHERE o.code = $1`,
    [code],
  )

  if (rows.length === 0) return null
  const order = rows[0]

  return {
    status: order.status,
    ticket: {
      to: order.email,
      name: order.name,
      eventName: order.event_name,
      eventDateIso: new Date(order.starts_at).toISOString(),
      venue: order.venue,
      seatLabel: order.seat_label,
      categoryName: order.category_name,
      orderCode: code,
      listPriceIdr: Number(order.list_price_idr ?? order.total_idr),
      autoDiscountIdr: Number(order.auto_discount_idr),
      autoDiscountName: order.auto_discount_name,
      promoDiscountIdr: Number(order.promo_discount_idr),
      promoCode: order.promo_code,
      totalIdr: Number(order.total_idr),
      ticketUrl: `${origin}/eticket/${encodeURIComponent(code)}`,
    },
  }
}
