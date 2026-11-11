# Pataka discount engine — design doc (2026-11-11)

## Intent & why

Pataka currently charges one flat price per ticket category. Real concert ticketing needs two pricing behaviours that the prototype does not have:

1. **Time-boxed phases** — Early Bird, Presale, Last Call — applied automatically so the price changes without the visitor doing anything.
2. **Promo codes** — a code the visitor enters at checkout for a campaign, partner, or community discount.

Goal: add a small, server-authoritative discount engine that supports both, keeps the existing 10-minute seat hold and one-seat-per-order model intact, and makes the discount visible everywhere the order appears: checkout, payment, e-ticket, email, organizer orders, CSV, and revenue stats.

## Goals

1. Organizer can create automatic phases: percent or fixed discount, all categories or one category, start/end window, active toggle, priority tie-break.
2. Organizer can create promo codes: percent or fixed, optional discount cap, minimum spend, category scope, validity window, global usage limit, active toggle.
3. A visitor can apply **one** promo code at payment. The best active phase applies automatically. Phase + code stack; the total never goes below zero.
4. All amounts are computed on the server. The client never sends a discount amount.
5. The applied phase and code are snapshotted on the order at creation, so the price is locked for the payment window; later organizer edits do not rewrite existing orders. The seat hold reserves inventory, not price.
6. Promo usage is counted only when payment succeeds. Concurrent payments for the last available use are safe: one wins, the other is rejected cleanly.
7. Admin can see each discount's status and usage, and can deactivate it without deleting history.
8. E-ticket, email, order API, admin table, and transaction CSV show the price breakdown.
9. With no discounts configured, every existing flow and test behaves exactly as today.

## Non-goals

- Per-user / one-per-customer limits. There are no visitor accounts or identities.
- Stacking more than one promo code, bundles, buy-X-get-Y, member/student verification, referral attribution.
- Limited-allocation automatic phases in v1. Phases are time-window based; category quota still caps inventory.
- Seat-level pricing, dynamic pricing, taxes, service fees, real refunds, or payment-gateway changes.
- Editing a promo code's code string, or converting a phase into a code (or vice versa), after creation.
- Rate limiting or brute-force protection for code guessing. Order codes already act as the bearer credential for pending orders.

## Anti-goals

- Trusting a client-calculated discount or total.
- Changing historical order totals or revenue during migration.
- Breaking holds, payment recovery, QR check-in, or the existing admin flows.
- Over-redeeming a limited code under concurrency.
- A rules engine too complex for an organizer or a judge to understand in one sentence.

## Constraints

