'use client'

import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/adminApi'
import { normalizeCode, type DiscountKind, type DiscountRule } from '@/lib/discounts'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type AdminCategory, type AdminStats, type Lang } from '@/lib/types'

type DiscountStatus = 'active' | 'scheduled' | 'ended' | 'inactive' | 'exhausted'

const STATUS_STYLES: Record<DiscountStatus, string> = {
  active: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
  scheduled: 'border-sky-300/30 bg-sky-300/10 text-sky-200',
  ended: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-300',
  inactive: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  exhausted: 'border-red-300/30 bg-red-300/10 text-red-200',
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

/** Convert an ISO timestamp to a datetime-local value rendered in WIB (UTC+7). */
function toDatetimeLocal(iso: string): string {
  const wib = new Date(new Date(iso).getTime() + WIB_OFFSET_MS)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())}T${pad(wib.getUTCHours())}:${pad(wib.getUTCMinutes())}`
}

/** Convert a datetime-local value (WIB) back into a UTC ISO string. */
function fromDatetimeLocal(value: string): string {
  const [date, time] = value.split('T')
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - WIB_OFFSET_MS).toISOString()
}

function wibLabel(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(iso))
}

function discountStatus(d: DiscountRule, now: Date): DiscountStatus {
  if (!d.active) return 'inactive'
  if (d.maxUses !== null && d.usedCount >= d.maxUses) return 'exhausted'
  if (new Date(d.startsAt).getTime() > now.getTime()) return 'scheduled'
  if (d.endsAt !== null && now.getTime() >= new Date(d.endsAt).getTime()) return 'ended'
  return 'active'
}

const inputClass =
  'mt-1 w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-base outline-none transition focus:border-accent/60 sm:text-sm'

type FormState = {
  name: string
  nameEn: string
  type: 'percent' | 'fixed'
  value: string
  maxDiscount: string
  code: string
  minOrder: string
  maxUses: string
  categoryKey: string
  startsAt: string
  endsAt: string
  priority: string
  active: boolean
}

function emptyForm(): FormState {
  return {
    name: '',
    nameEn: '',
    type: 'percent',
    value: '',
    maxDiscount: '',
    code: '',
    minOrder: '',
    maxUses: '',
    categoryKey: '',
    startsAt: '',
    endsAt: '',
    priority: '0',
    active: true,
  }
}

function DiscountForm({
  adminKey,
  kind,
  initial,
  categories,
  lang,
  t,
  onCancel,
  onSaved,
}: {
  adminKey: string
  kind: DiscountKind
  initial: DiscountRule | null
  categories: AdminCategory[]
  lang: Lang
  t: ReturnType<typeof useT>
  onCancel: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(() => {
    if (!initial) return emptyForm()
    return {
      name: initial.name,
      nameEn: initial.nameEn,
      type: initial.type,
      value: String(initial.value),
      maxDiscount: initial.maxDiscountIdr === null ? '' : String(initial.maxDiscountIdr),
      code: initial.code ?? '',
      minOrder: initial.minOrderIdr === 0 ? '' : String(initial.minOrderIdr),
      maxUses: initial.maxUses === null ? '' : String(initial.maxUses),
      categoryKey: initial.categoryKey ?? '',
      startsAt: toDatetimeLocal(initial.startsAt),
      endsAt: initial.endsAt === null ? '' : toDatetimeLocal(initial.endsAt),
      priority: String(initial.priority),
      active: initial.active,
    }
  })

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const submit = async () => {
    if (!form.name.trim() || !form.nameEn.trim() || !form.startsAt || !form.value) {
      setError(t('admin.discounts.invalid'))
      return
    }
    setBusy(true)
    setError(null)

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      nameEn: form.nameEn.trim(),
      value: Number(form.value),
      categoryKey: form.categoryKey || null,
      startsAt: fromDatetimeLocal(form.startsAt),
      endsAt: form.endsAt ? fromDatetimeLocal(form.endsAt) : null,
      priority: Number(form.priority || 0),
    }
    if (!initial) payload.kind = kind
    if (!initial) payload.type = form.type
    if (form.type === 'percent') payload.maxDiscountIdr = form.maxDiscount ? Number(form.maxDiscount) : null
    if (kind === 'code') {
      if (!initial) payload.code = normalizeCode(form.code)
      payload.minOrderIdr = Number(form.minOrder || 0)
      payload.maxUses = form.maxUses ? Number(form.maxUses) : null
    }

    try {
      if (initial) {
        await adminFetch(adminKey, `/api/admin/discounts/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      } else {
        await adminFetch(adminKey, '/api/admin/discounts', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      onSaved()
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      if (code === 'CODE_TAKEN' || code === 'CATEGORY_NOT_FOUND' || code === 'VALIDATION') {
        setError(`${t('admin.discounts.invalid')} (${code})`)
      } else {
        setError(t('error.generic'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel mt-3 grid gap-3 rounded-2xl p-4 sm:grid-cols-2">
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.discounts.name')}</span>
        <input value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputClass} />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.discounts.nameEn')}</span>
        <input value={form.nameEn} onChange={(e) => set({ nameEn: e.target.value })} className={inputClass} />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.discounts.type')}</span>
        <select
          value={form.type}
          disabled={initial !== null}
          onChange={(e) => set({ type: e.target.value as 'percent' | 'fixed' })}
          className={`${inputClass} disabled:opacity-50`}
        >
          <option value="percent">{t('admin.discounts.percent')}</option>
          <option value="fixed">{t('admin.discounts.fixed')}</option>
        </select>
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.discounts.value')}</span>
        <input
          type="number"
          min={1}
          max={form.type === 'percent' ? 100 : undefined}
          value={form.value}
          onChange={(e) => set({ value: e.target.value })}
          className={inputClass}
        />
      </label>
      {form.type === 'percent' && (
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.discounts.maxDiscount')}</span>
          <input
            type="number"
            min={0}
            step={50000}
            value={form.maxDiscount}
            onChange={(e) => set({ maxDiscount: e.target.value })}
            className={inputClass}
          />
        </label>
      )}
      {kind === 'code' && !initial && (
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.discounts.code')}</span>
          <input value={form.code} onChange={(e) => set({ code: e.target.value })} className={inputClass} />
        </label>
      )}
      {kind === 'code' && (
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.discounts.minOrder')}</span>
          <input
            type="number"
            min={0}
            step={50000}
            value={form.minOrder}
            onChange={(e) => set({ minOrder: e.target.value })}
            className={inputClass}
          />
        </label>
      )}
      {kind === 'code' && (
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.discounts.maxUses')}</span>
          <input
            type="number"
            min={1}
            value={form.maxUses}
            onChange={(e) => set({ maxUses: e.target.value })}
            className={inputClass}
          />
        </label>
      )}
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.discounts.category')}</span>
        <select value={form.categoryKey} onChange={(e) => set({ categoryKey: e.target.value })} className={inputClass}>
          <option value="">{t('admin.discounts.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.key} value={c.key}>
              {lang === 'id' ? c.name : c.nameEn}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.discounts.priority')}</span>
        <input
          type="number"
          value={form.priority}
          onChange={(e) => set({ priority: e.target.value })}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.discounts.startsAt')}</span>
        <input type="datetime-local" value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} className={inputClass} />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.discounts.endsAt')}</span>
        <input type="datetime-local" value={form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} className={inputClass} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        {!initial && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set({ active: e.target.checked })}
              className="size-4 accent-[#f5c542]"
            />
            {t('admin.discounts.active')}
          </label>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-line px-3 py-2 text-xs font-medium text-muted transition hover:border-white/30 hover:text-foreground"
          >
            {t('admin.discounts.cancel')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? t('common.loading') : t('admin.discounts.save')}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-300 sm:col-span-2">{error}</p>}
    </div>
  )
}

export function Discounts({ adminKey }: { adminKey: string }) {
  const { lang } = useLang()
  const t = useT()
  const [rules, setRules] = useState<DiscountRule[] | null>(null)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [creating, setCreating] = useState<DiscountKind | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () =>
    adminFetch<DiscountRule[]>(adminKey, '/api/admin/discounts')
      .then(setRules)
      .catch(() => setError(t('error.generic')))

  useEffect(() => {
    load()
    adminFetch<AdminStats>(adminKey, '/api/admin/stats')
      .then((stats) => setCategories(stats.categories))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey])

  const now = new Date()

  const statusLabel: Record<DiscountStatus, string> = {
    active: t('admin.discounts.statusActive'),
    scheduled: t('admin.discounts.statusScheduled'),
    ended: t('admin.discounts.statusEnded'),
    inactive: t('admin.discounts.statusInactive'),
    exhausted: t('admin.discounts.statusExhausted'),
  }

  const categoryLabel = (key: string | null) => {
    if (key === null) return t('admin.discounts.allCategories')
    const category = categories.find((c) => c.key === key)
    return category ? (lang === 'id' ? category.name : category.nameEn) : key
  }

  const valueLabel = (d: DiscountRule) => (d.type === 'percent' ? `${d.value}%` : formatIdr(d.value, lang))

  const toggleActive = async (d: DiscountRule) => {
    setBusyId(d.id)
    setError(null)
    try {
      await adminFetch(adminKey, `/api/admin/discounts/${d.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !d.active }),
      })
      await load()
    } catch {
      setError(t('error.generic'))
    } finally {
      setBusyId(null)
    }
  }

  const handleSaved = () => {
    setCreating(null)
    setEditingId(null)
    load()
  }

  if (rules === null) return <div className="panel h-48 animate-pulse rounded-2xl" />

  const phases = rules.filter((d) => d.kind === 'phase')
  const codes = rules.filter((d) => d.kind === 'code')

  const renderSection = (kind: DiscountKind, heading: string, items: DiscountRule[]) => (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">{heading}</h3>
        <button
          type="button"
          onClick={() => setCreating(creating === kind ? null : kind)}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-white/30 hover:text-foreground"
        >
          {t('admin.discounts.create')}
        </button>
      </div>

      {creating === kind && (
        <DiscountForm
          adminKey={adminKey}
          kind={kind}
          initial={null}
          categories={categories}
          lang={lang}
          t={t}
          onCancel={() => setCreating(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="mt-3 space-y-2">
        {items.length === 0 && creating !== kind && (
          <p className="py-8 text-center text-sm text-muted">{t('admin.discounts.empty')}</p>
        )}
        {items.map((d) => {
          const status = discountStatus(d, now)
          return (
            <div key={d.id} className="panel rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <span>{lang === 'id' ? d.name : d.nameEn}</span>
                    {d.kind === 'code' && d.code && <span className="font-mono text-xs text-muted">{d.code}</span>}
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLES[status]}`}>
                      {statusLabel[status]}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {valueLabel(d)} · {categoryLabel(d.categoryKey)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {wibLabel(d.startsAt, lang)}
                    {d.endsAt !== null ? ` – ${wibLabel(d.endsAt, lang)}` : ''}
                    {d.kind === 'code' && (
                      <span>
                        {' '}
                        · {t('admin.discounts.used')} {d.usedCount}/{d.maxUses ?? t('admin.discounts.unlimited')}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === d.id ? null : d.id)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-white/30 hover:text-foreground"
                  >
                    {t('admin.discounts.edit')}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => toggleActive(d)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                      d.active
                        ? 'bg-red-400/10 text-red-200 hover:bg-red-400/20'
                        : 'bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25'
                    }`}
                  >
                    {d.active ? t('admin.discounts.deactivate') : t('admin.discounts.activate')}
                  </button>
                </div>
              </div>

              {editingId === d.id && (
                <div className="mt-3 border-t border-line pt-3">
                  <DiscountForm
                    adminKey={adminKey}
                    kind={kind}
                    initial={d}
                    categories={categories}
                    lang={lang}
                    t={t}
                    onCancel={() => setEditingId(null)}
                    onSaved={handleSaved}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">{t('admin.discounts.title')}</h2>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      <div className="mt-4 space-y-6">
        {renderSection('phase', t('admin.discounts.phases'), phases)}
        {renderSection('code', t('admin.discounts.codes'), codes)}
      </div>
    </div>
  )
}
