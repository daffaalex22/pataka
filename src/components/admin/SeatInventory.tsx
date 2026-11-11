'use client'

import { useEffect, useState } from 'react'
import { STATUS_COLORS } from '@/components/ui/Legend'
import { SeatLegend } from '@/components/visitor/SeatLegend'
import { SeatMap2D } from '@/components/visitor/SeatMap2D'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Seat } from '@/lib/types'

const STATUS_TEXT: Record<Seat['status'], string> = {
  available: 'text-emerald-300',
  held: 'text-amber-300',
  sold: 'text-paper/55',
}

export function SeatInventory() {
  const { lang } = useLang()
  const t = useT()
  const [seats, setSeats] = useState<Seat[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
  const selected = seats.find((seat) => seat.id === selectedId) ?? null

  const totals = seats.reduce(
    (accumulator, seat) => {
      accumulator[seat.status] += 1
      return accumulator
    },
    { available: 0, held: 0, sold: 0 },
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm leading-relaxed text-paper/60">{t('admin.inventory.hint')}</p>
        <SeatLegend />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border border-paper/10 px-3 py-2.5 text-xs">
        <span className="text-paper/55">{t('admin.inventory.sections')}</span>
        {sections.map((section) => {
          const sectionSeats = seats.filter((seat) => seat.section === section)
          const sold = sectionSeats.filter((seat) => seat.status === 'sold').length
          const held = sectionSeats.filter((seat) => seat.status === 'held').length
          return (
            <span key={section} className="inline-flex items-baseline gap-1.5 text-paper/55">
              <span className="font-medium text-paper/80">{section}</span>
              <span className="tabular-nums">
                {sectionSeats.length - sold - held}/{sectionSeats.length}
              </span>
            </span>
          )
        })}
        <span className="ml-auto inline-flex items-baseline gap-1.5 text-paper/55">
          <span>{t('admin.inventory.total')}</span>
          <span className="font-semibold tabular-nums text-paper/80">{totals.available + totals.held + totals.sold}</span>
        </span>
      </div>

      {seats.length === 0 ? (
        <p role="status" className="mt-4 border border-paper/10 p-6 text-sm text-paper/55">
          {t('admin.inventory.empty')}
        </p>
      ) : (
        <div className="mx-auto mt-4 w-full max-w-3xl border border-paper/15 p-3 sm:p-4">
          <SeatMap2D
            seats={seats}
            categoryKey={null}
            selectedId={selectedId}
            onSelect={(seat) => setSelectedId(seat.id)}
            stageLabel={t('seat.stage')}
            showAllCategories
            focusOnMount={false}
          />
        </div>
      )}

      {selected && (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border border-paper/15 px-3 py-2.5 text-sm"
        >
          <span className="font-medium">
            {t('seat.rowLabel')} {selected.row} · {t('seat.numberLabel')} {selected.num}
          </span>
          <span className="text-paper/55">
            {lang === 'id' ? selected.categoryName : selected.categoryNameEn}
          </span>
          <span className="tabular-nums text-paper/75">{formatIdr(selected.priceIdr, lang)}</span>
          <span className={`ml-auto inline-flex items-center gap-1.5 text-xs font-medium ${STATUS_TEXT[selected.status]}`}>
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[selected.status] }}
            />
            {t(`status.${selected.status}`)}
          </span>
        </div>
      )}
    </div>
  )
}
