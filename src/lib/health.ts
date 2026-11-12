import type { SqlClient } from './db'

export type HealthCheck = {
  database: boolean
  discountsSchema: boolean
}

/**
 * Readiness probe for the latest schema change (the discount engine tables).
 * Update this check when a new migration becomes the critical path.
 */
export async function checkHealth(db: SqlClient): Promise<HealthCheck> {
  const rows = await db.query<{ discounts: string | null }>(
    "SELECT to_regclass('public.discounts')::text AS discounts",
  )

  return {
    database: true,
    discountsSchema: rows[0]?.discounts === 'discounts',
  }
}