- Next.js 16 App Router, React 19, Tailwind 4, TypeScript.
- Postgres via Neon in production and PGlite in dev/tests; thin SQL adapter, no ORM, no new dependencies.
- Schema is applied with `CREATE TABLE IF NOT EXISTS` statements. New columns must use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`; `db:reset` must drop the new table in dependency order.
- One seat per order, 10-minute server-side hold, simulated payment.
- Bilingual UI (Indonesian + English) through the existing i18n dictionary; both dictionaries must gain every new key.
- Mobile-first, consistent with existing panel/input/button styles.
- `timestamptz` for all windows. Display dates in WIB (`Asia/Jakarta`).
- Existing 49 tests must stay green. New tests use PGlite like the current service tests.

## Approaches considered

1. **Promo codes only.** Smallest surface, familiar to visitors. Rejected: the organizer explicitly wants automatic Early Bird/phases; without them every phase would need a published code.
2. **Automatic phases only.** Good ticketing behaviour, no code typing. Rejected: misses visitor-entered campaign/partner codes.
3. **Two layers: automatic phase + one promo code (CHOSEN).** Best fit for the request and for real concert ticketing. Moderate schema/service/UI surface, and it demos clearly: phase price first, then a code on top.
4. **Full rules engine** — multiple rules, stacking order, per-user limits, bundles. Rejected: needs accounts/identity, is hard to explain, and is overkill for the prototype.

## Decisions

### Pricing pipeline

For a seat whose category list price is `list`:

1. Pick the best applicable automatic phase and compute `phaseAmount` on `list`.
2. `subtotal = max(0, list - phaseAmount)`.
3. If a valid promo code is applied, compute `promoAmount` on `subtotal`.
4. `total = max(0, subtotal - promoAmount)`.

Rules:

- One phase and one promo code per order. No two codes stack.
- Applying a different code replaces the previous one and recomputes from `subtotal`.
- Percent discounts use `Math.round(base * value / 100)`, then apply `max_discount_idr` if set.
- Fixed discounts use `min(value, base)`. A fixed discount can never make the total negative.
- `min_order_idr` for a code is checked against `subtotal` (after the phase), not the list price.
- Amounts are integer IDR.
- A total of zero is allowed; payment is still simulated and the ticket still gets a QR.

### Phase rules

- Active when `active = true` and `starts_at <= now < ends_at` (`ends_at = null` means open-ended).
- `category_key = null` applies to every category; otherwise only that category key.
- Among applicable phases, pick the one with the largest computed `phaseAmount`. Tie-break: higher `priority`, then lower `id`.
- The chosen phase's id, name, name_en, and amount are snapshotted on the order at creation. Later edits or deactivation do not change pending/paid orders.
- Price lock happens at **order creation** (when the summary is shown), not at seat hold. If a phase starts or ends between choosing a category and submitting the form, the summary shows the authoritative new price before the visitor pays.
- v1 phases have no usage limit. An organizer who needs a hard allocation can shorten the window or rely on category quota.

### Promo code rules

- Codes are normalized with `trim().toUpperCase()` and are unique case-insensitively.
- Validation order and error codes:
  - `CODE_NOT_FOUND` — no matching code.
  - `CODE_INACTIVE` — `active = false`.
  - `CODE_NOT_STARTED` — `now < starts_at`.
  - `CODE_EXPIRED` — `now >= ends_at`.
  - `CODE_CATEGORY` — code is scoped to another category.
  - `CODE_MIN_ORDER` — `subtotal < min_order_idr`.
  - `CODE_EXHAUSTED` — `max_uses` is set and `used_count >= max_uses`.
- A code applies to `subtotal` and is capped like any percent/fixed rule.
- **Usage is counted at successful payment, not when the code is applied.** Pending orders do not reserve a use, so abandoned holds and expired holds do not leak quota. This is a deliberate trade-off: a code can be applied to many pending orders, but only the first `max_uses` payments succeed.
- At payment, the code is revalidated inside the payment transaction with the discount row locked. `used_count` is incremented with a conditional update (`used_count < max_uses`). If no row updates, payment returns `DISCOUNT_UNAVAILABLE`, the seat is not sold, and the order stays pending.
- On that error the client removes the code, refreshes the total, and asks the visitor to pay again. It does not silently charge a different amount.
- Cancelling a **paid** order decrements `used_count` (`GREATEST(0, used_count - 1)`). Cancelling a pending order does nothing because no use was counted.
- Organizer manual confirmation after an expired hold is an explicit override: it bypasses active/window/usage checks, honors the order's snapshotted discount, and increments `used_count` even if that exceeds `max_uses`. Category and minimum spend were fixed at apply time and are not rechecked. Manual confirmation is the organizer taking responsibility.
- No per-user limit. Codes are shareable by design; the global `max_uses` is the control.

### Data model

New table:

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
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discounts_code
  ON discounts (upper(code)) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discounts_active
  ON discounts (kind, active, starts_at, ends_at);
```

