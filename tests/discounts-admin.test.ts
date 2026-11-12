import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'
import {
  createDiscount,
  listDiscounts,
  resolvePrice,
  updateDiscount,
} from '../src/services/discounts'

let db: TestDb

beforeEach(async () => {
  db = await createTestDb()
  await migrate(db)
  await seed(db)
})

afterEach(async () => {
  await db.close()
})

const WINDOW = {
  startsAt: '2020-01-01T00:00:00.000Z',
  endsAt: '2030-01-01T00:00:00.000Z',
}

describe('discount service', () => {
  it('creates and lists a phase', async () => {
    const created = await createDiscount(db, {
      kind: 'phase',
      name: 'Early Bird',
      nameEn: 'Early Bird',
      type: 'percent',
      value: 20,
      ...WINDOW,
    })
    expect(typeof created).toBe('object')
    if (typeof created === 'string') throw new Error(created)

    const rows = await listDiscounts(db)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: 'phase', code: null, value: 20, active: true })
  })

  it('creates a code and rejects a duplicate', async () => {
    const input = {
      kind: 'code' as const,
      code: 'patka10',
      name: 'Pataka 10',
      nameEn: 'Pataka 10',
      type: 'percent' as const,
      value: 10,
      maxUses: 100,
      ...WINDOW,
    }
    const first = await createDiscount(db, input)
    expect(typeof first).toBe('object')
    if (typeof first === 'string') throw new Error(first)
    expect(first.code).toBe('PATKA10')

    expect(await createDiscount(db, input)).toBe('CODE_TAKEN')
  })

  it('rejects an unknown category', async () => {
    const result = await createDiscount(db, {
      kind: 'code',
      code: 'NOPE10',
      name: 'Nope',
      nameEn: 'Nope',
      type: 'fixed',
      value: 10_000,
      categoryKey: 'NOPE',
      ...WINDOW,
    })
    expect(result).toBe('CATEGORY_NOT_FOUND')
  })

  it('updates value, window, limit, and active state', async () => {
    const created = await createDiscount(db, {
      kind: 'phase',
      name: 'Early Bird',
      nameEn: 'Early Bird',
      type: 'percent',
      value: 20,
      ...WINDOW,
    })
    if (typeof created === 'string') throw new Error(created)

    const updated = await updateDiscount(db, created.id, { value: 15, active: false })
    expect(typeof updated).toBe('object')
    if (typeof updated === 'string' || updated === null) throw new Error('update failed')
    expect(updated.value).toBe(15)
    expect(updated.active).toBe(false)
  })

  it('resolves the effective price from an active phase', async () => {
    await createDiscount(db, {
      kind: 'phase',
      name: 'Early Bird',
      nameEn: 'Early Bird',
      type: 'percent',
      value: 20,
      ...WINDOW,
    })
    const breakdown = await resolvePrice(db, 'VIP', 1_500_000, new Date('2026-11-11T10:00:00.000Z'))
    expect(breakdown.listPriceIdr).toBe(1_500_000)
    expect(breakdown.autoDiscountIdr).toBe(300_000)
    expect(breakdown.subtotalIdr).toBe(1_200_000)
    expect(breakdown.totalIdr).toBe(1_200_000)
  })
})
