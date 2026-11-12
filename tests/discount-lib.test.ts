import { describe, expect, it } from 'vitest'
import {
  applyPromoToBreakdown,
  computeDiscountAmount,
  isDiscountLive,
  normalizeCode,
  pickBestPhase,
  priceWithPhase,
  validateDiscountInput,
  validateDiscountPatch,
  validatePromo,
  type DiscountRule,
} from '../src/lib/discounts'

const AT = new Date('2026-11-11T10:00:00.000Z')

function phase(overrides: Partial<DiscountRule> = {}): DiscountRule {
  return {
    id: 1,
    kind: 'phase',
    code: null,
    name: 'Early Bird',
    nameEn: 'Early Bird',
    type: 'percent',
    value: 20,
    maxDiscountIdr: null,
    minOrderIdr: 0,
    categoryKey: null,
    startsAt: '2020-01-01T00:00:00.000Z',
    endsAt: '2030-01-01T00:00:00.000Z',
    maxUses: null,
    usedCount: 0,
    active: true,
    priority: 0,
    ...overrides,
  }
}

describe('computeDiscountAmount', () => {
  it('computes a percentage and rounds to whole rupiah', () => {
    expect(computeDiscountAmount(phase(), 1_500_000)).toBe(300_000)
    expect(computeDiscountAmount(phase({ value: 15 }), 1_550_000)).toBe(232_500)
  })

  it('applies a percentage cap', () => {
    expect(computeDiscountAmount(phase({ value: 50, maxDiscountIdr: 100_000 }), 1_500_000)).toBe(100_000)
  })

  it('caps a fixed discount at the base price and never goes negative', () => {
    expect(computeDiscountAmount(phase({ type: 'fixed', value: 200_000 }), 150_000)).toBe(150_000)
    expect(computeDiscountAmount(phase({ type: 'fixed', value: 50_000 }), 0)).toBe(0)
  })
})

describe('isDiscountLive', () => {
  it('includes the start and excludes the end', () => {
    expect(isDiscountLive(phase({ startsAt: AT.toISOString() }), AT)).toBe(true)
    expect(isDiscountLive(phase({ endsAt: AT.toISOString() }), AT)).toBe(false)
    expect(isDiscountLive(phase({ active: false }), AT)).toBe(false)
  })
})

describe('pickBestPhase', () => {
  it('picks the largest discount and ignores other categories', () => {
    const percent = phase({ id: 1, value: 20 })
    const fixed = phase({ id: 2, type: 'fixed', value: 250_000 })
    const otherCategory = phase({ id: 3, type: 'fixed', value: 900_000, categoryKey: 'REG' })
    expect(pickBestPhase([percent, fixed, otherCategory], 'VIP', 1_500_000, AT)?.id).toBe(1)
  })

  it('breaks ties by priority, then id', () => {
    const low = phase({ id: 1, type: 'fixed', value: 300_000, priority: 0 })
    const high = phase({ id: 2, type: 'fixed', value: 300_000, priority: 5 })
    expect(pickBestPhase([low, high], 'VIP', 1_500_000, AT)?.id).toBe(2)
  })
})

describe('validatePromo', () => {
  const code = phase({
    kind: 'code',
    code: 'PATKA10',
    type: 'percent',
    value: 10,
    maxUses: 100,
    usedCount: 0,
    categoryKey: 'VIP',
    minOrderIdr: 500_000,
  })

  it('returns null when the code is valid', () => {
    expect(validatePromo(code, { subtotalIdr: 1_200_000, categoryKey: 'VIP', at: AT })).toBeNull()
  })

  it('returns the first applicable error', () => {
    expect(validatePromo(null, { subtotalIdr: 1_200_000, categoryKey: 'VIP', at: AT })).toBe('CODE_NOT_FOUND')
    expect(validatePromo({ ...code, active: false }, { subtotalIdr: 1_200_000, categoryKey: 'VIP', at: AT })).toBe('CODE_INACTIVE')
    expect(validatePromo({ ...code, startsAt: '2030-01-01T00:00:00.000Z' }, { subtotalIdr: 1_200_000, categoryKey: 'VIP', at: AT })).toBe('CODE_NOT_STARTED')
    expect(validatePromo({ ...code, endsAt: '2020-01-01T00:00:00.000Z' }, { subtotalIdr: 1_200_000, categoryKey: 'VIP', at: AT })).toBe('CODE_EXPIRED')
    expect(validatePromo(code, { subtotalIdr: 1_200_000, categoryKey: 'REG', at: AT })).toBe('CODE_CATEGORY')
    expect(validatePromo(code, { subtotalIdr: 100_000, categoryKey: 'VIP', at: AT })).toBe('CODE_MIN_ORDER')
    expect(validatePromo({ ...code, usedCount: 100 }, { subtotalIdr: 1_200_000, categoryKey: 'VIP', at: AT })).toBe('CODE_EXHAUSTED')
  })
})

