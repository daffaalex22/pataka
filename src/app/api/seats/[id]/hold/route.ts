import { getDb } from '@/lib/db'
import { holdSeat } from '@/services/seats'

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = await getDb()
  const result = await holdSeat(db, id)

  if (result === 'SEAT_UNAVAILABLE') {
    return Response.json({ error: 'SEAT_UNAVAILABLE' }, { status: 409 })
  }
  if (result === 'SALES_CLOSED') {
    return Response.json({ error: 'SALES_CLOSED' }, { status: 403 })
  }
  return Response.json(result)
}
