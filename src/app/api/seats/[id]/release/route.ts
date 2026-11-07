import { getDb } from '@/lib/db'
import { releaseHold } from '@/services/seats'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body || typeof body.holdToken !== 'string') {
    return Response.json({ error: 'VALIDATION' }, { status: 400 })
  }

  const db = await getDb()
  const released = await releaseHold(db, id, body.holdToken)
  return Response.json({ released })
}
