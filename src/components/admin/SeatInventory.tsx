'use client'

import { useEffect, useState } from 'react'
import { STATUS_COLORS } from '@/components/ui/Legend'
import { useT } from '@/lib/i18n'
import type { Seat } from '@/lib/types'

export function SeatInventory() {
  const t = useT()
  const [seats, setSeats] = useState<Seat[]>([])

  useEffect(() => {
    const load = () =>
      fetch('/api/seats')
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((data: Seat[]) => setSeats(data))
        .catch(() => {})
    load()
    const timer = window.setInterval(load, 10000)
    return () => window.clearInterval(timer)
  }, [])

  const sections = Array.from(new Set(seats.map((seat) => seat.section))).sort()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">{t('admin.inventory.title')}</h2>
        <div className="flex items-center gap-3 text-xs text-muted">
          {(['available', 'held', 'sold'] as const).map((status) => (
            <span key={status} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS[status] }} />
              {t(`status.${status}`)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {sections.map((section) => {
          const sectionSeats = seats.filter((seat) => seat.section === section)
          const sold = sectionSeats.filter((seat) => seat.status === 'sold').length
          const held = sectionSeats.filter((seat) => seat.status === 'held').length
          return (
            <div key={section} className="panel rounded-2xl p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">{section}</p>
                <p className="text-xs text-muted">
                  {sectionSeats.length - sold - held} {t('status.available').toLowerCase()} · {held} {t('status.held').toLowerCase()} · {sold} {t('status.sold').toLowerCase()}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {sectionSeats.map((seat) => (
                  <span
                    key={seat.id}
                    title={`${seat.id} — ${t(`status.${seat.status}`)}`}
                    className="size-3 rounded-[3px] transition"
                    style={{ backgroundColor: STATUS_COLORS[seat.status], opacity: seat.status === 'sold' ? 0.5 : 1 }}
                  />
                ))}
              </div>
            </div>
          )
        })}
        {seats.length === 0 && <div className="panel h-40 animate-pulse rounded-2xl" />}
      </div>
    </div>
  )
}
