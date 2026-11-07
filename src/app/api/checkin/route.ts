import { getDb } from '@/lib/db'
import { isAdmin, unauthorized } from '@/lib/auth'
import { scan } from '@/services/checkin'

export async function POST(req: Request) {
  if (!isAdmin(req)) return unauthorized()

  const body = await req.json().catch(() => null)
  if (!body || typeof body.payload !== 'string' || body.payload.trim().length === 0) {
    return Response.json({ error: 'VALIDATION' }, { status: 400 })
  }

  const db = await getDb()
  const outcome = await scan(db, body.payload.trim())
  return Response.json(outcome)
}
