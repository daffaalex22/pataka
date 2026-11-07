import { PGlite } from '@electric-sql/pglite'
import type { SqlClient, SqlDb } from '../../src/lib/db'

export type TestDb = SqlDb & { close(): Promise<void> }

/** In-process real Postgres (WASM) for service tests. */
export async function createTestDb(): Promise<TestDb> {
  const pg = new PGlite()
  const client: SqlClient = {
    query: async <T = Record<string, unknown>>(text: string, params?: unknown[]) => {
      const result = await pg.query<T>(text, params as unknown[])
      return result.rows
    },
  }
  return {
    ...client,
    transaction: async <T>(fn: (tx: SqlClient) => Promise<T>) => {
      await pg.exec('BEGIN')
      try {
        const value = await fn(client)
        await pg.exec('COMMIT')
        return value
      } catch (error) {
        await pg.exec('ROLLBACK')
        throw error
      }
    },
    close: () => pg.close(),
  }
}
