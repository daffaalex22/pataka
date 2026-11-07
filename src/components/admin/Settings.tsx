'use client'

import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/adminApi'
import { useLang, useT } from '@/lib/i18n'
import type { AdminStats } from '@/lib/types'

export function Settings({ adminKey }: { adminKey: string }) {
  const { lang } = useLang()
  const t = useT()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [edits, setEdits] = useState<Record<number, { priceIdr: string; quota: string; salesOpen: boolean }>>({})
  const [savedId, setSavedId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () =>
    adminFetch<AdminStats>(adminKey, '/api/admin/stats')
      .then((data) => setStats(data))
      .catch(() => setError(t('error.generic')))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey])

  useEffect(() => {
    if (!stats) return
    const next: typeof edits = {}
    for (const category of stats.categories) {
      next[category.id] = {
        priceIdr: String(category.priceIdr),
        quota: String(category.quota),
        salesOpen: category.salesOpen,
      }
    }
    setEdits(next)
  }, [stats])

  const save = async (id: number) => {
    const edit = edits[id]
    if (!edit) return
    setBusyId(id)
    setError(null)
    try {
      await adminFetch(adminKey, `/api/admin/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          priceIdr: Number(edit.priceIdr),
          quota: Number(edit.quota),
          salesOpen: edit.salesOpen,
        }),
      })
      setSavedId(id)
      window.setTimeout(() => setSavedId(null), 2000)
      await load()
    } catch {
      setError(t('error.generic'))
    } finally {
      setBusyId(null)
    }
  }

  if (!stats) return <div className="panel h-48 animate-pulse rounded-2xl" />

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">{t('admin.settings.title')}</h2>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

      <div className="mt-4 space-y-3">
        {stats.categories.map((category) => {
          const edit = edits[category.id]
          if (!edit) return null
          return (
            <div key={category.id} className="panel grid gap-3 rounded-2xl p-4 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: category.colorHex }} />
                  {lang === 'id' ? category.name : category.nameEn}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {category.sold}/{category.quota} {t('status.sold').toLowerCase()}
                </p>
              </div>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.settings.price')}</span>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={edit.priceIdr}
                  onChange={(event) => setEdits({ ...edits, [category.id]: { ...edit, priceIdr: event.target.value } })}
                  className="mt-1 w-32 rounded-lg border border-line bg-white/5 px-3 py-2 text-base outline-none focus:border-accent/60 sm:text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('admin.settings.quota')}</span>
                <input
                  type="number"
                  min={0}
                  value={edit.quota}
                  onChange={(event) => setEdits({ ...edits, [category.id]: { ...edit, quota: event.target.value } })}
                  className="mt-1 w-24 rounded-lg border border-line bg-white/5 px-3 py-2 text-base outline-none focus:border-accent/60 sm:text-sm"
                />
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={edit.salesOpen}
                  onChange={(event) => setEdits({ ...edits, [category.id]: { ...edit, salesOpen: event.target.checked } })}
                  className="size-4 accent-[#f5c542]"
                />
                {t('admin.settings.salesOpen')}
              </label>
              <button
                type="button"
                disabled={busyId === category.id}
                onClick={() => save(category.id)}
                className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
              >
                {savedId === category.id ? `✓ ${t('admin.settings.saved')}` : t('admin.settings.save')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
