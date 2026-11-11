import type { SqlClient, SqlDb } from '@/lib/db'
import {
  applyPromoToBreakdown,
  normalizeCode,
  priceWithPhase,
  validatePromo,
  type DiscountError,
  type DiscountInput,
  type DiscountKind,
  type DiscountRule,
  type DiscountType,
  type PriceBreakdown,
} from '@/lib/discounts'

export type UpdateDiscountInput = Partial<Omit<DiscountInput, 'kind' | 'code' | 'type'>>
export type DiscountWriteResult = DiscountRule | 'CODE_TAKEN' | 'CATEGORY_NOT_FOUND'

export type ApplyPromoResult =
  | { ok: true; breakdown: PriceBreakdown }
  | { ok: false; error: 'ORDER_NOT_FOUND' | 'ORDER_NOT_EDITABLE' | 'HOLD_EXPIRED' | DiscountError }

type DiscountRow = {
  id: number
  kind: string
  code: string | null
  name: string
  name_en: string
  type: string
  value: number
  max_discount_idr: number | null
  min_order_idr: number
  category_key: string | null
  starts_at: string
  ends_at: string | null
  max_uses: number | null
  used_count: number
  active: boolean
  priority: number
}

function toRule(row: DiscountRow): DiscountRule {
  return {
    id: Number(row.id),
    kind: row.kind as DiscountKind,
    code: row.code,
    name: row.name,
    nameEn: row.name_en,
    type: row.type as DiscountType,
    value: Number(row.value),
    maxDiscountIdr: row.max_discount_idr === null ? null : Number(row.max_discount_idr),
    minOrderIdr: Number(row.min_order_idr),
    categoryKey: row.category_key,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: row.ends_at === null ? null : new Date(row.ends_at).toISOString(),
    maxUses: row.max_uses === null ? null : Number(row.max_uses),
    usedCount: Number(row.used_count),
    active: Boolean(row.active),
    priority: Number(row.priority),
  }
}

async function categoryExists(db: SqlClient, key: string): Promise<boolean> {
  const rows = await db.query<{ key: string }>(
    'SELECT key FROM ticket_categories WHERE key = $1',
    [key],
  )
  return rows.length > 0
}

export async function listDiscounts(db: SqlDb): Promise<DiscountRule[]> {
  const rows = await db.query<DiscountRow>('SELECT * FROM discounts ORDER BY kind, id')
  return rows.map(toRule)
}

export async function getDiscount(db: SqlDb, id: number): Promise<DiscountRule | null> {
  const rows = await db.query<DiscountRow>('SELECT * FROM discounts WHERE id = $1', [id])
  return rows.length > 0 ? toRule(rows[0]) : null
}

export async function createDiscount(db: SqlDb, input: DiscountInput): Promise<DiscountWriteResult> {
  const code = input.kind === 'code' ? normalizeCode(input.code ?? '') : null

  if (input.categoryKey) {
    if (!(await categoryExists(db, input.categoryKey))) return 'CATEGORY_NOT_FOUND'
  }

  const params = [
    input.kind,
    code,
    input.name,
    input.nameEn,
    input.type,
    input.value,
    input.maxDiscountIdr ?? null,
    input.minOrderIdr ?? 0,
    input.categoryKey ?? null,
    input.startsAt,
    input.endsAt ?? null,
    input.maxUses ?? null,
    input.active ?? true,
    input.priority ?? 0,
  ]

  try {
    const rows = await db.query<DiscountRow>(
      `INSERT INTO discounts
         (kind, code, name, name_en, type, value, max_discount_idr, min_order_idr,
          category_key, starts_at, ends_at, max_uses, active, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      params,
    )
    return toRule(rows[0])
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return 'CODE_TAKEN'
    if (code !== null) {
      const rows = await db.query<{ id: number }>(
        'SELECT id FROM discounts WHERE upper(code) = upper($1)',
        [code],
      )
      if (rows.length > 0) return 'CODE_TAKEN'
    }
    throw error
  }
}

export async function updateDiscount(
  db: SqlDb,
  id: number,
  input: UpdateDiscountInput,
): Promise<DiscountWriteResult | null> {
  const rows = await db.query<DiscountRow>('SELECT * FROM discounts WHERE id = $1', [id])
  if (rows.length === 0) return null

  const existing = toRule(rows[0])

  const nextCategoryKey = input.categoryKey !== undefined ? input.categoryKey : existing.categoryKey
  if (input.categoryKey !== undefined && nextCategoryKey !== null) {
    if (!(await categoryExists(db, nextCategoryKey))) return 'CATEGORY_NOT_FOUND'
  }

  const updated = await db.query<DiscountRow>(
    `UPDATE discounts SET
       name = $2,
       name_en = $3,
       value = $4,
       max_discount_idr = $5,
       min_order_idr = $6,
       category_key = $7,
       starts_at = $8,
       ends_at = $9,
       max_uses = $10,
       active = $11,
       priority = $12
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.name ?? existing.name,
      input.nameEn ?? existing.nameEn,
      input.value ?? existing.value,
      input.maxDiscountIdr !== undefined ? input.maxDiscountIdr : existing.maxDiscountIdr,
      input.minOrderIdr ?? existing.minOrderIdr,
      nextCategoryKey,
      input.startsAt ?? existing.startsAt,
      input.endsAt !== undefined ? input.endsAt : existing.endsAt,
      input.maxUses !== undefined ? input.maxUses : existing.maxUses,
      input.active ?? existing.active,
      input.priority ?? existing.priority,
    ],
  )

  return toRule(updated[0])
}

