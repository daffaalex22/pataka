'use client'

import { useEffect, useState } from 'react'
import { ChevronRightIcon } from '@/components/ui/icons'
import { adminFetch } from '@/lib/adminApi'
import { useLang, useT } from '@/lib/i18n'
import type { AdminStats } from '@/lib/types'
import { formatIdr } from '@/lib/types'

export function Dashboard({ adminKey, onOpenOrders }: { adminKey: string; onOpenOrders: () => void }) {
  const { lang } = useLang()
  const t = useT()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const load = () =>
      adminFetch<AdminStats>(adminKey, '/api/admin/stats')
        .then((data) => {
          if (!active) return
          setStats(data)
          setError(false)
        })
        .catch(() => active && setError(true))
    load()
    const timer = window.setInterval(load, 10000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [adminKey])

  if (error) return <p role="alert" className="text-sm text-red-300">{t('error.generic')}</p>
  if (!stats) return <p role="status" className="text-sm text-paper/55">{t('common.loading')}</p>

  const cards = [
    { label: t('admin.stats.registrants'), value: String(stats.orders.total) },
    { label: t('admin.stats.sold'), value: String(stats.orders.paid) },
    { label: t('admin.stats.held'), value: String(stats.seats.held) },
    { label: t('admin.stats.checkedIn'), value: String(stats.orders.checkedIn) },
    { label: t('admin.stats.revenue'), value: formatIdr(stats.orders.revenueIdr, lang) },
  ]

  const countColumns = [
    { label: t('status.available'), value: (category: AdminStats['categories'][number]) => category.available, tone: 'text-emerald-300' },
    { label: t('status.held'), value: (category: AdminStats['categories'][number]) => category.held, tone: 'text-amber-300' },
    { label: t('status.sold'), value: (category: AdminStats['categories'][number]) => category.sold, tone: 'text-paper/70' },
    { label: t('admin.settings.quota'), value: (category: AdminStats['categories'][number]) => category.quota, tone: 'text-paper/55' },
  ]

  return (
    <div>
      <dl className="grid grid-cols-2 gap-px border border-paper/10 bg-paper/10 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card, index) => (
          <div
            key={card.label}
            className={`bg-ink p-4 ${index === cards.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <dt className="text-xs leading-snug text-paper/55">{card.label}</dt>
            <dd className="mt-2 break-words text-xl font-semibold tabular-nums tracking-tight">{card.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8" aria-labelledby="inventory-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="inventory-heading" className="text-sm font-medium">
            {t('admin.inventory.title')}
          </h2>
          <button
            type="button"
            onClick={onOpenOrders}
            className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-paper/15 px-3 text-sm font-medium text-paper/80 transition-colors hover:border-paper/30 hover:text-paper"
          >
            {t('admin.tabOrders')}
            <ChevronRightIcon className="size-4" />
          </button>
        </div>

        <div className="mt-3 border-y border-paper/10">
          <div className="hidden grid-cols-[minmax(0,1fr)_repeat(4,4.5rem)] gap-3 border-b border-paper/10 py-2 text-xs text-paper/55 sm:grid">
            <span>{t('seat.categoryLabel')}</span>
            {countColumns.map((column) => (
              <span key={column.label}>{column.label}</span>
            ))}
          </div>

          <ul>
            {stats.categories.map((category) => {
              const name = lang === 'id' ? category.name : category.nameEn
              return (
                <li
                  key={category.id}
                  className="grid gap-2 border-b border-paper/10 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_repeat(4,4.5rem)] sm:items-center sm:gap-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 sm:block">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span
                        aria-hidden
                        className="size-2 shrink-0"
                        style={{ backgroundColor: category.colorHex }}
                      />
                      {name}
                      {!category.salesOpen && (
                        <span className="border border-red-400/35 px-1.5 py-0.5 text-xs font-normal text-red-300">
                          {t('cat.salesClosed')}
                        </span>
                      )}
                    </p>
                    <p className="text-xs tabular-nums text-paper/55 sm:mt-0.5">
                      {formatIdr(category.priceIdr, lang)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums sm:contents">
                    {countColumns.map((column) => (
                      <span key={column.label} className="flex items-baseline gap-1.5 sm:block">
                        <span className="text-xs text-paper/55 sm:hidden">{column.label}</span>
                        <span className={column.tone}>{column.value(category)}</span>
                      </span>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    </div>
  )
}