describe('priceWithPhase and applyPromoToBreakdown', () => {
  it('returns an unchanged total when no phase applies', () => {
    expect(priceWithPhase(1_500_000, 'VIP', [], AT)).toEqual({
      listPriceIdr: 1_500_000,
      autoDiscountId: null,
      autoDiscountIdr: 0,
      autoDiscountName: null,
      autoDiscountNameEn: null,
      autoDiscountPercent: null,
      subtotalIdr: 1_500_000,
      promoDiscountId: null,
      promoDiscountIdr: 0,
      promoCode: null,
      totalIdr: 1_500_000,
    })
  })

  it('stacks one phase and one code on the subtotal', () => {
    const withPhase = priceWithPhase(1_500_000, 'VIP', [phase()], AT)
    expect(withPhase.subtotalIdr).toBe(1_200_000)
    expect(withPhase.totalIdr).toBe(1_200_000)

    const code = phase({ id: 9, kind: 'code', code: 'PATKA10', type: 'percent', value: 10 })
    const withCode = applyPromoToBreakdown(withPhase, code)
    expect(withCode.promoDiscountIdr).toBe(120_000)
    expect(withCode.totalIdr).toBe(1_080_000)
  })
})

describe('normalizeCode and validateDiscountInput', () => {
  it('normalizes codes', () => {
    expect(normalizeCode('  patka10 ')).toBe('PATKA10')
  })

  it('rejects bad admin input', () => {
    expect(validateDiscountInput({ kind: 'code', code: 'x', name: 'A', nameEn: 'A', type: 'percent', value: 101, startsAt: AT.toISOString() })).toBe('VALIDATION')
    expect(validateDiscountInput({ kind: 'code', code: 'OK10', name: 'A', nameEn: 'A', type: 'fixed', value: 0, startsAt: AT.toISOString() })).toBe('VALIDATION')
    expect(validateDiscountInput({ kind: 'code', code: 'OK10', name: 'A', nameEn: 'A', type: 'fixed', value: 1000, startsAt: AT.toISOString(), endsAt: '2020-01-01T00:00:00.000Z' })).toBe('VALIDATION')
    expect(validateDiscountInput({ kind: 'phase', code: 'OK10', name: 'A', nameEn: 'A', type: 'percent', value: 10, startsAt: AT.toISOString() })).toBe('VALIDATION')
    expect(validateDiscountInput({ kind: 'phase', name: 'A', nameEn: 'A', type: 'percent', value: 10, startsAt: AT.toISOString(), maxUses: 10 })).toBe('VALIDATION')
    expect(validateDiscountInput({ kind: 'phase', name: 'A', nameEn: 'A', type: 'percent', value: 10, startsAt: AT.toISOString(), minOrderIdr: 100_000 })).toBe('VALIDATION')
    expect(validateDiscountInput({ kind: 'code', code: 'OK10', name: 'A', nameEn: 'A', type: 'percent', value: 10, startsAt: AT.toISOString() })).toBeNull()
  })

  it('rejects immutable patch changes', () => {
    expect(validateDiscountPatch(phase({ kind: 'code', code: 'OK10' }), { type: 'fixed' })).toBe('IMMUTABLE')
    expect(validateDiscountPatch(phase({ kind: 'code', code: 'OK10' }), { code: 'NEW10' })).toBe('IMMUTABLE')
    expect(validateDiscountPatch(phase(), { value: 101 })).toBe('VALIDATION')
    expect(validateDiscountPatch(phase(), { value: 15 })).toBeNull()
  })
})