export async function loadActiveDiscounts(db: SqlClient, at: Date): Promise<DiscountRule[]> {
  const rows = await db.query<DiscountRow>(
    `SELECT * FROM discounts
     WHERE active = TRUE
       AND starts_at <= $1::timestamptz
       AND (ends_at IS NULL OR ends_at > $1::timestamptz)
     ORDER BY kind, id`,
    [at.toISOString()],
  )
  return rows.map(toRule)
}

export async function resolvePrice(
  db: SqlClient,
  categoryKey: string,
  listPriceIdr: number,
  at: Date,
): Promise<PriceBreakdown> {
  const rules = await loadActiveDiscounts(db, at)
  return priceWithPhase(listPriceIdr, categoryKey, rules, at)
}

type PendingOrderRow = {
  list_price_idr: number
  auto_discount_id: number | null
  auto_discount_idr: number
  auto_discount_name: string | null
  auto_discount_name_en: string | null
  auto_discount_type: string | null
  auto_discount_value: number | null
  promo_discount_id: number | null
  promo_discount_idr: number
  promo_code: string | null
  total_idr: number
  status: string
  hold_token: string | null
  seat_status: string
  seat_hold_token: string | null
  hold_fresh: boolean
  category_key: string
}

async function loadPendingOrder(tx: SqlClient, orderCode: string): Promise<PendingOrderRow | null> {
  const rows = await tx.query<PendingOrderRow>(
    `SELECT o.list_price_idr, o.auto_discount_id, o.auto_discount_idr,
            o.auto_discount_name, o.auto_discount_name_en,
            o.promo_discount_id, o.promo_discount_idr, o.promo_code, o.total_idr,
            o.status, o.hold_token,
            s.status AS seat_status, s.hold_token AS seat_hold_token,
            (s.hold_expires_at > now()) AS hold_fresh,
            c.key AS category_key,
            d.type AS auto_discount_type, d.value AS auto_discount_value
     FROM orders o
     JOIN seats s ON s.id = o.seat_id
     JOIN ticket_categories c ON c.id = s.category_id
     LEFT JOIN discounts d ON d.id = o.auto_discount_id
     WHERE o.code = $1`,
    [orderCode],
  )
  return rows.length > 0 ? rows[0] : null
}

function baseBreakdown(row: PendingOrderRow): PriceBreakdown {
  const listPriceIdr = Number(row.list_price_idr)
  const autoDiscountIdr = Number(row.auto_discount_idr)
  const subtotalIdr = listPriceIdr - autoDiscountIdr
  return {
    listPriceIdr,
    autoDiscountId: row.auto_discount_id,
    autoDiscountIdr,
    autoDiscountName: row.auto_discount_name,
    autoDiscountNameEn: row.auto_discount_name_en,
    autoDiscountPercent: row.auto_discount_type === 'percent' ? Number(row.auto_discount_value) : null,
    subtotalIdr,
    promoDiscountId: null,
    promoDiscountIdr: 0,
    promoCode: null,
    totalIdr: subtotalIdr,
  }
}

