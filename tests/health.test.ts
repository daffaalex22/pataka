import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { checkHealth } from '../src/lib/health'
import { migrate } from '../src/lib/migrate'

let db: TestDb

beforeEach(async () => {
  db = await createTestDb()
})

afterEach(async () => {
  await db.close()
})

describe('checkHealth', () => {
  it('reports the discount schema as missing before migration', async () => {
    await expect(checkHealth(db)).resolves.toEqual({
      database: true,
      discountsSchema: false,
    })
  })

  it('reports the discount schema as present after migration', async () => {
    await migrate(db)

    await expect(checkHealth(db)).resolves.toEqual({
      database: true,
      discountsSchema: true,
    })
  })
})
