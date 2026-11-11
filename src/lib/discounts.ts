export type DiscountKind = 'phase' | 'code'
export type DiscountType = 'percent' | 'fixed'

export type DiscountRule = {
  id: number
  kind: DiscountKind
  code: string | null
  name: string
  nameEn: string
  type: DiscountType
  value: number
  maxDiscountIdr: number | null
  minOrderIdr: number
  categoryKey: string | null
  startsAt: string
  endsAt: string | null
  maxUses: number | null
  usedCount: number
  active: boolean
  priority: number
}

export type DiscountError =
  | 'CODE_NOT_FOUND'
  | 'CODE_INACTIVE'
  | 'CODE_NOT_STARTED'
  | 'CODE_EXPIRED'
  | 'CODE_CATEGORY'
  | 'CODE_MIN_ORDER'
  | 'CODE_EXHAUSTED'

export type PriceBreakdown = {
  listPriceIdr: number
  autoDiscountId: number | null
  autoDiscountIdr: number
  autoDiscountName: string | null
  autoDiscountNameEn: string | null
  autoDiscountPercent: number | null
  subtotalIdr: number
  promoDiscountId: number | null
  promoDiscountIdr: number
  promoCode: string | null
  totalIdr: number
}

export type DiscountInput = {
  kind: DiscountKind
  code?: string | null
  name: string
  nameEn: string
  type: DiscountType
  value: number
  maxDiscountIdr?: number | null
  minOrderIdr?: number
  categoryKey?: string | null
  startsAt: string
  endsAt?: string | null
  maxUses?: number | null
  active?: boolean
  priority?: number
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase()
}

export function computeDiscountAmount(
  rule: Pick<DiscountRule, 'type' | 'value' | 'maxDiscountIdr'>,
  basePrice: number,
): number {
  if (basePrice <= 0) return 0
  const amount =
    rule.type === 'percent'
      ? Math.min(Math.round((basePrice * rule.value) / 100), rule.maxDiscountIdr ?? Infinity)
      : Math.min(rule.value, basePrice)
  return Math.max(0, amount)
}

export function isDiscountLive(
  rule: Pick<DiscountRule, 'active' | 'startsAt' | 'endsAt'>,
  at: Date,
): boolean {
  const t = at.getTime()
  return (
    rule.active &&
    new Date(rule.startsAt).getTime() <= t &&
    (rule.endsAt === null || t < new Date(rule.endsAt).getTime())
  )
}

export function pickBestPhase(
  rules: DiscountRule[],
  categoryKey: string,
  basePrice: number,
  at: Date,
): DiscountRule | null {
  const candidates = rules.filter(
    (rule) =>
      rule.kind === 'phase' &&
      isDiscountLive(rule, at) &&
      (rule.categoryKey === null || rule.categoryKey === categoryKey),
  )
  if (candidates.length === 0) return null
  return [...candidates].sort((a, b) => {
    const aAmount = computeDiscountAmount(a, basePrice)
    const bAmount = computeDiscountAmount(b, basePrice)
    if (bAmount !== aAmount) return bAmount - aAmount
    if (b.priority !== a.priority) return b.priority - a.priority
    return a.id - b.id
  })[0]
}

export function validatePromo(
  rule: DiscountRule | null,
  input: { subtotalIdr: number; categoryKey: string; at: Date },
): DiscountError | null {
  if (rule === null) return 'CODE_NOT_FOUND'
  if (!rule.active) return 'CODE_INACTIVE'
  if (new Date(rule.startsAt).getTime() > input.at.getTime()) return 'CODE_NOT_STARTED'
  if (rule.endsAt !== null && input.at.getTime() >= new Date(rule.endsAt).getTime()) {
    return 'CODE_EXPIRED'
  }
  if (rule.categoryKey !== null && rule.categoryKey !== input.categoryKey) return 'CODE_CATEGORY'
  if (input.subtotalIdr < rule.minOrderIdr) return 'CODE_MIN_ORDER'
  if (rule.maxUses !== null && rule.usedCount >= rule.maxUses) return 'CODE_EXHAUSTED'
  return null
}

export function priceWithPhase(
  listPriceIdr: number,
  categoryKey: string,
  rules: DiscountRule[],
  at: Date,
): PriceBreakdown {
  const phase = pickBestPhase(rules, categoryKey, listPriceIdr, at)
  if (phase === null) {
    return {
      listPriceIdr,
      autoDiscountId: null,
      autoDiscountIdr: 0,
      autoDiscountName: null,
      autoDiscountNameEn: null,
      autoDiscountPercent: null,
      subtotalIdr: listPriceIdr,
      promoDiscountId: null,
      promoDiscountIdr: 0,
      promoCode: null,
      totalIdr: listPriceIdr,
    }
  }
  const amount = computeDiscountAmount(phase, listPriceIdr)
  const subtotalIdr = Math.max(0, listPriceIdr - amount)
  return {
    listPriceIdr,
    autoDiscountId: phase.id,
    autoDiscountIdr: amount,
    autoDiscountName: phase.name,
    autoDiscountNameEn: phase.nameEn,
    autoDiscountPercent: phase.type === 'percent' ? phase.value : null,
    subtotalIdr,
    promoDiscountId: null,
    promoDiscountIdr: 0,
    promoCode: null,
    totalIdr: subtotalIdr,
  }
}

