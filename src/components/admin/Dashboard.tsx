'use client'

import { useEffect, useState } from 'react'
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

  if (error) return <p className="text-sm text-red-300">{t('error.generic')}</p>
  if (!stats) return <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="panel h-24 animate-pulse rounded-2xl" />)}</div>

  const cards = [
    { label: t('admin.stats.registrants'), value: String(stats.orders.total) },
    { label: t('admin.stats.sold'), value: String(stats.orders.paid) },
    { label: t('admin.stats.held'), value: String(stats.seats.held) },
    { label: t('admin.stats.checkedIn'), value: String(stats.orders.checkedIn) },
    { label: t('admin.stats.revenue'), value: formatIdr(stats.orders.revenueIdr, lang) },
  ]

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="panel rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{card.label}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">{t('admin.inventory.title')}</h2>
        <button type="button" onClick={onOpenOrders} className="text-xs text-accent hover:underline">
          {t('admin.tabOrders')} →
        </button>
      </div>

      <div className="panel mt-2 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-muted">
              <th className="px-4 py-3 font-medium">{t('admin.settings.title')}</th>
              <th className="px-4 py-3 font-medium">{t('status.available')}</th>
              <th className="px-4 py-3 font-medium">{t('status.held')}</th>
              <th className="px-4 py-3 font-medium">{t('status.sold')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.settings.quota')}</th>
            </tr>
          </thead>
          <tbody>
            {stats.categories.map((category) => (
              <tr key={category.key} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: category.colorHex }} />
                    {lang === 'id' ? category.name : category.nameEn}
                    <span className="text-xs text-muted">{formatIdr(category.priceIdr, lang)}</span>
                    {!category.salesOpen && (
                      <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] text-red-200">{t('cat.salesClosed')}</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-emerald-300">{category.available}</td>
                <td className="px-4 py-3 text-amber-300">{category.held}</td>
                <td className="px-4 py-3 text-muted">{category.sold}</td>
                <td className="px-4 py-3 text-muted">{category.quota}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
