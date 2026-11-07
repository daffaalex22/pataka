import { connection } from 'next/server'
import { getDb } from '@/lib/db'
import { buildIcs } from '@/lib/ics'

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  await connection()
  const { code } = await ctx.params
  const db = await getDb()

  const orders = await db.query<{ name: string; seat_id: string }>(
    'SELECT name, seat_id FROM orders WHERE code = $1',
    [code],
  )
  if (orders.length === 0) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })

  const events = await db.query<{
    name: string
    venue: string
    starts_at: string
  }>('SELECT name, venue, starts_at FROM events LIMIT 1')
  if (events.length === 0) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })

  const ics = buildIcs({
    code,
    name: orders[0].name,
    seatLabel: orders[0].seat_id,
    startsAt: events[0].starts_at,
    venue: events[0].venue,
    title: events[0].name,
  })

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="pataka-${code}.ics"`,
    },
  })
}
