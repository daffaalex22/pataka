import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'
import { seedDemo } from '../src/lib/demo'

let db: TestDb

beforeEach(async () => {
  db = await createTestDb()
  await migrate(db)
  await seed(db)
})

afterEach(async () => {
  await db.close()
})

describe('seedDemo discounts', () => {
  it('adds the demo discounts once and is idempotent', async () => {
    await seedDemo(db)
    const [first] = await db.query<{ count: number }>('SELECT count(*)::int AS count FROM discounts')
    expect(first.count).toBeGreaterThanOrEqual(5)

    await seedDemo(db)
    const [second] = await db.query<{ count: number }>('SELECT count(*)::int AS count FROM discounts')
    expect(second.count).toBe(first.count)
  })
})
