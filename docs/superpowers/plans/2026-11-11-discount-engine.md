# Pataka Discount Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add organizer-configured automatic price phases and visitor-entered promo codes to Pataka, with server-authoritative pricing, safe usage counting, and breakdowns everywhere an order appears.

**Architecture:** A new `discounts` table holds both `phase` and `code` rules. Pure calculation/validation lives in `src/lib/discounts.ts`; DB access lives in `src/services/discounts.ts`. Order creation snapshots the best active phase. Promo codes are applied to a pending order, revalidated and counted at payment, and released only when a paid order is cancelled. Existing no-discount paths are unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Postgres via Neon/PGlite, Vitest, thin SQL adapter (no ORM, no new dependencies).

**Spec:** `docs/superpowers/specs/2026-11-11-discount-engine-design.md`

## Global Constraints

- All work stays on branch `fix/discounts`; `main` is untouched.
- No new npm dependencies.
- Schema uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`; `db:reset` drops new tables in dependency order.
- One phase and one promo code per order; total floors at zero.
- All amounts are computed on the server; the client never sends a discount amount.
- Price locks at **order creation**, not at seat hold.
- Promo usage counts only at successful payment; paid cancellation decrements it.
- Apply/remove promo only on `pending` orders with a live hold.
- `kind`, `code`, and `type` are immutable after creation.
- CSV `discount_idr` is combined auto + promo; separate `auto_discount_idr` and `promo_discount_idr` columns exist.
- Time windows are `timestamptz`; display in WIB (`Asia/Jakarta`).
- Every new UI string goes in both the Indonesian and English dictionaries in `src/lib/i18n.tsx`.
- Existing tests must pass unchanged except where this plan explicitly updates a fixture for new required fields.
- Single quotes, no semicolons, Tailwind utility classes, `@/` imports, `src/services/*` for DB work.

## Review Focus

1. **A discount produces a negative total or a breakdown that does not add up.** Expected: total = list − phase − promo, never below zero. Tests in Tasks 2, 4, and 5.
2. **Payment succeeds with an exhausted or deactivated code.** Expected: payment is rejected with `DISCOUNT_UNAVAILABLE`, the seat is not sold, and the use count is unchanged. Tests in Task 6.
3. **A paid or cancelled order can be repriced by the public promo endpoint.** Expected: 409 `ORDER_NOT_EDITABLE`. Tests in Task 5.
4. **The displayed phase price differs from the charged order total.** Expected: order creation uses the same `priceWithPhase` calculation as the event/seat APIs. Tests in Task 4; manual API check in Task 7.
5. **The no-discount flow regresses.** Expected: list price = effective price = total, and the existing order/QR/email suites stay green. Tests in Task 4 plus the full suite in Task 13.

---

### Task 0: Repository prerequisites

**Files:** none.

**Interfaces:** none.

- [ ] **Step 1: Confirm the branch**

Run: `git branch --show-current`
Expected: `fix/discounts`. If it is not, run `git checkout -b fix/discounts`.

- [ ] **Step 2: Confirm git identity**

Run: `git config user.name` and `git config user.email`.
If either is empty, ask the human partner for the values and set them locally (`git config user.name "..."`, `git config user.email "..."`). Do not invent an identity.

- [ ] **Step 3: Commit the approved design doc if it is still untracked**

Run: `git status --short`.
If `docs/superpowers/specs/2026-11-11-discount-engine-design.md` is untracked, run:

```bash
git add docs/superpowers/specs/2026-11-11-discount-engine-design.md
git commit -m "docs: add discount engine design"
```

- [ ] **Step 4: Commit this plan if it is still untracked**

Run: `git status --short`.
If `docs/superpowers/plans/2026-11-11-discount-engine.md` is untracked, run:

```bash
git add docs/superpowers/plans/2026-11-11-discount-engine.md
git commit -m "docs: add discount engine implementation plan"
```

---

### Task 1: Discount schema and reset

**Files:**
- Modify: `src/lib/schema.ts`
- Modify: `src/lib/cli.ts`
- Test: `tests/discount-schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: table `discounts` and order columns `list_price_idr`, `auto_discount_id`, `auto_discount_idr`, `auto_discount_name`, `auto_discount_name_en`, `promo_discount_id`, `promo_discount_idr`, `promo_code`.

- [ ] **Step 1: Write the failing schema test**

Create `tests/discount-schema.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'

let db: TestDb

beforeEach(async () => {
  db = await createTestDb()
})

afterEach(async () => {
  await db.close()
})

describe('discount schema', () => {
  it('creates the discounts table and order breakdown columns', async () => {
    await migrate(db)

    const [row] = await db.query<{ id: number }>(
      `INSERT INTO discounts (kind, code, name, name_en, type, value)
       VALUES ('code', 'TEST10', 'Test', 'Test', 'percent', 10)
       RETURNING id`,
    )
    expect(row.id).toBeTypeOf('number')

    const orders = await db.query(
      `SELECT list_price_idr, auto_discount_idr, auto_discount_name,
              promo_discount_idr, promo_code
       FROM orders`,
    )
    expect(orders).toEqual([])
  })

  it('can run twice without error', async () => {
    await migrate(db)
    await migrate(db)
  })

  it('backfills list_price_idr for orders that predate the column', async () => {
    await migrate(db)
    await seed(db)
    await db.query(
      `INSERT INTO orders (code, seat_id, name, email, phone, total_idr)
       VALUES ('PTK-OLD', 'VIP-A1', 'Old Buyer', 'old@example.com', '0800000000', 1500000)`,
    )

    await migrate(db)

    const [row] = await db.query<{ list_price_idr: number }>(
      "SELECT list_price_idr FROM orders WHERE code = 'PTK-OLD'",
    )
    expect(row.list_price_idr).toBe(1_500_000)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/discount-schema.test.ts`
Expected: FAIL with `relation "discounts" does not exist`.

- [ ] **Step 3: Add the schema statements**

Append to `SCHEMA_STATEMENTS` in `src/lib/schema.ts`, after the `scans` table:

```sql
CREATE TABLE IF NOT EXISTS discounts (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('phase', 'code')),
  code TEXT,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value INTEGER NOT NULL CHECK (value > 0),
  max_discount_idr INTEGER CHECK (max_discount_idr IS NULL OR max_discount_idr >= 0),
  min_order_idr INTEGER NOT NULL DEFAULT 0 CHECK (min_order_idr >= 0),
  category_key TEXT REFERENCES ticket_categories(key),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((kind = 'code' AND code IS NOT NULL) OR (kind = 'phase' AND code IS NULL)),
  CHECK (type <> 'percent' OR value <= 100),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
)
```

Then:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_discounts_code
  ON discounts (upper(code)) WHERE code IS NOT NULL
```

```sql
CREATE INDEX IF NOT EXISTS idx_discounts_active
  ON discounts (kind, active, starts_at, ends_at)
```

Then the order columns:

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS list_price_idr INTEGER
```

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_discount_id INTEGER REFERENCES discounts(id)
```

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_discount_idr INTEGER NOT NULL DEFAULT 0
```

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_discount_name TEXT
```

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_discount_name_en TEXT
```

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_discount_id INTEGER REFERENCES discounts(id)
```

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_discount_idr INTEGER NOT NULL DEFAULT 0
```

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT
```

```sql
UPDATE orders SET list_price_idr = total_idr WHERE list_price_idr IS NULL
```

In `src/lib/cli.ts`, add the drop **after** `DROP TABLE IF EXISTS orders` and before `DROP TABLE IF EXISTS seats`:

```ts
await db.query('DROP TABLE IF EXISTS discounts')
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/discount-schema.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema.ts src/lib/cli.ts tests/discount-schema.test.ts
git commit -m "feat: add discount schema"
```

---

### Task 2: Pure discount rules

**Files:**
- Create: `src/lib/discounts.ts`
- Test: `tests/discount-lib.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:

```ts
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

export function normalizeCode(raw: string): string
export function computeDiscountAmount(
  rule: Pick<DiscountRule, 'type' | 'value' | 'maxDiscountIdr'>,
  basePrice: number,
): number
export function isDiscountLive(
  rule: Pick<DiscountRule, 'active' | 'startsAt' | 'endsAt'>,
  at: Date,
): boolean
export function pickBestPhase(
  rules: DiscountRule[],
  categoryKey: string,
  basePrice: number,
  at: Date,
): DiscountRule | null
export function validatePromo(
  rule: DiscountRule | null,
  input: { subtotalIdr: number; categoryKey: string; at: Date },
): DiscountError | null
export function priceWithPhase(
  listPriceIdr: number,
  categoryKey: string,
  rules: DiscountRule[],
  at: Date,
): PriceBreakdown
export function applyPromoToBreakdown(breakdown: PriceBreakdown, rule: DiscountRule): PriceBreakdown
export function validateDiscountInput(input: DiscountInput): 'VALIDATION' | null
export function validateDiscountPatch(
  existing: DiscountRule,
  patch: Partial<DiscountInput>,
): 'IMMUTABLE' | 'VALIDATION' | null
```

- [ ] **Step 1: Write the failing pure-logic tests**

Create `tests/discount-lib.test.ts` with a helper and these cases:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/discount-lib.test.ts`
Expected: FAIL with `Cannot find module '../src/lib/discounts'`.

- [ ] **Step 3: Implement `src/lib/discounts.ts`**

Implement the exported types and functions. Use these exact behaviors:

- `normalizeCode(raw)` → `raw.trim().toUpperCase()`.
- `computeDiscountAmount` → percent: `Math.min(Math.round(base * value / 100), maxDiscountIdr ?? Infinity)`; fixed: `Math.min(value, base)`; clamp with `Math.max(0, ...)`; return `0` when `base <= 0`.
- `isDiscountLive` → `rule.active && new Date(rule.startsAt) <= at && (rule.endsAt === null || at < new Date(rule.endsAt))`.
- `pickBestPhase` → filter `kind === 'phase'`, live, and `categoryKey === null || categoryKey === input`; compute amount; sort by amount desc, priority desc, id asc; return first or null.
- `validatePromo` → return errors in the order: not found, inactive, not started, expired, category, min order, exhausted; otherwise null.
- `priceWithPhase` → pick phase; build the exact object shown in the test, including `autoDiscountPercent` only when the chosen phase is percent.
- `applyPromoToBreakdown` → compute on `subtotalIdr`, return a new breakdown with promo fields and `totalIdr = Math.max(0, subtotalIdr - amount)`.
- `validateDiscountInput` → check kind, non-empty names, type, percent 1–100, fixed ≥ 1, `maxDiscountIdr` null/integer ≥ 0, `minOrderIdr` integer ≥ 0, `maxUses` null/integer ≥ 1, valid dates with `endsAt > startsAt`, integer `priority`, and code rules (`code` required for `code`, `null` for `phase`, regex `^[A-Z0-9_-]{3,20}$` after normalization). For phases, also require `maxUses` null and `minOrderIdr` 0. Return `'VALIDATION'` or `null`.
- `validateDiscountPatch(existing, patch)` → if `patch.kind`, `patch.code`, or `patch.type` is present and differs from `existing`, return `'IMMUTABLE'`; otherwise convert `existing` to a `DiscountInput`, merge `patch`, and return `validateDiscountInput(merged)`. Return `null` when valid.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/discount-lib.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/discounts.ts tests/discount-lib.test.ts
git commit -m "feat: add pure discount rules"
```

---

### Task 3: Discount service and admin API

**Files:**
- Create: `src/services/discounts.ts`
- Create: `src/app/api/admin/discounts/route.ts`
- Create: `src/app/api/admin/discounts/[id]/route.ts`
- Test: `tests/discounts-admin.test.ts`

**Interfaces:**
- Consumes: `DiscountRule`, `PriceBreakdown`, `DiscountInput`, `priceWithPhase`, `validateDiscountInput`, `validateDiscountPatch` from `src/lib/discounts.ts`; `SqlClient`, `SqlDb` from `src/lib/db.ts`; `isAdmin`, `unauthorized` from `src/lib/auth.ts`.
- Produces:

```ts
export type UpdateDiscountInput = Partial<Omit<DiscountInput, 'kind' | 'code' | 'type'>>
export type DiscountWriteResult = DiscountRule | 'CODE_TAKEN' | 'CATEGORY_NOT_FOUND'

export async function listDiscounts(db: SqlDb): Promise<DiscountRule[]>
export async function getDiscount(db: SqlDb, id: number): Promise<DiscountRule | null>
export async function createDiscount(db: SqlDb, input: DiscountInput): Promise<DiscountWriteResult>
export async function updateDiscount(
  db: SqlDb,
  id: number,
  input: UpdateDiscountInput,
): Promise<DiscountWriteResult | null>
export async function loadActiveDiscounts(db: SqlClient, at: Date): Promise<DiscountRule[]>
export async function resolvePrice(
  db: SqlClient,
  categoryKey: string,
  listPriceIdr: number,
  at: Date,
): Promise<PriceBreakdown>
```

- [ ] **Step 1: Write the failing service tests**

Create `tests/discounts-admin.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/discounts-admin.test.ts`
Expected: FAIL with `Cannot find module '../src/services/discounts'`.

- [ ] **Step 3: Implement the service**

Create `src/services/discounts.ts`:

- A private `toRule(row)` mapping snake_case DB rows to `DiscountRule`, converting `starts_at`/`ends_at` to ISO strings and numbers with `Number()`.
- `listDiscounts` → `SELECT * FROM discounts ORDER BY kind, id`.
- `getDiscount` → `SELECT * FROM discounts WHERE id = $1`.
- `createDiscount`:
  - Normalize `input.code` with `normalizeCode` when kind is `code`.
  - If `categoryKey` is set, verify `SELECT key FROM ticket_categories WHERE key = $1`; return `'CATEGORY_NOT_FOUND'` if absent.
  - Insert with `RETURNING *`; on unique violation (Postgres code `23505`), return `'CODE_TAKEN'`. Catch by checking `(error as { code?: string }).code`.
- `updateDiscount`:
  - Load existing; return null if absent.
  - Merge `input` over existing; do not touch kind/code/type.
  - If `categoryKey` changes to a non-null value, verify it exists.
  - Update `name`, `name_en`, `value`, `max_discount_idr`, `min_order_idr`, `category_key`, `starts_at`, `ends_at`, `max_uses`, `active`, `priority` with `COALESCE`-style explicit values; return the row.
- `loadActiveDiscounts` → `SELECT * FROM discounts WHERE active = TRUE AND starts_at <= $1::timestamptz AND (ends_at IS NULL OR ends_at > $1::timestamptz) ORDER BY kind, id`, passing `at.toISOString()`.
- `resolvePrice` → load active rules, then `priceWithPhase(listPriceIdr, categoryKey, rules, at)`.

Create the two admin routes using the existing `isAdmin(req)` / `unauthorized()` pattern:

- `GET /api/admin/discounts` → `listDiscounts`.
- `POST /api/admin/discounts` → parse JSON, call `validateDiscountInput`; 400 `VALIDATION` on failure; 400 `CATEGORY_NOT_FOUND` or 409 `CODE_TAKEN` from the service; 201 with the created rule.
- `PATCH /api/admin/discounts/[id]` → load existing with `getDiscount`; 404 if absent; call `validateDiscountPatch(existing, patch)`; 400 `IMMUTABLE` or `VALIDATION` when it returns one; strip `kind`/`code`/`type` from the patch and call `updateDiscount` with the remaining fields; map `CATEGORY_NOT_FOUND` to 400 and `CODE_TAKEN` to 409.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/discounts-admin.test.ts`
Expected: PASS (5 tests).

With the dev server running, also verify auth:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/admin/discounts
curl -s -o /dev/null -w '%{http_code}\n' -H 'x-admin-key: panitia2026' http://localhost:3000/api/admin/discounts
```

Expected: `401` then `200`.

- [ ] **Step 5: Commit**

```bash
git add src/services/discounts.ts src/app/api/admin/discounts tests/discounts-admin.test.ts
git commit -m "feat: add discount service and admin API"
```

---

### Task 4: Create orders with the best active phase

**Files:**
- Modify: `src/services/orders.ts`
- Test: `tests/discounts.test.ts`

**Interfaces:**
- Consumes: `resolvePrice`, `PriceBreakdown` from Tasks 2–3.
- Produces:

```ts
export type CreateOrderResult =
  | ({ orderCode: string } & PriceBreakdown)
  | 'HOLD_EXPIRED'
  | 'SALES_CLOSED'
```

- [ ] **Step 1: Write the failing order-creation tests**

Create `tests/discounts.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, type TestDb } from './helpers/db'
import { migrate } from '../src/lib/migrate'
import { seed } from '../src/lib/seed'
import { holdSeat } from '../src/services/seats'
import { createOrder } from '../src/services/orders'
import { createDiscount } from '../src/services/discounts'

let db: TestDb

beforeEach(async () => {
  db = await createTestDb()
  await migrate(db)
  await seed(db)
})

afterEach(async () => {
  await db.close()
})

async function holdAndOrder(seatId: string) {
  const held = await holdSeat(db, seatId)
  if (typeof held === 'string') throw new Error('hold failed')
  const order = await createOrder(db, {
    holdToken: held.holdToken,
    name: 'Rina Contoh',
    email: 'rina@example.com',
    phone: '081200000001',
  })
  if (typeof order === 'string') throw new Error(order)
  return order
}

const WINDOW = {
  startsAt: '2020-01-01T00:00:00.000Z',
  endsAt: '2030-01-01T00:00:00.000Z',
}

describe('createOrder pricing', () => {
  it('keeps the base price when no discount is configured', async () => {
    const order = await holdAndOrder('VIP-A1')
    expect(order.listPriceIdr).toBe(1_500_000)
    expect(order.autoDiscountIdr).toBe(0)
    expect(order.promoDiscountIdr).toBe(0)
    expect(order.totalIdr).toBe(1_500_000)
  })

  it('snapshots the best active phase on the order', async () => {
    await createDiscount(db, {
      kind: 'phase',
      name: 'Early Bird',
      nameEn: 'Early Bird',
      type: 'percent',
      value: 20,
      ...WINDOW,
    })

    const order = await holdAndOrder('VIP-A2')
    expect(order.listPriceIdr).toBe(1_500_000)
    expect(order.autoDiscountIdr).toBe(300_000)
    expect(order.autoDiscountName).toBe('Early Bird')
    expect(order.autoDiscountPercent).toBe(20)
    expect(order.subtotalIdr).toBe(1_200_000)
    expect(order.totalIdr).toBe(1_200_000)

    const [row] = await db.query<{
      list_price_idr: number
      auto_discount_idr: number
      total_idr: number
    }>('SELECT list_price_idr, auto_discount_idr, total_idr FROM orders WHERE code = $1', [order.orderCode])
    expect(row).toEqual({ list_price_idr: 1_500_000, auto_discount_idr: 300_000, total_idr: 1_200_000 })
  })

  it('returns the same breakdown when the same hold submits twice', async () => {
    const held = await holdSeat(db, 'VIP-A3')
    if (typeof held === 'string') throw new Error('hold failed')
    const input = { holdToken: held.holdToken, name: 'Sari', email: 'sari@example.com', phone: '081200000022' }
    const first = await createOrder(db, input)
    const second = await createOrder(db, input)
    expect(second).toEqual(first)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/discounts.test.ts`
Expected: FAIL because `listPriceIdr` is `undefined`.

- [ ] **Step 3: Implement phase pricing in `createOrder`**

In `src/services/orders.ts`:

- Import `resolvePrice` and `PriceBreakdown`.
- Widen `CreateOrderResult` as above.
- In the transaction, select `c.key AS category_key` alongside `price_idr` and `sales_open`.
- After loading the seat, call `const breakdown = await resolvePrice(tx, seat.category_key, Number(seat.price_idr), new Date())`.
- For the idempotent-existing-order branch, select the stored snapshot columns and build the same `PriceBreakdown` shape (`list_price_idr`, `auto_discount_id`, `auto_discount_idr`, `auto_discount_name`, `auto_discount_name_en`, `promo_discount_id`, `promo_discount_idr`, `promo_code`, `total_idr`; compute `subtotalIdr`). Recover `autoDiscountPercent` by `LEFT JOIN discounts d ON d.id = o.auto_discount_id` and using `d.value` when `d.type = 'percent'`, otherwise `null`.
- Insert `list_price_idr`, `auto_discount_id`, `auto_discount_idr`, `auto_discount_name`, `auto_discount_name_en`, and `total_idr` from the breakdown.
- Return `{ orderCode: code, ...breakdown }`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/discounts.test.ts tests/orders.test.ts`
Expected: PASS. `orders.test.ts` still sees `1500000` for VIP.

- [ ] **Step 5: Commit**

```bash
git add src/services/orders.ts tests/discounts.test.ts
git commit -m "feat: snapshot active phase on order creation"
```

---

### Task 5: Apply and remove promo codes

**Files:**
- Modify: `src/services/discounts.ts`
- Create: `src/app/api/orders/[code]/discount/route.ts`
- Test: `tests/discounts.test.ts` (append)

**Interfaces:**
- Consumes: `validatePromo`, `applyPromoToBreakdown`, `normalizeCode`, `PriceBreakdown`, `DiscountError`.
- Produces:

```ts
export type ApplyPromoResult =
  | { ok: true; breakdown: PriceBreakdown }
  | { ok: false; error: 'ORDER_NOT_FOUND' | 'ORDER_NOT_EDITABLE' | 'HOLD_EXPIRED' | DiscountError }

export async function applyPromoToOrder(
  db: SqlDb,
  orderCode: string,
  rawCode: string,
): Promise<ApplyPromoResult>

export async function clearPromoFromOrder(
  db: SqlDb,
  orderCode: string,
): Promise<ApplyPromoResult>
```

- [ ] **Step 1: Append the failing apply/remove tests**

Add to `tests/discounts.test.ts`. Extend the existing `../src/services/discounts` import at the top of the file with `applyPromoToOrder` and `clearPromoFromOrder`, then append:

```ts
describe('applyPromoToOrder', () => {
  async function seedPhaseAndCode() {
    await createDiscount(db, {
      kind: 'phase',
      name: 'Early Bird',
      nameEn: 'Early Bird',
      type: 'percent',
      value: 20,
      ...WINDOW,
    })
    await createDiscount(db, {
      kind: 'code',
      code: 'PATKA10',
      name: 'Pataka 10',
      nameEn: 'Pataka 10',
      type: 'percent',
      value: 10,
      maxUses: 100,
      ...WINDOW,
    })
  }

  it('stacks a code on the phase subtotal and removes it again', async () => {
    await seedPhaseAndCode()
    const order = await holdAndOrder('VIP-A4')

    const applied = await applyPromoToOrder(db, order.orderCode, ' patka10 ')
    expect(applied.ok).toBe(true)
    if (!applied.ok) throw new Error(applied.error)
    expect(applied.breakdown.promoDiscountIdr).toBe(120_000)
    expect(applied.breakdown.totalIdr).toBe(1_080_000)
    expect(applied.breakdown.promoCode).toBe('PATKA10')

    const cleared = await clearPromoFromOrder(db, order.orderCode)
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) throw new Error(cleared.error)
    expect(cleared.breakdown.promoDiscountIdr).toBe(0)
    expect(cleared.breakdown.totalIdr).toBe(1_200_000)
  })

  it('replaces the previous code and keeps one code per order', async () => {
    await seedPhaseAndCode()
    await createDiscount(db, {
      kind: 'code',
      code: 'HEMAT20',
      name: 'Hemat 20',
      nameEn: 'Hemat 20',
      type: 'fixed',
      value: 200_000,
      ...WINDOW,
    })
    const order = await holdAndOrder('VIP-A8')

    const first = await applyPromoToOrder(db, order.orderCode, 'PATKA10')
    expect(first.ok).toBe(true)
    if (!first.ok) throw new Error(first.error)
    expect(first.breakdown.totalIdr).toBe(1_080_000)

    const second = await applyPromoToOrder(db, order.orderCode, 'HEMAT20')
    expect(second.ok).toBe(true)
    if (!second.ok) throw new Error(second.error)
    expect(second.breakdown.promoCode).toBe('HEMAT20')
    expect(second.breakdown.promoDiscountIdr).toBe(200_000)
    expect(second.breakdown.totalIdr).toBe(1_000_000)

    const cleared = await clearPromoFromOrder(db, order.orderCode)
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) throw new Error(cleared.error)
    expect(cleared.breakdown.totalIdr).toBe(1_200_000)
  })

  it('rejects invalid, inactive, expired, wrong-category, below-minimum, and exhausted codes', async () => {
    const order = await holdAndOrder('VIP-A5')

    const unknown = await applyPromoToOrder(db, order.orderCode, 'NOPE')
    expect(unknown).toEqual({ ok: false, error: 'CODE_NOT_FOUND' })

    await createDiscount(db, {
      kind: 'code', code: 'OFF', name: 'Off', nameEn: 'Off', type: 'fixed', value: 10_000, active: false, ...WINDOW,
    })
    expect(await applyPromoToOrder(db, order.orderCode, 'OFF')).toEqual({ ok: false, error: 'CODE_INACTIVE' })

    await createDiscount(db, {
      kind: 'code', code: 'LATE', name: 'Late', nameEn: 'Late', type: 'fixed', value: 10_000,
      startsAt: '2030-01-01T00:00:00.000Z',
    })
    expect(await applyPromoToOrder(db, order.orderCode, 'LATE')).toEqual({ ok: false, error: 'CODE_NOT_STARTED' })

    await createDiscount(db, {
      kind: 'code', code: 'OLD', name: 'Old', nameEn: 'Old', type: 'fixed', value: 10_000,
      startsAt: '2020-01-01T00:00:00.000Z', endsAt: '2020-02-01T00:00:00.000Z',
    })
    expect(await applyPromoToOrder(db, order.orderCode, 'OLD')).toEqual({ ok: false, error: 'CODE_EXPIRED' })

    await createDiscount(db, {
      kind: 'code', code: 'REGONLY', name: 'Reg', nameEn: 'Reg', type: 'fixed', value: 10_000,
      categoryKey: 'REG', ...WINDOW,
    })
    expect(await applyPromoToOrder(db, order.orderCode, 'REGONLY')).toEqual({ ok: false, error: 'CODE_CATEGORY' })

    await createDiscount(db, {
      kind: 'code', code: 'BIGSPEND', name: 'Big', nameEn: 'Big', type: 'fixed', value: 10_000,
      minOrderIdr: 5_000_000, ...WINDOW,
    })
    expect(await applyPromoToOrder(db, order.orderCode, 'BIGSPEND')).toEqual({ ok: false, error: 'CODE_MIN_ORDER' })

    await createDiscount(db, {
      kind: 'code', code: 'USED', name: 'Used', nameEn: 'Used', type: 'fixed', value: 10_000,
      maxUses: 1, ...WINDOW,
    })
    await db.query("UPDATE discounts SET used_count = 1 WHERE code = 'USED'")
    expect(await applyPromoToOrder(db, order.orderCode, 'USED')).toEqual({ ok: false, error: 'CODE_EXHAUSTED' })
  })

  it('refuses to reprice a paid or cancelled order', async () => {
    await seedPhaseAndCode()
    const order = await holdAndOrder('VIP-A6')
    await db.query("UPDATE orders SET status = 'paid' WHERE code = $1", [order.orderCode])

    expect(await applyPromoToOrder(db, order.orderCode, 'PATKA10')).toEqual({
      ok: false,
      error: 'ORDER_NOT_EDITABLE',
    })
    expect(await clearPromoFromOrder(db, order.orderCode)).toEqual({
      ok: false,
      error: 'ORDER_NOT_EDITABLE',
    })
  })

  it('refuses to reprice an order whose hold has expired', async () => {
    await seedPhaseAndCode()
    const order = await holdAndOrder('VIP-A7')
    await db.query("UPDATE seats SET hold_expires_at = now() - interval '1 minute' WHERE id = 'VIP-A7'")

    expect(await applyPromoToOrder(db, order.orderCode, 'PATKA10')).toEqual({
      ok: false,
      error: 'HOLD_EXPIRED',
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/discounts.test.ts`
Expected: FAIL with `applyPromoToOrder is not a function`.

- [ ] **Step 3: Implement apply/remove and the route**

In `src/services/discounts.ts`:

- Add `ApplyPromoResult`.
- Add a private `loadPendingOrder(tx, orderCode)` that selects the order joined to seat and category, including `list_price_idr`, `auto_discount_*`, `promo_*`, `status`, `hold_token`, `seat_status`, `seat_hold_token`, `hold_fresh` (`s.hold_expires_at > now()`), and `category_key`. Left join `discounts d ON d.id = o.auto_discount_id` to recover `d.type`/`d.value` for `autoDiscountPercent`.
- `applyPromoToOrder` runs in `db.transaction`:
  - Return `ORDER_NOT_FOUND` when the order is absent.
  - Return `ORDER_NOT_EDITABLE` when `status !== 'pending'`.
  - Return `HOLD_EXPIRED` when `seat_status !== 'held'`, tokens differ, or `hold_fresh` is false.
  - Normalize the code and select the matching `kind = 'code'` row with `upper(code) = upper($1)`. If absent, return `CODE_NOT_FOUND`.
  - Build the base breakdown from the order snapshot (promo fields empty).
  - Call `validatePromo(rule, { subtotalIdr: breakdown.subtotalIdr, categoryKey, at: new Date() })`; return the error when non-null.
  - Call `applyPromoToBreakdown`; update `orders` with `promo_discount_id`, `promo_code`, `promo_discount_idr`, `total_idr`; return `{ ok: true, breakdown }`.
- `clearPromoFromOrder` uses the same guards, rebuilds the base breakdown, updates promo fields to null/0 and `total_idr = subtotalIdr`, and returns `{ ok: true, breakdown }`. It is idempotent when no code is applied.

Create `src/app/api/orders/[code]/discount/route.ts`:

- `POST`: parse `{ code }`; require a string of 1–40 chars; call `applyPromoToOrder`.
- `DELETE`: call `clearPromoFromOrder`.
- Success: `Response.json({ ok: true, ...breakdown })`.
- Error mapping: `ORDER_NOT_FOUND` → 404; `ORDER_NOT_EDITABLE` / `HOLD_EXPIRED` → 409; `CODE_NOT_FOUND` → 404; other `CODE_*` → 422.
- No admin auth; the order code is the bearer credential.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/discounts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/discounts.ts src/app/api/orders/[code]/discount/route.ts tests/discounts.test.ts
git commit -m "feat: apply and remove promo codes"
```

---

### Task 6: Payment redemption and cancellation release

**Files:**
- Modify: `src/services/discounts.ts`
- Modify: `src/services/orders.ts`
- Modify: `src/app/api/orders/[code]/pay/route.ts`
- Test: `tests/discounts.test.ts` (append)

**Interfaces:**
- Consumes: `applyPromoToOrder` from Task 5.
- Produces:

```ts
export type PayResult =
  | 'paid'
  | 'HOLD_EXPIRED'
  | 'ORDER_CANCELLED'
  | 'NOT_FOUND'
  | 'DISCOUNT_UNAVAILABLE'

export async function redeemPromoForPayment(
  tx: SqlClient,
  order: { promoDiscountId: number | null },
  opts?: { allowOverLimit?: boolean },
): Promise<boolean>

export async function releasePromoForPaidCancel(
  tx: SqlClient,
  promoDiscountId: number | null,
): Promise<void>
```

- [ ] **Step 1: Append the failing payment tests**

Add to `tests/discounts.test.ts`. Extend the existing `../src/services/orders` import at the top of the file with `cancelOrder`, `confirmPayment`, and `payOrder`, then append:

```ts
async function orderWithCode(seatId: string) {
  await createDiscount(db, {
    kind: 'code', code: 'LIMIT1', name: 'Limit 1', nameEn: 'Limit 1',
    type: 'fixed', value: 100_000, maxUses: 1, ...WINDOW,
  })
  const order = await holdAndOrder(seatId)
  const applied = await applyPromoToOrder(db, order.orderCode, 'LIMIT1')
  if (!applied.ok) throw new Error(applied.error)
  return order
}

describe('promo redemption', () => {
  it('counts a use on payment and releases it when the paid order is cancelled', async () => {
    const order = await orderWithCode('CAT1-F1')
    expect(await payOrder(db, order.orderCode, 'ewallet')).toBe('paid')

    const [used] = await db.query<{ used_count: number }>("SELECT used_count FROM discounts WHERE code = 'LIMIT1'")
    expect(used.used_count).toBe(1)

    expect(await cancelOrder(db, order.orderCode)).toBe(true)
    const [released] = await db.query<{ used_count: number }>("SELECT used_count FROM discounts WHERE code = 'LIMIT1'")
    expect(released.used_count).toBe(0)
  })

  it('rejects payment when the code was deactivated after it was applied', async () => {
    const order = await orderWithCode('CAT1-F2')
    await db.query("UPDATE discounts SET active = false WHERE code = 'LIMIT1'")

    expect(await payOrder(db, order.orderCode, 'ewallet')).toBe('DISCOUNT_UNAVAILABLE')
    const [seat] = await db.query<{ status: string }>("SELECT status FROM seats WHERE id = 'CAT1-F2'")
    expect(seat.status).toBe('held')
    const [used] = await db.query<{ used_count: number }>("SELECT used_count FROM discounts WHERE code = 'LIMIT1'")
    expect(used.used_count).toBe(0)
  })

  it('lets exactly one of two orders use the last remaining use', async () => {
    const first = await orderWithCode('CAT1-F3')
    const second = await comeBackLater('CAT1-F4')

    expect(await payOrder(db, first.orderCode, 'ewallet')).toBe('paid')
    expect(await payOrder(db, second.orderCode, 'ewallet')).toBe('DISCOUNT_UNAVAILABLE')
  })

  it('rejects payment when the code expired after it was applied', async () => {
    const order = await orderWithCode('CAT1-F9')
    await db.query("UPDATE discounts SET ends_at = now() - interval '1 minute' WHERE code = 'LIMIT1'")

    expect(await payOrder(db, order.orderCode, 'ewallet')).toBe('DISCOUNT_UNAVAILABLE')
    const [seat] = await db.query<{ status: string }>("SELECT status FROM seats WHERE id = 'CAT1-F9'")
    expect(seat.status).toBe('held')
  })

  it('rolls back a manual confirmation if the seat is owned by someone else', async () => {
    const order = await orderWithCode('CAT1-F8')
    await db.query("UPDATE seats SET hold_expires_at = now() - interval '1 minute' WHERE id = 'CAT1-F8'")
    const rehold = await holdSeat(db, 'CAT1-F8')
    expect(typeof rehold).toBe('object')

    expect(await confirmPayment(db, order.orderCode)).toBe('HOLD_EXPIRED')
    const [used] = await db.query<{ used_count: number }>("SELECT used_count FROM discounts WHERE code = 'LIMIT1'")
    expect(used.used_count).toBe(0)
  })

  it('lets an organizer confirm a pending order after the hold expired, even past the limit', async () => {
    const first = await orderWithCode('CAT1-F5')
    const second = await comeBackLater('CAT1-F6', 'LIMIT1')

    expect(await payOrder(db, first.orderCode, 'ewallet')).toBe('paid')
    await db.query("UPDATE seats SET hold_expires_at = now() - interval '1 minute' WHERE id = 'CAT1-F6'")

    expect(await confirmPayment(db, second.orderCode)).toBe('paid')
    const [used] = await db.query<{ used_count: number }>("SELECT used_count FROM discounts WHERE code = 'LIMIT1'")
    expect(used.used_count).toBe(2)
  })
})
```

Add the helper next to `holdAndOrder`:

```ts
async function comeBackLater(seatId: string, code = 'LIMIT1') {
  const order = await holdAndOrder(seatId)
  const applied = await applyPromoToOrder(db, order.orderCode, code)
  if (!applied.ok) throw new Error(applied.error)
  return order
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/discounts.test.ts`
Expected: FAIL because `payOrder` does not return `DISCOUNT_UNAVAILABLE` and does not count usage.

- [ ] **Step 3: Implement redemption**

In `src/services/discounts.ts`:

- `redeemPromoForPayment(tx, order, opts)`:
  - If `promoDiscountId === null`, return `true`.
  - Normal: `UPDATE discounts SET used_count = used_count + 1 WHERE id = $1 AND active = TRUE AND starts_at <= now() AND (ends_at IS NULL OR now() < ends_at) AND (max_uses IS NULL OR used_count < max_uses) RETURNING id`.
  - With `allowOverLimit`: `UPDATE discounts SET used_count = used_count + 1 WHERE id = $1 RETURNING id`.
  - Return `rows.length > 0`.
- `releasePromoForPaidCancel(tx, promoDiscountId)`:
  - If not null, `UPDATE discounts SET used_count = GREATEST(0, used_count - 1) WHERE id = $1`.

In `src/services/orders.ts`:

- Extend `PayResult` with `'DISCOUNT_UNAVAILABLE'`.
- `payOrder` selects `o.promo_discount_id` and, after all hold checks but before the sold update, calls `redeemPromoForPayment(tx, { promoDiscountId: order.promo_discount_id })`. Return `'DISCOUNT_UNAVAILABLE'` when false (no mutation has happened yet).
- The sold update after a successful redemption can still lose the seat. Because the transaction adapter commits on a normal return, use a sentinel error: throw a local `HOLD_EXPIRED` marker when the sold update returns no rows, let the transaction roll back the promo increment, and translate the marker to `'HOLD_EXPIRED'` outside `db.transaction`. The same pattern applies to `confirmPayment`.
- `cancelOrder` selects `promo_discount_id`; when cancelling a `paid` order, call `releasePromoForPaidCancel` before marking cancelled. Pending cancellation does not touch usage.
- `confirmPayment` selects `promo_discount_id` and calls `redeemPromoForPayment(tx, { promoDiscountId }, { allowOverLimit: true })`; return `'DISCOUNT_UNAVAILABLE'` if the row is missing. If the subsequent sold update returns no rows, throw the same `HOLD_EXPIRED` marker so the increment rolls back.

In `src/app/api/orders/[code]/pay/route.ts`, map `DISCOUNT_UNAVAILABLE` to `Response.json({ error: 'DISCOUNT_UNAVAILABLE' }, { status: 409 })`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/discounts.test.ts tests/orders.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/discounts.ts src/services/orders.ts src/app/api/orders/[code]/pay/route.ts tests/discounts.test.ts
git commit -m "feat: redeem promo usage at payment"
```

---

### Task 7: Public pricing APIs and shared types

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/app/api/event/route.ts`
- Modify: `src/app/api/seats/route.ts`

**Interfaces:**
- Consumes: `loadActiveDiscounts`, `priceWithPhase` from Tasks 2–3.
- Produces: `Category` and `Seat` gain `listPriceIdr`, `autoDiscountIdr`, `autoDiscountName`, `autoDiscountNameEn`, `autoDiscountPercent`. `priceIdr` remains the effective price.

- [ ] **Step 1: Update the shared types**

In `src/lib/types.ts`, add to both `Category` and `Seat`:

```ts
listPriceIdr: number
autoDiscountIdr: number
autoDiscountName: string | null
autoDiscountNameEn: string | null
autoDiscountPercent: number | null
```

- [ ] **Step 2: Update `GET /api/event`**

After loading categories, load active rules once:

```ts
const now = new Date()
const rules = await loadActiveDiscounts(db, now)
```

For each category, compute `const priced = priceWithPhase(c.price_idr, c.key, rules, now)` and return:

```ts
priceIdr: priced.subtotalIdr,
listPriceIdr: priced.listPriceIdr,
autoDiscountIdr: priced.autoDiscountIdr,
autoDiscountName: priced.autoDiscountName,
autoDiscountNameEn: priced.autoDiscountNameEn,
autoDiscountPercent: priced.autoDiscountPercent,
```

- [ ] **Step 3: Update `GET /api/seats`**

Load active rules once, then for each seat compute `priceWithPhase(s.price_idr, s.category_key, rules, now)` and return the same five fields. Keep the existing `priceIdr` key but set it to `priced.subtotalIdr`.

- [ ] **Step 4: Verify the API shape**

Run the app with a local database (`npm run db:reset`, `npm run db:demo`, `npm run dev`) and run:

```bash
curl -s http://localhost:3000/api/event | head -c 800
curl -s http://localhost:3000/api/seats | head -c 800
```

Expected: each category/seat has `priceIdr`, `listPriceIdr`, `autoDiscountIdr`, `autoDiscountName`, and `autoDiscountPercent`; with no discount they are equal and the discount fields are zero/null.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/app/api/event/route.ts src/app/api/seats/route.ts
git commit -m "feat: expose effective prices from public APIs"
```

---

### Task 8: Show phase prices in the visitor UI

**Files:**
- Modify: `src/components/visitor/CategoryCards.tsx`
- Modify: `src/components/visitor/SeatStep.tsx`
- Modify: `src/components/world/SeatBar.tsx`
- Modify: `src/components/visitor/FormStep.tsx`
- Modify: `src/components/world/BoardDetail.tsx`

**Interfaces:**
- Consumes: the new `Category`/`Seat` fields from Task 7.

- [ ] **Step 1: Update `CategoryCards`**

When `category.autoDiscountIdr > 0`, render the effective price and a struck list price:

```tsx
<p className="mt-3 flex items-baseline gap-2">
  <span className="text-xl font-semibold tracking-tight">{formatIdr(category.priceIdr, lang)}</span>
  <span className="text-xs text-muted line-through">{formatIdr(category.listPriceIdr, lang)}</span>
</p>
<p className="mt-1 text-[11px] text-emerald-300">
  {lang === 'id' ? category.autoDiscountName : category.autoDiscountNameEn} · −{formatIdr(category.autoDiscountIdr, lang)}
</p>
```

When there is no discount, keep the existing single price line.

- [ ] **Step 2: Update the seat detail panels**

In `SeatStep.tsx`, `SeatBar.tsx`, and `FormStep.tsx`, when the selected seat has `autoDiscountIdr > 0`, show the effective `priceIdr` plus the struck `listPriceIdr` and the phase name. Keep the existing single price when there is no discount. Do not change layout structure beyond the price line.

- [ ] **Step 3: Update the event board**

In `BoardDetail.tsx`, show the effective `category.priceIdr`, the struck `category.listPriceIdr`, and the phase name when `autoDiscountIdr > 0`.

- [ ] **Step 4: Verify manually**

Run `npm run db:demo` and `npm run dev`. Open `/`, `/book`, and the board overlay. Expected: Early Bird or Final Call shows the struck list price, the effective price, and the phase name; after the phase window ends, the UI returns to a single price.

- [ ] **Step 5: Commit**

```bash
git add src/components/visitor/CategoryCards.tsx src/components/visitor/SeatStep.tsx src/components/world/SeatBar.tsx src/components/visitor/FormStep.tsx src/components/world/BoardDetail.tsx
git commit -m "feat: show phase prices to visitors"
```

---

### Task 9: Checkout promo field and order breakdown

**Files:**
- Create: `src/components/visitor/PromoCodeField.tsx`
- Modify: `src/lib/store.ts`
- Modify: `src/lib/useBookingFlow.ts`
- Modify: `src/components/visitor/SummaryStep.tsx`
- Modify: `src/components/visitor/PaymentStep.tsx`
- Modify: `src/app/book/page.tsx`
- Modify: `src/components/world/WorldView.tsx`
- Modify: `src/lib/i18n.tsx`

**Interfaces:**
- Consumes: `PriceBreakdown` from `src/lib/discounts.ts`; the apply/remove API from Task 5; the order response breakdown from Task 4.
- Produces: `PromoCodeField` props:

```ts
{
  orderCode: string
  promoCode: string | null
  promoDiscountIdr: number
  disabled?: boolean
  onChanged: (breakdown: PriceBreakdown) => void
}
```

- [ ] **Step 1: Add the checkout i18n keys**

Add to both dictionaries:

```ts
'discount.title': 'Punya kode promo?' / 'Have a promo code?',
'discount.placeholder': 'Masukkan kode' / 'Enter code',
'discount.apply': 'Terapkan' / 'Apply',
'discount.remove': 'Hapus' / 'Remove',
'discount.checking': 'Memeriksa…' / 'Checking…',
'discount.listPrice': 'Harga normal' / 'List price',
'discount.auto': 'Diskon otomatis' / 'Automatic discount',
'discount.promo': 'Diskon kode' / 'Promo discount',
'discount.subtotal': 'Subtotal' / 'Subtotal',
'error.codeNotFound': 'Kode promo tidak ditemukan.' / 'Promo code not found.',
'error.codeInactive': 'Kode promo sudah tidak aktif.' / 'This promo code is inactive.',
'error.codeNotStarted': 'Kode promo belum berlaku.' / 'This promo code is not active yet.',
'error.codeExpired': 'Kode promo sudah kedaluwarsa.' / 'This promo code has expired.',
'error.codeCategory': 'Kode promo tidak berlaku untuk kategori ini.' / 'This code does not apply to this category.',
'error.codeMinOrder': 'Belum mencapai minimum belanja untuk kode ini.' / 'The minimum spend for this code has not been reached.',
'error.codeExhausted': 'Kuota kode promo sudah habis.' / 'This promo code has reached its limit.',
'error.orderNotEditable': 'Pesanan ini tidak bisa diubah lagi.' / 'This order can no longer be changed.',
'error.discountUnavailable': 'Kode promo baru saja tidak tersedia. Total diperbarui — silakan bayar lagi.' / 'The promo code just became unavailable. The total was updated — please pay again.',
```

- [ ] **Step 2: Create `PromoCodeField`**

Create `src/components/visitor/PromoCodeField.tsx`:

- Internal state: `value`, `busy`, `error`.
- Input with `t('discount.placeholder')` and an Apply button.
- On Apply, `POST /api/orders/${encodeURIComponent(orderCode)}/discount` with `{ code: value }`. On success, call `onChanged(body as PriceBreakdown)` and clear the input. On failure, map `body.error` to the `error.code*` / `error.orderNotEditable` keys with a fallback to `error.generic`.
- When `promoCode` is set, show a badge with the code, `−formatIdr(promoDiscountIdr, lang)`, and a Remove button that calls `DELETE` and then `onChanged`.
- Disable input and buttons when `disabled` or `busy`.

- [ ] **Step 3: Add breakdown state to the booking store and flow**

In `src/lib/store.ts`:

- Add `breakdown: PriceBreakdown | null` and `setBreakdown: (breakdown: PriceBreakdown | null) => void` to the state. Import `PriceBreakdown` from `./discounts`.
- Add `breakdown: null` to `initial`; `setBreakdown` sets it; `reset` clears it.

In `src/lib/useBookingFlow.ts`:

- Destructure `breakdown` and `setBreakdown` from the store.
- `handleOrder`: parse `const order = (await res.json()) as { orderCode: string } & PriceBreakdown`; call `setOrder(order.orderCode, order.totalIdr)` and `setBreakdown(order)`.
- `handlePay`: before treating a 409 as an expired hold, parse `const body = await res.json().catch(() => ({}))`. If `body.error === 'DISCOUNT_UNAVAILABLE'`, call `DELETE /api/orders/${orderCode}/discount`, parse the returned breakdown, `setBreakdown(breakdown)`, `setOrder(orderCode, breakdown.totalIdr)`, set the error to `t('error.discountUnavailable')`, and return. If that DELETE fails because the hold is already gone, fall back to the existing hold-expired reset. Otherwise keep the existing hold-expired behavior.
- Return `breakdown` and `setBreakdown` from the hook.

- [ ] **Step 4: Render the breakdown in `SummaryStep` and `PaymentStep`**

`SummaryStep` takes `breakdown: PriceBreakdown`. `PaymentStep` takes `breakdown?: PriceBreakdown`, keeps `totalIdr?: number` as a fallback, and takes `orderCode?: string` plus `onBreakdownChange?: (breakdown: PriceBreakdown) => void`. When `breakdown` is absent (the pending e-ticket page until Task 10), render the old single total line and no promo field; this keeps the intermediate branch compiling.

When a breakdown is present, render a compact breakdown:

```tsx
<div className="flex items-center justify-between gap-4">
  <dt className="text-muted">{t('discount.listPrice')}</dt>
  <dd>{formatIdr(breakdown.listPriceIdr, lang)}</dd>
</div>
{breakdown.autoDiscountIdr > 0 && (
  <div className="flex items-center justify-between gap-4 text-emerald-300">
    <dt>{lang === 'id' ? breakdown.autoDiscountName : breakdown.autoDiscountNameEn}</dt>
    <dd>−{formatIdr(breakdown.autoDiscountIdr, lang)}</dd>
  </div>
)}
{breakdown.promoDiscountIdr > 0 && (
  <div className="flex items-center justify-between gap-4 text-emerald-300">
    <dt>{breakdown.promoCode} · {t('discount.promo')}</dt>
    <dd>−{formatIdr(breakdown.promoDiscountIdr, lang)}</dd>
  </div>
)}
<div className="flex items-center justify-between gap-4 border-t border-line pt-3">
  <dt className="text-muted">{t('summary.total')}</dt>
  <dd className="text-lg font-semibold text-accent">{formatIdr(breakdown.totalIdr, lang)}</dd>
</div>
```

`PaymentStep` additionally receives `orderCode` and `onBreakdownChange`, renders `<PromoCodeField ... disabled={countdown.expired} />` above the pay button, and uses `breakdown.totalIdr` for the large total.

- [ ] **Step 5: Wire the booking page and world view**

In `src/app/book/page.tsx` and `src/components/world/WorldView.tsx`:

- Destructure `breakdown` and `setBreakdown` from `useBookingFlow()`.
- Pass `breakdown` to `SummaryStep`.
- Pass `orderCode`, `breakdown`, and `onBreakdownChange={setBreakdown}` to `PaymentStep`.
- Render the summary/payment steps only when `orderCode && breakdown`; do not pass a zero placeholder.

- [ ] **Step 6: Verify manually**

Run `npm run db:demo` and `npm run dev`:

1. Book a seat, reach payment, enter `PATKA10` → total drops by 10% of the phase subtotal.
2. Enter an invalid code → localized error, total unchanged.
3. Remove the code → total returns to the phase subtotal.
4. Let the hold expire → the promo input is disabled and payment reports the expired hold.
5. Pay with a valid code → success screen.

- [ ] **Step 7: Commit**

```bash
git add src/components/visitor/PromoCodeField.tsx src/lib/store.ts src/lib/useBookingFlow.ts src/components/visitor/SummaryStep.tsx src/components/visitor/PaymentStep.tsx src/app/book/page.tsx src/components/world/WorldView.tsx src/lib/i18n.tsx
git commit -m "feat: add promo code checkout and price breakdown"
```

---

### Task 10: E-ticket and email breakdown

**Files:**
- Modify: `src/services/email.ts`
- Modify: `src/services/ticketEmail.ts`
- Modify: `src/app/api/orders/[code]/route.ts`
- Modify: `src/app/eticket/[code]/ETicketClient.tsx`
- Test: `tests/email.test.ts`
- Test: `tests/ticketEmail.test.ts`

**Interfaces:**
- Consumes: order snapshot columns from Task 4 and payment behavior from Task 6.
- Produces: `TicketEmail` gains `listPriceIdr`, `autoDiscountIdr`, `autoDiscountName`, `promoDiscountIdr`, `promoCode`.

- [ ] **Step 1: Update the email fixture and add failing assertions**

In `tests/email.test.ts`, add to the `ticket` fixture:

```ts
listPriceIdr: 1_500_000,
autoDiscountIdr: 300_000,
autoDiscountName: 'Early Bird',
promoDiscountIdr: 120_000,
promoCode: 'PATKA10',
```

Add a test:

```ts
it('shows the discount breakdown in the email', async () => {
  const calls: { init: RequestInit }[] = []
  const fetchImpl = fetchStub((_url, init) => {
    calls.push({ init })
    return { ok: true, status: 200 } as Response
  })
  await sendTicketEmail(ticket, { apiKey: 'key-123', from: 'tickets@pataka.test', fetchImpl })
  const body = JSON.parse(String(calls[0].init.body)) as { text: string; html: string }
  expect(body.text.replace(/\u00a0/g, ' ')).toContain('Harga: Rp 1.500.000')
  expect(body.text.replace(/\u00a0/g, ' ')).toContain('Early Bird: -Rp 300.000')
  expect(body.text.replace(/\u00a0/g, ' ')).toContain('PATKA10: -Rp 120.000')
  expect(body.html).toContain('Early Bird')
  expect(body.html).toContain('PATKA10')
})
```

In `tests/ticketEmail.test.ts`, after creating and paying a no-discount order, assert:

```ts
expect(loaded?.ticket.listPriceIdr).toBe(price)
expect(loaded?.ticket.autoDiscountIdr).toBe(0)
expect(loaded?.ticket.promoDiscountIdr).toBe(0)
expect(loaded?.ticket.promoCode).toBeNull()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/email.test.ts tests/ticketEmail.test.ts`
Expected: FAIL because `TicketEmail` has no discount fields and the email has no breakdown rows.

- [ ] **Step 3: Implement the email breakdown**

In `src/services/email.ts`:

- Extend `TicketEmail` with the five fields.
- In `buildTicketEmailHtml`, add a list-price row and conditional discount rows before the total row:

```ts
${detailRow('Harga', escapeHtml(formatIdr(ticket.listPriceIdr, 'id')))}
${ticket.autoDiscountIdr > 0 ? detailRow(escapeHtml(ticket.autoDiscountName ?? 'Diskon'), `-${escapeHtml(formatIdr(ticket.autoDiscountIdr, 'id'))}`) : ''}
${ticket.promoDiscountIdr > 0 ? detailRow(escapeHtml(ticket.promoCode ?? 'Kode promo'), `-${escapeHtml(formatIdr(ticket.promoDiscountIdr, 'id'))}`) : ''}
```

Keep the existing total row after them.

- In the text body, add `Harga`, `Early Bird`/phase name, and `PATKA10` lines with `-` and formatted IDR, in the same order.

In `src/services/ticketEmail.ts`:

- Extend `OrderRow` and the query with `o.list_price_idr`, `o.auto_discount_idr`, `o.auto_discount_name`, `o.promo_discount_idr`, `o.promo_code`.
- Map them into the returned `TicketEmail`, falling back `list_price_idr ?? total_idr`.

- [ ] **Step 4: Update the order GET and e-ticket screen**

In `src/app/api/orders/[code]/route.ts`:

- Extend the query with `o.list_price_idr`, `o.auto_discount_id`, `o.auto_discount_idr`, `o.auto_discount_name`, `o.auto_discount_name_en`, `o.promo_discount_id`, `o.promo_discount_idr`, and `o.promo_code`.
- `LEFT JOIN discounts d ON d.id = o.auto_discount_id` and return `autoDiscountPercent` as `d.value` when `d.type = 'percent'`, otherwise `null`.
- Return `listPriceIdr` (fallback `total_idr`), `autoDiscountId`, `autoDiscountIdr`, `autoDiscountName`, `autoDiscountNameEn`, `autoDiscountPercent`, `subtotalIdr`, `promoDiscountId`, `promoDiscountIdr`, `promoCode`, and the unchanged `totalIdr`.

In `src/app/eticket/[code]/ETicketClient.tsx`:

- Extend the `Ticket` type with `listPriceIdr`, `autoDiscountIdr`, `autoDiscountName`, `autoDiscountNameEn`, `autoDiscountPercent`, `promoDiscountId`, `promoDiscountIdr`, `promoCode`, `subtotalIdr`.
- On the paid ticket, show the same breakdown in the detail `<dl>`: list price, phase line (using `autoDiscountName` or `autoDiscountNameEn` by `lang`), promo line, total.
- For the pending view, pass `orderCode`, a `PriceBreakdown` built from the ticket, and `onBreakdownChange` to `PaymentStep`. On change, update the ticket's breakdown fields and `totalIdr`.
- In `payPending`, parse the error body. If `DISCOUNT_UNAVAILABLE`, call `DELETE /api/orders/[code]/discount`, update the ticket from the returned breakdown, set `payError` to `t('error.discountUnavailable')`, and stay on the page. Otherwise keep the existing hold-expired behavior.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/email.test.ts tests/ticketEmail.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/email.ts src/services/ticketEmail.ts src/app/eticket/[code]/ETicketClient.tsx tests/email.test.ts tests/ticketEmail.test.ts
git commit -m "feat: show discounts on e-ticket and email"
```

---

### Task 11: Organizer discount screen

**Files:**
- Create: `src/components/admin/Discounts.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/lib/i18n.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/admin/discounts`, `PATCH /api/admin/discounts/[id]` from Task 3; `DiscountRule` from `src/lib/discounts.ts`; `adminFetch` from `src/lib/adminApi.ts`.

- [ ] **Step 1: Add the admin i18n keys**

Add to both dictionaries:

```ts
'admin.tabDiscounts': 'Diskon' / 'Discounts',
'admin.discounts.title': 'Diskon & kode promo' / 'Discounts & promo codes',
'admin.discounts.phases': 'Fase otomatis' / 'Automatic phases',
'admin.discounts.codes': 'Kode promo' / 'Promo codes',
'admin.discounts.create': 'Tambah diskon' / 'Add discount',
'admin.discounts.save': 'Simpan' / 'Save',
'admin.discounts.cancel': 'Batal' / 'Cancel',
'admin.discounts.deactivate': 'Nonaktifkan' / 'Deactivate',
'admin.discounts.activate': 'Aktifkan' / 'Activate',
'admin.discounts.name': 'Nama (ID)' / 'Name (ID)',
'admin.discounts.nameEn': 'Nama (EN)' / 'Name (EN)',
'admin.discounts.code': 'Kode' / 'Code',
'admin.discounts.type': 'Tipe' / 'Type',
'admin.discounts.percent': 'Persen' / 'Percent',
'admin.discounts.fixed': 'Nominal' / 'Fixed',
'admin.discounts.value': 'Nilai' / 'Value',
'admin.discounts.maxDiscount': 'Maks. diskon (Rp)' / 'Max discount (IDR)',
'admin.discounts.minOrder': 'Min. belanja (Rp)' / 'Min. spend (IDR)',
'admin.discounts.category': 'Kategori' / 'Category',
'admin.discounts.allCategories': 'Semua kategori' / 'All categories',
'admin.discounts.startsAt': 'Mulai' / 'Starts',
'admin.discounts.endsAt': 'Berakhir' / 'Ends',
'admin.discounts.maxUses': 'Maks. pemakaian' / 'Max uses',
'admin.discounts.priority': 'Prioritas' / 'Priority',
'admin.discounts.active': 'Aktif' / 'Active',
'admin.discounts.used': 'Terpakai' / 'Used',
'admin.discounts.unlimited': 'Tanpa batas' / 'Unlimited',
'admin.discounts.empty': 'Belum ada diskon.' / 'No discounts yet.',
'admin.discounts.invalid': 'Periksa kembali isian diskon.' / 'Check the discount fields.',
'admin.discounts.statusActive': 'Aktif' / 'Active',
'admin.discounts.statusScheduled': 'Terjadwal' / 'Scheduled',
'admin.discounts.statusEnded': 'Berakhir' / 'Ended',
'admin.discounts.statusInactive': 'Nonaktif' / 'Inactive',
'admin.discounts.statusExhausted': 'Habis' / 'Exhausted',
```

- [ ] **Step 2: Create the admin component**

Create `src/components/admin/Discounts.tsx`:

- Load `DiscountRule[]` with `adminFetch(adminKey, '/api/admin/discounts')`.
- Render two sections: `phases` (`kind === 'phase'`) and `codes` (`kind === 'code'`).
- Each row shows name, code (codes only), formatted value (`20%` or `Rp 50.000`), category (`allCategories` when null), window (`startsAt`–`endsAt` in WIB), `used / max` for codes, and a status badge computed from `active` + window + `usedCount >= maxUses`.
- A create form with `kind` fixed by the section. Fields from the i18n keys above. `datetime-local` inputs; submit as ISO strings. For percent, show `maxDiscount`; for codes, show `code`, `minOrder`, and `maxUses`.
- Save posts to `/api/admin/discounts`; edit patches `/api/admin/discounts/[id]` with only editable fields. Deactivate/activate patches `{ active: !discount.active }`.
- On `CODE_TAKEN`, `CATEGORY_NOT_FOUND`, or `VALIDATION`, show `t('admin.discounts.invalid')` and the specific error in a small line.
- Keep the component mobile-first: stacked form on small screens, grid on `sm:`.

- [ ] **Step 3: Add the tab**

In `src/app/admin/page.tsx`:

- Extend `type Tab` with `'discounts'`.
- Add `{ key: 'discounts', label: t('admin.tabDiscounts') }` between Settings and Check-in.
- Render `{tab === 'discounts' && <Discounts adminKey={adminKey} />}`.

- [ ] **Step 4: Verify manually**

Run `npm run db:demo` and `npm run dev`, open `/admin` with `panitia2026`:

1. The Diskon tab lists Early Bird, Final Call, PATKA10, HEMAT50, VIP100.
2. Create a 15% phase for REG; it appears in the phases section and applies to REG seats.
3. Deactivate PATKA10; applying it as a visitor returns the inactive error.
4. Create a duplicate code; the form shows the invalid/duplicate message.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/Discounts.tsx src/app/admin/page.tsx src/lib/i18n.tsx
git commit -m "feat: add organizer discount screen"
```

---

### Task 12: Admin stats, order rows, and CSV

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/app/api/admin/stats/route.ts`
- Modify: `src/app/api/admin/orders/route.ts`
- Modify: `src/app/api/admin/export/route.ts`
- Modify: `src/components/admin/Dashboard.tsx`
- Modify: `src/components/admin/OrdersTable.tsx`
- Modify: `src/lib/i18n.tsx`

**Interfaces:**
- Consumes: order snapshot columns from Task 4.
- Produces: `AdminOrder` gains `listPriceIdr`, `autoDiscountIdr`, `autoDiscountName`, `promoDiscountIdr`, `promoCode`; `AdminStats.orders` gains `discountIdr`.

- [ ] **Step 1: Extend the admin types**

In `src/lib/types.ts`:

- `AdminOrder`: add the five fields above.
- `AdminStats.orders`: add `discountIdr: number`.

- [ ] **Step 2: Update the stats query and dashboard**

In `src/app/api/admin/stats/route.ts`, add:

```sql
COALESCE(sum(auto_discount_idr + promo_discount_idr) FILTER (WHERE status = 'paid'), 0)::int AS discount
```

Return `discountIdr: orderStats.discount`.

In `src/components/admin/Dashboard.tsx`, show `t('admin.stats.discount')` with `formatIdr(stats.orders.discountIdr, lang)` as a secondary line under the revenue card or as a fifth card if the existing grid still fits at mobile width. Add `'admin.stats.discount': 'Diskon diberikan' / 'Discounts given'` to both dictionaries.

- [ ] **Step 3: Update admin orders**

In `src/app/api/admin/orders/route.ts`, select `o.list_price_idr`, `o.auto_discount_idr`, `o.auto_discount_name`, `o.promo_discount_idr`, `o.promo_code`, and map them into `AdminOrder` (fallback `listPriceIdr: row.list_price_idr ?? row.total_idr`).

In `src/components/admin/OrdersTable.tsx`, on each order line show `formatIdr(order.totalIdr)` and, when `order.promoCode` or `order.autoDiscountIdr > 0`, a small secondary line: `promoCode` and `−Rp (auto + promo)`.

- [ ] **Step 4: Update the transaction CSV**

In `src/app/api/admin/export/route.ts`:

- Extend the row type/query with the new columns.
- For `type === 'transactions'`, add columns in this order: `list_price_idr`, `auto_discount_idr`, `promo_discount_idr`, `discount_code` (map `promo_code`, blank when null), `discount_idr` (auto + promo), then `total_idr`.
- Leave the participants CSV unchanged.

- [ ] **Step 5: Verify manually**

Run `npm run db:demo`, open `/admin`:

1. Dashboard shows discounts given > 0 on paid demo orders.
2. Orders table shows the phase/promo line where applicable.
3. Download transactions CSV and confirm `list_price_idr - discount_idr = total_idr` for every row.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/app/api/admin/stats/route.ts src/app/api/admin/orders/route.ts src/app/api/admin/export/route.ts src/components/admin/Dashboard.tsx src/components/admin/OrdersTable.tsx src/lib/i18n.tsx
git commit -m "feat: report discounts in admin and CSV"
```

---

### Task 13: Demo discounts, README, and full verification

**Files:**
- Modify: `src/lib/demo.ts`
- Modify: `README.md`
- Test: `tests/discounts-demo.test.ts`

**Interfaces:**
- Consumes: `createDiscount` from Task 3.

- [ ] **Step 1: Write the failing demo-seed test**

Create `tests/discounts-demo.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/discounts-demo.test.ts`
Expected: FAIL with `count` 0.

- [ ] **Step 3: Seed the demo discounts**

In `src/lib/demo.ts`, before the order loop, add idempotent helpers:

```ts
async function ensurePhase(db: SqlDb, input: DiscountInput) {
  const [existing] = await db.query('SELECT id FROM discounts WHERE kind = $1 AND name = $2', [input.kind, input.name])
  if (existing) return
  await createDiscount(db, input)
}

async function ensureCode(db: SqlDb, input: DiscountInput) {
  const [existing] = await db.query('SELECT id FROM discounts WHERE upper(code) = upper($1)', [input.code])
  if (existing) return
  await createDiscount(db, input)
}
```

Seed:

- `Early Bird` — phase, percent 20, all categories, `2026-10-01T00:00:00+07:00` to `2026-11-13T23:59:59+07:00`, active.
- `Final Call` — phase, percent 10, all categories, `2026-11-14T00:00:00+07:00` to `2026-11-15T23:59:59+07:00`, active.
- `PATKA10` — code, percent 10, all categories, max 100, valid `2026-10-01T00:00:00+07:00` to `2026-11-15T23:59:59+07:00`.
- `HEMAT50` — code, fixed 50_000, min order 500_000, max 50, same window.
- `VIP100` — code, fixed 100_000, category `VIP`, max 20, same window.

Use the `nameEn` values `Early Bird`, `Final Call`, `Pataka 10`, `Hemat 50`, `VIP 100`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/discounts-demo.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the README**

In `README.md`, add a short “Demo discounts” section:

- Admin tab **Diskon** creates automatic phases and promo codes.
- Demo codes: `PATKA10` (10% off), `HEMAT50` (Rp 50.000 off, min Rp 500.000), `VIP100` (Rp 100.000 off, VIP only).
- Demo phases: Early Bird 20% and Final Call 10%.
- Note that `npm run db:demo` seeds them and that promo usage counts at payment.

- [ ] **Step 6: Run the full verification**

If `.env.local` is absent, create it with the README values before running the DB scripts:

```bash
DATABASE_URL=pglite://.local-db
ADMIN_KEY=panitia2026
CHECKIN_SECRET=pataka-demo-secret-2026
```

Then run:

```bash
npm test
npm run build
npm run db:reset
npm run db:demo
```

Expected:

- All Vitest suites pass, including the existing 49 tests and the new discount suites.
- `next build` succeeds with no type errors.
- `db:reset` recreates the schema and 446 seats.
- `db:demo` seeds discounts and demo orders without duplicate discounts.

Then run `npm run dev` and walk the full flow once:

1. Home shows an Early Bird price.
2. Book a VIP seat; summary shows the phase breakdown.
3. Apply `PATKA10`; total drops.
4. Pay; e-ticket shows the breakdown and a QR.
5. Admin → Orders shows the code and discount; dashboard shows discounts given.
6. Admin → Check-in scans the QR successfully.

- [ ] **Step 7: Commit**

```bash
git add src/lib/demo.ts README.md tests/discounts-demo.test.ts
git commit -m "feat: seed demo discounts and document them"
```

---

## Self-Review Notes

- Spec coverage: schema (Task 1), pure rules (Task 2), admin/service CRUD (Task 3), order phase snapshot (Task 4), promo apply/remove (Task 5), payment redemption and release (Task 6), public pricing (Task 7), visitor price display (Task 8), checkout promo (Task 9), e-ticket/email (Task 10), organizer screen (Task 11), admin reporting/CSV (Task 12), demo/README/verification (Task 13).
- Review Focus tests are owned: totals/breakdown in Tasks 2/4/5; exhausted/deactivated at payment in Task 6; paid/cancelled guard in Task 5; displayed vs charged price in Task 4 plus Task 7 manual check; no-discount regression in Task 4 and the full suite in Task 13.
- Type consistency: `DiscountRule`, `PriceBreakdown`, `DiscountInput`, `ApplyPromoResult`, `CreateOrderResult`, and `PayResult` are defined once and reused by name in later tasks.
