import type { SqlClient, SqlDb } from '@/lib/db'
import {
  normalizeCode,
  priceWithPhase,
  type DiscountInput,
  type DiscountKind,
  type DiscountRule,
  type DiscountType,
  type PriceBreakdown,
} from '@/lib/discounts'

export type UpdateDiscountInput = Partial<Omit<DiscountInput, 'kind' | 'code' | 'type'>>
export type DiscountWriteResult = DiscountRule | 'CODE_TAKEN' | 'CATEGORY_NOT_FOUND'

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