function ownsLiveHold(row: PendingOrderRow): boolean {
  return row.seat_status === 'held' && row.hold_fresh && row.hold_token !== null && row.hold_token === row.seat_hold_token
}

export async function applyPromoToOrder(
  db: SqlDb,
  orderCode: string,
  rawCode: string,
): Promise<ApplyPromoResult> {
  return db.transaction(async (tx) => {
    const order = await loadPendingOrder(tx, orderCode)
    if (order === null) return { ok: false, error: 'ORDER_NOT_FOUND' }
    if (order.status !== 'pending') return { ok: false, error: 'ORDER_NOT_EDITABLE' }
    if (!ownsLiveHold(order)) return { ok: false, error: 'HOLD_EXPIRED' }

    const code = normalizeCode(rawCode)
    const codeRows = await tx.query<DiscountRow>(
      `SELECT * FROM discounts WHERE kind = 'code' AND upper(code) = upper($1)`,
      [code],
    )
    if (codeRows.length === 0) return { ok: false, error: 'CODE_NOT_FOUND' }
    const rule = toRule(codeRows[0])

    const breakdown = baseBreakdown(order)
    const validationError = validatePromo(rule, {
      subtotalIdr: breakdown.subtotalIdr,
      categoryKey: order.category_key,
      at: new Date(),
    })
    if (validationError) return { ok: false, error: validationError }

    const applied = applyPromoToBreakdown(breakdown, rule)
    await tx.query(
      `UPDATE orders
       SET promo_discount_id = $2, promo_code = $3, promo_discount_idr = $4, total_idr = $5
       WHERE code = $1`,
      [orderCode, applied.promoDiscountId, applied.promoCode, applied.promoDiscountIdr, applied.totalIdr],
    )
    return { ok: true, breakdown: applied }
  })
}

export async function clearPromoFromOrder(
  db: SqlDb,
  orderCode: string,
): Promise<ApplyPromoResult> {
  return db.transaction(async (tx) => {
    const order = await loadPendingOrder(tx, orderCode)
    if (order === null) return { ok: false, error: 'ORDER_NOT_FOUND' }
    if (order.status !== 'pending') return { ok: false, error: 'ORDER_NOT_EDITABLE' }
    if (!ownsLiveHold(order)) return { ok: false, error: 'HOLD_EXPIRED' }

    const breakdown = baseBreakdown(order)
    await tx.query(
      `UPDATE orders
       SET promo_discount_id = NULL, promo_code = NULL, promo_discount_idr = 0, total_idr = $2
       WHERE code = $1`,
      [orderCode, breakdown.subtotalIdr],
    )
    return { ok: true, breakdown }
  })
}

/**
 * Count one promo use at payment time. Category and minimum spend were fixed
 * when the code was applied; only active/window/usage are rechecked here.
 * Returns false when the code can no longer be redeemed.
 */
export async function redeemPromoForPayment(
  tx: SqlClient,
  order: { promoDiscountId: number | null },
  opts?: { allowOverLimit?: boolean },
): Promise<boolean> {
  if (order.promoDiscountId === null) return true

  const rows = opts?.allowOverLimit
    ? await tx.query<{ id: number }>(
        'UPDATE discounts SET used_count = used_count + 1 WHERE id = $1 RETURNING id',
        [order.promoDiscountId],
      )
    : await tx.query<{ id: number }>(
        `UPDATE discounts SET used_count = used_count + 1
         WHERE id = $1
           AND active = TRUE
           AND starts_at <= now()
           AND (ends_at IS NULL OR now() < ends_at)
           AND (max_uses IS NULL OR used_count < max_uses)
         RETURNING id`,
        [order.promoDiscountId],
      )
  return rows.length > 0
}

/** Give one promo use back when a paid order is cancelled. */
export async function releasePromoForPaidCancel(
  tx: SqlClient,
  promoDiscountId: number | null,
): Promise<void> {
  if (promoDiscountId === null) return
  await tx.query('UPDATE discounts SET used_count = GREATEST(0, used_count - 1) WHERE id = $1', [
    promoDiscountId,
  ])
}
