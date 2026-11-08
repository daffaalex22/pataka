import type { SqlDb } from '@/lib/db'
import type { TicketEmail } from '@/services/email'

type OrderRow = {
  name: string
  email: string
  status: string
  seat_label: string
  event_name: string
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
            e.name AS event_name
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
      seatLabel: order.seat_label,
      orderCode: code,
      ticketUrl: `${origin}/eticket/${encodeURIComponent(code)}`,
    },
  }
}
