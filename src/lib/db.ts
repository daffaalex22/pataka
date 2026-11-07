import { Pool } from '@neondatabase/serverless'

export interface SqlClient {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>
}

export interface SqlDb extends SqlClient {
  transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T>
}

/** Neon serverless (WebSocket) adapter — supports interactive transactions. */
export function createNeonDb(connectionString: string): SqlDb {
  const pool = new Pool({ connectionString })
  const client: SqlClient = {
    query: async <T = Record<string, unknown>>(text: string, params?: unknown[]) => {
      const result = await pool.query(text, params as unknown[])
      return result.rows as T[]
    },
  }
  return {
    ...client,
    transaction: async <T>(fn: (tx: SqlClient) => Promise<T>) => {
      const conn = await pool.connect()
      try {
        await conn.query('BEGIN')
        const value = await fn({
          query: async <R = Record<string, unknown>>(text: string, params?: unknown[]) => {
            const result = await conn.query(text, params as unknown[])
            return result.rows as R[]
          },
        })
        await conn.query('COMMIT')
        return value
      } catch (error) {
        await conn.query('ROLLBACK')
        throw error
      } finally {
        conn.release()
      }
    },
  }
}

let globalDb: SqlDb | null = null

/** Singleton production DB handle (survives HMR / warm lambda reuse). */
export function getDb(): SqlDb {
  if (globalDb) return globalDb
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  globalDb = createNeonDb(url)
  return globalDb
}
