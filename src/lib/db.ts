import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws
}

export interface SqlClient {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>
}

export interface SqlDb extends SqlClient {
  transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T>
}

/** Neon serverless (WebSocket) adapter — supports interactive transactions. */
export function createNeonDb(connectionString: string): SqlDb {
  const pool = new Pool({ connectionString, max: 5 })
  pool.on('error', (error: Error) => {
    console.error('neon pool error', error)
  })
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
let localDb: Promise<SqlDb> | null = null

/**
 * Singleton DB handle (survives HMR / warm lambda reuse).
 * `DATABASE_URL=pglite://<dir>` runs an in-process Postgres for local dev.
 */
export function getDb(): SqlDb | Promise<SqlDb> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  if (url.startsWith('pglite')) {
    if (!localDb) localDb = createPgliteDb(url)
    return localDb
  }
  if (!globalDb) globalDb = createNeonDb(url)
  return globalDb
}

async function createPgliteDb(url: string): Promise<SqlDb> {
  const { PGlite } = await import('@electric-sql/pglite')
  const dataDir = url.replace(/^pglite:\/\//, '') || undefined
  const pg = new PGlite(dataDir)
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
  }
}