export function applyPromoToBreakdown(
  breakdown: PriceBreakdown,
  rule: DiscountRule,
): PriceBreakdown {
  const amount = computeDiscountAmount(rule, breakdown.subtotalIdr)
  return {
    ...breakdown,
    promoDiscountId: rule.id,
    promoDiscountIdr: amount,
    promoCode: rule.code,
    totalIdr: Math.max(0, breakdown.subtotalIdr - amount),
  }
}

const CODE_RE = /^[A-Z0-9_-]{3,20}$/

export function validateDiscountInput(input: DiscountInput): 'VALIDATION' | null {
  if (input.kind !== 'phase' && input.kind !== 'code') return 'VALIDATION'
  if (input.name.trim() === '' || input.nameEn.trim() === '') return 'VALIDATION'
  if (input.type !== 'percent' && input.type !== 'fixed') return 'VALIDATION'

  if (input.type === 'percent') {
    if (input.value < 1 || input.value > 100) return 'VALIDATION'
  } else if (input.value < 1) {
    return 'VALIDATION'
  }

  if (input.maxDiscountIdr !== undefined && input.maxDiscountIdr !== null) {
    if (!Number.isInteger(input.maxDiscountIdr) || input.maxDiscountIdr < 0) return 'VALIDATION'
  }

  if (input.minOrderIdr !== undefined) {
    if (!Number.isInteger(input.minOrderIdr) || input.minOrderIdr < 0) return 'VALIDATION'
  }

  if (input.maxUses !== undefined && input.maxUses !== null) {
    if (!Number.isInteger(input.maxUses) || input.maxUses < 1) return 'VALIDATION'
  }

  const startsAt = new Date(input.startsAt)
  if (Number.isNaN(startsAt.getTime())) return 'VALIDATION'
  if (input.endsAt !== undefined && input.endsAt !== null) {
    const endsAt = new Date(input.endsAt)
    if (Number.isNaN(endsAt.getTime())) return 'VALIDATION'
    if (endsAt.getTime() <= startsAt.getTime()) return 'VALIDATION'
  }

  if (input.priority !== undefined && !Number.isInteger(input.priority)) return 'VALIDATION'

  if (input.kind === 'code') {
    if (input.code === undefined || input.code === null) return 'VALIDATION'
    if (!CODE_RE.test(normalizeCode(input.code))) return 'VALIDATION'
  } else if (input.code !== undefined && input.code !== null) {
    return 'VALIDATION'
  }

  if (input.kind === 'phase') {
    if (input.maxUses !== undefined && input.maxUses !== null) return 'VALIDATION'
    if (input.minOrderIdr !== undefined && input.minOrderIdr !== 0) return 'VALIDATION'
  }

  return null
}

export function validateDiscountPatch(
  existing: DiscountRule,
  patch: Partial<DiscountInput>,
): 'IMMUTABLE' | 'VALIDATION' | null {
  if (patch.kind !== undefined && patch.kind !== existing.kind) return 'IMMUTABLE'
  if (patch.code !== undefined && patch.code !== existing.code) return 'IMMUTABLE'
  if (patch.type !== undefined && patch.type !== existing.type) return 'IMMUTABLE'

  const merged: DiscountInput = {
    kind: existing.kind,
    code: existing.code,
    name: patch.name !== undefined ? patch.name : existing.name,
    nameEn: patch.nameEn !== undefined ? patch.nameEn : existing.nameEn,
    type: existing.type,
    value: patch.value !== undefined ? patch.value : existing.value,
    maxDiscountIdr:
      patch.maxDiscountIdr !== undefined ? patch.maxDiscountIdr : existing.maxDiscountIdr,
    minOrderIdr: patch.minOrderIdr !== undefined ? patch.minOrderIdr : existing.minOrderIdr,
    categoryKey: patch.categoryKey !== undefined ? patch.categoryKey : existing.categoryKey,
    startsAt: patch.startsAt !== undefined ? patch.startsAt : existing.startsAt,
    endsAt: patch.endsAt !== undefined ? patch.endsAt : existing.endsAt,
    maxUses: patch.maxUses !== undefined ? patch.maxUses : existing.maxUses,
    active: patch.active !== undefined ? patch.active : existing.active,
    priority: patch.priority !== undefined ? patch.priority : existing.priority,
  }
  return validateDiscountInput(merged)
}
