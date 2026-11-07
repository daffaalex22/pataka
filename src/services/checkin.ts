import type { SqlDb } from '@/lib/db'
import { parseQrPayload } from '@/lib/qr'

export type ScanResult = 'valid' | 'already_used' | 'invalid'

export type ScanOutcome = {
  result: ScanResult
  orderCode?: string
  seatLabel?: string
  name?: string
}

async function logScan(db: SqlDb, payload: string, result: ScanResult, orderCode?: string) {
  await db.query('INSERT INTO scans (payload, result, order_code) VALUES ($1,$2,$3)', [
    payload.slice(0, 300),
    result,
    orderCode ?? null,
  ])
}

/**
 * Validate a scanned e-ticket payload.
 * - unknown/forged payload, unknown order, or unpaid order -> invalid
 * - paid order not yet checked in -> valid (marks attendance atomically)
 * - paid order already checked in -> already_used (attendance timestamp untouched)
 */
export async function scan(db: SqlDb, payload: string): Promise<ScanOutcome> {
  const parsed = parseQrPayload(payload)
  if (!parsed) {
    await logScan(db, payload, 'invalid')
    return { result: 'invalid' }
  }

  return db.transaction(async (tx) => {
    const rows = await tx.query<{
      code: string
      status: string
      name: string
      checked_in_at: string | null
      seat_id: string
    }>(
      `SELECT o.code, o.status, o.name, o.checked_in_at, s.id AS seat_id
       FROM orders o JOIN seats s ON s.id = o.seat_id
       WHERE o.code = $1`,
      [parsed.orderCode],
    )

    if (rows.length === 0 || rows[0].status !== 'paid') {
      await tx.query('INSERT INTO scans (payload, result, order_code) VALUES ($1,$2,$3)', [
        payload.slice(0, 300),
        'invalid',
        parsed.orderCode,
      ])
      return { result: 'invalid', orderCode: parsed.orderCode }
    }

    const order = rows[0]
    if (order.checked_in_at) {
      await tx.query('INSERT INTO scans (payload, result, order_code) VALUES ($1,$2,$3)', [
        payload.slice(0, 300),
        'already_used',
        order.code,
      ])
      return { result: 'already_used', orderCode: order.code, seatLabel: order.seat_id, name: order.name }
    }

    const updated = await tx.query(
      `UPDATE orders SET checked_in_at = now()
       WHERE code = $1 AND status = 'paid' AND checked_in_at IS NULL
       RETURNING code`,
      [order.code],
    )

    const result: ScanResult = updated.length > 0 ? 'valid' : 'already_used'
    await tx.query('INSERT INTO scans (payload, result, order_code) VALUES ($1,$2,$3)', [
      payload.slice(0, 300),
      result,
      order.code,
    ])
    return { result, orderCode: order.code, seatLabel: order.seat_id, name: order.name }
  })
}
