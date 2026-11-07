import type { SqlDb } from './db'
import { SCHEMA_STATEMENTS } from './schema'

export async function migrate(db: SqlDb): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.query(statement)
  }
}