Order additions (append to `SCHEMA_STATEMENTS` after the `discounts` table):

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS list_price_idr INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_discount_id INTEGER REFERENCES discounts(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_discount_idr INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_discount_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_discount_name_en TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_discount_id INTEGER REFERENCES discounts(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_discount_idr INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
UPDATE orders SET list_price_idr = total_idr WHERE list_price_idr IS NULL;
```

- `orders.total_idr` remains the final net amount. Revenue stats keep using it.
- `orders.list_price_idr` is the category price at order time; backfilled to `total_idr` for existing rows.
- `promo_code` is the uppercase snapshot shown to humans.
- No hard delete for discounts; deactivate instead, so order references and history stay valid.
- `db:reset` drops `orders` before `discounts`, then `discounts` before `ticket_categories`.

### Server modules and APIs

**Pure logic** — `src/lib/discounts.ts`:

- `computeDiscountAmount(rule, basePrice)`.
- `isDiscountLive(rule, at)`.
- `pickBestPhase(rules, categoryKey, basePrice, at)`.
- `validatePromo(rule, { subtotal, categoryKey, at })` returning an error code or `null`.
- Shared types for `DiscountRule`, `PriceBreakdown`, and error codes.

**Database services** — `src/services/discounts.ts`:

- List/get/create/update discounts for the admin.
- Load active discounts in one query for event/seat pricing.
- `resolvePrice(db, categoryKey, listPrice, at)` → breakdown.
- `applyPromoToOrder(db, orderCode, rawCode)` and `clearPromoFromOrder(db, orderCode)`.
- `redeemPromoForPayment(tx, order, { allowOverLimit })` and `releasePromoForPaidCancel(tx, order)`.

**Public API changes:**

- `GET /api/event`: category gains `listPriceIdr`, `discountAmountIdr`, `discountName`, `discountNameEn`, `discountPercent`. `priceIdr` stays the effective price so existing UI keeps working.
- `GET /api/seats`: same fields per seat.
- `POST /api/orders`: response gains `listPriceIdr`, `autoDiscountIdr`, `autoDiscountName`, `autoDiscountNameEn`, `subtotalIdr`, `promoDiscountIdr`, `promoCode`, `totalIdr`.
- `GET /api/orders/[code]`: same breakdown fields.
- `POST /api/orders/[code]/discount` with `{ code }`: apply/replace a code; returns the updated breakdown.
- `DELETE /api/orders/[code]/discount`: remove the code and restore the subtotal.
- `POST /api/orders/[code]/pay`: new 409 `{ error: 'DISCOUNT_UNAVAILABLE' }`.
- Apply/remove use the order code as the bearer credential, same trust level as the existing public order GET. Admin routes use `isAdmin`.
- Apply/remove are allowed only while the order is `pending` and its hold is live. Not found → 404; non-pending → 409 `ORDER_NOT_EDITABLE`; pending with expired hold → 409 `HOLD_EXPIRED`. Paid and cancelled orders can never be repriced.

**Admin API:**

- `GET /api/admin/discounts` — all discounts with usage.
- `POST /api/admin/discounts` — create.
- `PATCH /api/admin/discounts/[id]` — edit value/window/scope/limit/active/priority/name.
- `kind`, `code`, and `type` are immutable after creation. Switching percent ↔ fixed would change the meaning of `value` and its caps, so create a new discount instead.
- Validation: percent 1–100; fixed ≥ 1; `max_discount_idr ≥ 0`; `min_order_idr ≥ 0`; `max_uses ≥ 1`; `ends_at > starts_at`; code `^[A-Z0-9_-]{3,20}$`; category key must exist; unique code.
- No `DELETE` route in v1.

### Visitor experience

- **Category cards / board / seat details:** if a phase applies, show the list price struck through, the effective price, and a small badge (e.g. “Early Bird −20%”). With no phase, the UI looks exactly as today.
- **Summary:** show list price, phase line (if any), subtotal, promo line (if any), and total.
- **Payment step:** a “Punya kode promo?” input with Apply/Remove. It is a shared component used by both the normal booking flow and the pending-order e-ticket page, so a visitor who returns to `/eticket/[code]` can still apply a code.
- **Applying a code:** inline success badge with the code and amount. Re-applying replaces the previous code. Removing restores the subtotal.
- **Errors:** localized messages for not found, inactive, not started, expired, wrong category, minimum spend, exhausted, order no longer editable, expired hold, and “code became unavailable at payment”. The last one removes the code and refreshes the total before asking the visitor to pay again.
- The promo input is disabled once the hold countdown expires, matching the apply endpoint's live-hold guard.
- **E-ticket and email:** price breakdown lines appear only when there is a discount.
- **No discount:** no extra rows, no visual noise.

### Organizer experience

- New admin tab **Diskon** / **Discounts**, between Settings and Check-in.
- Two sections on one page:
  - **Fase otomatis** — list of phases with name, value, scope, window, status badge (active / scheduled / ended / inactive), edit, deactivate.
  - **Kode promo** — list of codes with code, value, scope, window, `used / max`, status, edit, deactivate.
- Create form fields: name (ID + EN), code (promo only), type (percent/fixed), value, max discount (percent only), minimum spend (promo only), category (all or one), start, end, max uses (promo only), priority (phase only), active.
- Editing never changes `kind` or `code`.
- Dashboard adds “Diskon diberikan” (total discount on paid orders) while “Pendapatan (lunas)” stays net. If layout space is tight, show it as a secondary line under revenue rather than a fifth card.
- Admin orders table shows the code and discount amount; the transaction CSV adds `list_price_idr`, `auto_discount_idr`, `promo_discount_idr`, `discount_code`, `discount_idr` (combined auto + promo), and keeps `total_idr`. `discount_code` is blank for phase-only orders. This keeps `list_price_idr - discount_idr = total_idr` reconcilable.
- `AdminStats.orders` gains `discountIdr`, computed as `sum(auto_discount_idr + promo_discount_idr) FILTER (WHERE status = 'paid')`.

### Seed and demo data

- Base `seed()` stays unchanged: no discounts. This keeps all existing tests and totals identical.
- `seedDemo()` adds discounts idempotently **before** creating demo orders, so demo orders show a breakdown:
  - Phase **Early Bird** — 20% off, all categories, `2026-10-01` to `2026-11-13 23:59 WIB`, active.
  - Phase **Final Call** — 10% off, all categories, `2026-11-14` to `2026-11-15 23:59 WIB`, active.
  - Code **PATKA10** — 10% off, all categories, max 100 uses, valid through `2026-11-15`.
  - Code **HEMAT50** — Rp 50,000 off, minimum spend Rp 500,000, max 50 uses, valid through `2026-11-15`.
  - Code **VIP100** — Rp 100,000 off, VIP category only, max 20 uses, valid through `2026-11-15`.
- Phase seeding checks for an existing phase with the same `kind` + `name`; code seeding relies on the unique code index and `ON CONFLICT DO NOTHING`.
- README gets a short “Demo discounts” note with the three codes and the admin tab.

### Edge cases and invariants

- **No discounts:** list price = effective price = total; API fields are present but discount amounts are zero/null.
- **Existing orders:** migration backfills `list_price_idr = total_idr` and leaves discount columns at zero; historical revenue does not change.
- **Admin changes a category price after an order exists:** the order keeps its snapshot; new orders use the new list price.
- **Phase changes or deactivates after order creation:** pending/paid order keeps its phase snapshot. The hold already locked the price.
- **Code applied, then hold expires:** no use was counted, so nothing to release. Payment returns `HOLD_EXPIRED` as today.
- **Code applied, then organizer deactivates it or it expires:** payment revalidation fails with `DISCOUNT_UNAVAILABLE`; the client removes it and shows the restored total.
- **Code exhausted between apply and pay:** same as above. The last concurrent payment wins; the other is rejected without selling the seat.
- **Visitor removes the code:** order total returns to `list - phase`; no usage bookkeeping.
- **Paid order cancelled:** code use is freed. Pending order cancelled: no change.
- **Fixed discount larger than the base:** capped at the base; total floors at zero.
- **Percent cap:** `max_discount_idr` caps the computed percent amount.
- **Code scope:** category is checked at apply. The seat cannot change afterwards, so payment revalidates active/window/usage only. Admin edits to category/minimum do not rewrite an existing order.
- **Clock:** apply/display use server `now`; payment revalidation uses database `now()` inside the transaction.
- **Transaction safety:** promo increment happens inside the payment transaction, so a failed payment or seat update rolls the count back.

### Tests

New `tests/discounts.test.ts` (PGlite, same helpers as other service tests):

1. Percent and fixed math, rounding, percent cap, fixed cap at base, zero floor.
2. Phase selection: category scope, window boundaries, best amount, priority tie-break, inactive phase ignored.
3. Order creation with an active phase snapshots list price, phase fields, and total.
4. Order creation with no phase is byte-for-byte the old total.
5. Apply valid code: total = list − phase − promo; breakdown correct; code normalized.
6. Apply invalid/expired/not-started/wrong-category/below-minimum/exhausted code returns the right error and leaves the total unchanged.
7. Applying a second code replaces the first; removing restores the subtotal.
8. Payment increments `used_count`; cancelling the paid order decrements it.
9. Last-use protection: two orders use the same code with `max_uses = 1`; the first payment succeeds, the second returns `DISCOUNT_UNAVAILABLE`, and no seat is sold twice. The PGlite helper shares one connection, so this is proved sequentially plus a direct assertion on the conditional `used_count < max_uses` update. True parallel transactions need a different harness; the production guarantee comes from the row lock and conditional UPDATE.
10. Code deactivated or expired after apply: payment returns `DISCOUNT_UNAVAILABLE`.
11. Admin confirm after an expired hold honors the snapshot and increments usage (override).
12. Admin CRUD validation: percent bounds, date order, unique code, immutable kind/code/type, auth.
13. Migration/backfill: pre-existing order rows get `list_price_idr = total_idr` and zero discounts.

Existing suites (`orders`, `quota`, `expire`, `ticketEmail`, etc.) must pass unchanged.

### Rollout

- All work happens on branch `fix/discounts`; `main` is untouched.
- `npm run db:migrate` applies the new table and columns.
- `npm run db:demo` adds the demo discounts and demo orders.
- Verify with `npm test` and `npm run build`.
- No new environment variables or dependencies.

## What is left to the builder

- Exact component layout, spacing, badge colours, and copy tone inside the established design system.
- Whether “Diskon diberikan” is a fifth dashboard card or a line under revenue.
- Exact SQL shapes and query batching for event/seat pricing.
- Which extra discount rows to show in the participants CSV (transaction CSV is specified).
- Test fixture details and helper names.
- Task-by-task breakdown in the implementation plan.
