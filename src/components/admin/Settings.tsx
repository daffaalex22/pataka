'use client'

import { useEffect, useState } from 'react'
import { CheckIcon, XIcon } from '@/components/ui/icons'
import { adminFetch } from '@/lib/adminApi'
import { useLang, useT } from '@/lib/i18n'
import type { AdminStats } from '@/lib/types'

const fieldClass =
  'focus-ring min-h-11 w-full rounded-sm border border-paper/15 bg-paper/[0.04] px-3 text-sm text-paper outline-none transition-colors placeholder:text-paper/55 focus:border-accent/70'

function groupDigits(digits: string) {
  if (!digits) return ''
  return new Intl.NumberFormat('id-ID').format(Number(digits))
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

type Draft = { priceIdr?: string; quota?: string; salesOpen?: boolean }

export function Settings({ adminKey }: { adminKey: string }) {
  const { lang } = useLang()
  const t = useT()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
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

  const save = async (category: AdminStats['categories'][number]) => {
    const draft = drafts[category.id] ?? {}
    const priceIdr = draft.priceIdr ?? String(category.priceIdr)
    const quota = draft.quota ?? String(category.quota)
    const salesOpen = draft.salesOpen ?? category.salesOpen
    setBusyId(category.id)
    setError(null)
    try {
      await adminFetch(adminKey, `/api/admin/categories/${category.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          priceIdr: Number(priceIdr || 0),
          quota: Number(quota || 0),
          salesOpen,
        }),
      })
      setSavedId(category.id)
      window.setTimeout(() => setSavedId(null), 2000)
      await load()
      setDrafts((current) => {
        const next = { ...current }
        delete next[category.id]
        return next
      })
    } catch {
      setError(t('error.generic'))
    } finally {
      setBusyId(null)
    }
  }

  if (!stats) return <p role="status" className="text-sm text-paper/55">{t('common.loading')}</p>

  const savedCategory = stats.categories.find((category) => category.id === savedId)
  const savedName = savedCategory ? (lang === 'id' ? savedCategory.name : savedCategory.nameEn) : ''

  return (
    <div>
      <p role="status" aria-live="polite" className="sr-only">
        {savedId ? `${t('admin.settings.saved')} — ${savedName}` : ''}
      </p>

      {error && (
        <p
          role="alert"
          className="mb-3 flex items-start gap-2 border border-red-400/35 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200"
        >
          <XIcon className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="space-y-3">
        {stats.categories.map((category) => {
          const draft = drafts[category.id] ?? {}
          const priceIdr = draft.priceIdr ?? String(category.priceIdr)
          const quota = draft.quota ?? String(category.quota)
          const salesOpen = draft.salesOpen ?? category.salesOpen
          const saved = savedId === category.id
          const busy = busyId === category.id
          return (
            <article key={category.id} className="border border-paper/10 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  <span
                    aria-hidden
                    className="size-2 shrink-0"
                    style={{ backgroundColor: category.colorHex }}
                  />
                  {lang === 'id' ? category.name : category.nameEn}
                </h2>
                <p className="text-xs tabular-nums text-paper/55">
                  {category.sold}/{category.quota} {t('status.sold').toLowerCase()}
                </p>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_8rem_auto_auto] lg:items-end">
                <label className="block">
                  <span className="text-xs font-medium text-paper/65">{t('admin.settings.price')}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={groupDigits(priceIdr)}
                    onChange={(event) => {
                      const next = digitsOnly(event.target.value)
                      setDrafts((current) => ({
                        ...current,
                        [category.id]: { ...current[category.id], priceIdr: next },
                      }))
                    }}
                    className={`${fieldClass} mt-1 font-mono tabular-nums`}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-paper/65">{t('admin.settings.quota')}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={quota}
                    onChange={(event) => {
                      const next = digitsOnly(event.target.value)
                      setDrafts((current) => ({
                        ...current,
                        [category.id]: { ...current[category.id], quota: next },
                      }))
                    }}
                    className={`${fieldClass} mt-1 tabular-nums`}
                  />
                </label>

                <button
                  type="button"
                  role="switch"
                  aria-checked={salesOpen}
                  onClick={() =>
                    setDrafts((current) => ({
                      ...current,
                      [category.id]: { ...current[category.id], salesOpen: !salesOpen },
                    }))
                  }
                  className="focus-ring inline-flex min-h-11 items-center gap-2.5 rounded-sm border border-paper/15 px-3 text-sm text-paper/75 transition-colors hover:border-paper/30 hover:text-paper"
                >
                  <span
                    aria-hidden
                    className={`relative block h-4 w-7 border ${
                      salesOpen ? 'border-accent/70 bg-accent/15' : 'border-paper/25 bg-transparent'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-2.5 ${
                        salesOpen ? 'right-0.5 bg-accent' : 'left-0.5 bg-paper/40'
                      }`}
                    />
                  </span>
                  {t('admin.settings.salesOpen')}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => save(category)}
                  className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saved ? (
                    <>
                      <CheckIcon className="size-4" />
                      {t('admin.settings.saved')}
                    </>
                  ) : busy ? (
                    t('common.loading')
                  ) : (
                    t('admin.settings.save')
                  )}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
