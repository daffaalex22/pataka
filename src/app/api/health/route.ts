import { connection } from 'next/server'
import { getDb } from '@/lib/db'
import { checkHealth } from '@/lib/health'

export async function GET() {
  await connection()

  try {
    const db = await getDb()
    const checks = await checkHealth(db)
    const ok = checks.database && checks.discountsSchema

    return Response.json({ ok, checks }, { status: ok ? 200 : 503 })
  } catch (error) {
    console.error('health check failed', error)
    return Response.json(
      { ok: false, checks: { database: false, discountsSchema: false } },
      { status: 503 },
    )
  }
}
