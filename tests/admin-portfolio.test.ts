import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'
import { seedDemo } from '../src/lib/demo'
import { getAdminStats } from '../src/services/adminStats'
import { buildLivePortfolioEvent } from '../src/lib/portfolio'

let db: TestDb

beforeEach(async () => {
  db = await createTestDb()
  await migrate(db)
  await seed(db)
  await seedDemo(db)
})

describe('live portfolio event', () => {
  it('matches admin stats exactly', async () => {
    const stats = await getAdminStats(db)
    const [event] = await db.query<{
      id: number; name: string; name_en: string; venue: string; starts_at: string
    }>('SELECT id, name, name_en, venue, starts_at FROM events ORDER BY id LIMIT 1')
    if (!event) throw new Error('seed did not create an event')

    const live = buildLivePortfolioEvent(
      { id: event.id, name: event.name, nameEn: event.name_en, venue: event.venue, startsAt: event.starts_at },
      stats,
    )

    expect(live.source).toBe('live')
    expect(live.sold).toBe(stats.orders.paid)
    expect(live.revenueIdr).toBe(stats.orders.revenueIdr)
    expect(live.checkedIn).toBe(stats.orders.checkedIn)
    expect(live.capacity).toBe(stats.categories.reduce((sum, category) => sum + category.quota, 0))
  })
})
