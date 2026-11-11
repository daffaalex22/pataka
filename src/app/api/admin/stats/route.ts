import { connection } from 'next/server'
import { getDb } from '@/lib/db'
import { isAdmin, unauthorized } from '@/lib/auth'
import { getAdminStats } from '@/services/adminStats'
import { expireStaleHolds } from '@/services/seats'

export async function GET(req: Request) {
  await connection()
  if (!isAdmin(req)) return unauthorized()
  const db = await getDb()
  await expireStaleHolds(db)

  return Response.json(await getAdminStats(db))
}
