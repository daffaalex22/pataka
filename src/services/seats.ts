import type { SqlClient, SqlDb } from '@/lib/db'

export const HOLD_MINUTES = 10

/** Lazily release holds that have expired. Safe to call on every seat read. */
export async function expireStaleHolds(db: SqlClient): Promise<void> {
  await db.query(
    `UPDATE seats
     SET status = 'available', hold_token = NULL, hold_expires_at = NULL
     WHERE status = 'held' AND hold_expires_at IS NOT NULL AND hold_expires_at < now()`,
  )
}

export type HoldResult = { holdToken: string; expiresAt: string } | 'SEAT_UNAVAILABLE' | 'SALES_CLOSED'

/** Atomically acquire a 10-minute hold. Exactly one concurrent caller can win a seat. */
export async function holdSeat(db: SqlDb, seatId: string): Promise<HoldResult> {
  await expireStaleHolds(db)

  const rows = await db.query<{
    hold_token: string
    hold_expires_at: string
    sales_open: boolean
  }>(
    `SELECT c.sales_open FROM seats s
     JOIN ticket_categories c ON c.id = s.category_id
     WHERE s.id = $1`,
    [seatId],
  )
  if (rows.length === 0) return 'SEAT_UNAVAILABLE'
  if (!rows[0].sales_open) return 'SALES_CLOSED'

  const token = crypto.randomUUID()
  const updated = await db.query<{ hold_expires_at: string }>(
    `UPDATE seats
     SET status = 'held', hold_token = $1, hold_expires_at = now() + ($2 || ' minutes')::interval
     WHERE id = $3 AND status = 'available'
       AND (SELECT count(*) FROM seats s2
            WHERE s2.category_id = seats.category_id AND s2.status IN ('held', 'sold'))
           < (SELECT quota FROM ticket_categories c WHERE c.id = seats.category_id)
     RETURNING hold_expires_at`,
    [token, String(HOLD_MINUTES), seatId],
  )
  if (updated.length === 0) return 'SEAT_UNAVAILABLE'
  return { holdToken: token, expiresAt: new Date(updated[0].hold_expires_at).toISOString() }
}
