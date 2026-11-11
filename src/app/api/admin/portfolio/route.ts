import { connection } from 'next/server'
import { getDb } from '@/lib/db'
import { isAdmin, unauthorized } from '@/lib/auth'
import { expireStaleHolds } from '@/services/seats'
import { getAdminStats } from '@/services/adminStats'
import { buildLivePortfolioEvent, buildPortfolio, type PortfolioEventRow } from '@/lib/portfolio'

export async function GET(req: Request) {
  await connection()
  if (!isAdmin(req)) return unauthorized()
  const db = await getDb()
  await expireStaleHolds(db)

  const stats = await getAdminStats(db)
  const [row] = await db.query<{
    id: number
    name: string
    name_en: string
    venue: string
    starts_at: string
  }>(`
    SELECT id, name, name_en, venue, starts_at
    FROM events ORDER BY id LIMIT 1
  `)
  if (!row) return Response.json({ error: 'NO_EVENT' }, { status: 404 })

  const event: PortfolioEventRow = {
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    venue: row.venue,
    startsAt: row.starts_at,
  }

  return Response.json(buildPortfolio(buildLivePortfolioEvent(event, stats)))
}
