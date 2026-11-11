'use client'

import { useEffect, useRef, useState } from 'react'
import { SeatLegend } from '@/components/visitor/SeatLegend'
import { SeatMapSheet } from '@/components/visitor/SeatMapSheet'
import { VenueMap } from '@/components/visitor/VenueMap'
import { ArrowLeftIcon, ChevronRightIcon } from '@/components/ui/icons'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Seat } from '@/lib/types'

const STATUS_LABELS = {
  available: 'status.available',
  held: 'status.held',
  sold: 'status.sold',
} as const

export function SeatPicker2D({
  seats,
  categoryKey,
  selectedId,
  onSelect,
  stageLabel,
}: {
  seats: Seat[]
  categoryKey: string | null
  selectedId: string | null
  onSelect: (seat: Seat) => void
  stageLabel: string
}) {
  const { lang } = useLang()
  const t = useT()

  const categorySeats = categoryKey ? seats.filter((seat) => seat.categoryKey === categoryKey) : []
  const selectedSeat = seats.find((seat) => seat.id === selectedId) ?? null
  const sections = Array.from(new Set(categorySeats.map((seat) => seat.section))).sort()
  const initialSection =
    selectedSeat && selectedSeat.categoryKey === categoryKey && sections.includes(selectedSeat.section)
      ? selectedSeat.section
      : (sections[0] ?? '')

  const [activeSection, setActiveSection] = useState(initialSection)
  const [rowKey, setRowKey] = useState<string | null>(
    selectedSeat && selectedSeat.categoryKey === categoryKey ? selectedSeat.row : null,
  )
  const [mapOpen, setMapOpen] = useState(false)
  const [draft, setDraft] = useState<Seat | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const rowListRef = useRef<HTMLDivElement>(null)
  const previousRow = useRef<string | null>(null)

  const selectedRow =
    selectedSeat && selectedSeat.categoryKey === categoryKey ? selectedSeat.row : null
  const selectedSection =
    selectedSeat && selectedSeat.categoryKey === categoryKey ? selectedSeat.section : null

  useEffect(() => {
    if (!selectedRow || !selectedSection) return
    setActiveSection(selectedSection)
    setRowKey(selectedRow)
  }, [selectedRow, selectedSection])

  useEffect(() => {
    if (rowKey) {
      const grid = gridRef.current
      const selectedButton = grid?.querySelector<HTMLButtonElement>(`[data-seat-id="${selectedId}"]`)
      const target =
        selectedButton && !selectedButton.disabled
          ? selectedButton
          : grid?.querySelector<HTMLButtonElement>('[data-available="true"]')
      target?.focus()
    } else if (previousRow.current) {
      rowListRef.current
        ?.querySelector<HTMLButtonElement>(`[data-row="${previousRow.current}"]`)
        ?.focus()
    }
    previousRow.current = rowKey
  }, [rowKey, selectedId])

  const currentSection = sections.includes(activeSection) ? activeSection : (sections[0] ?? '')
  const sectionSeats = categorySeats.filter((seat) => seat.section === currentSection)
  const rows = Array.from(new Set(sectionSeats.map((seat) => seat.row))).sort()
  const rowSeats = rowKey
    ? sectionSeats.filter((seat) => seat.row === rowKey).sort((a, b) => a.num - b.num)
    : []
  const categorySeat = categorySeats[0]
  const seatCategories = Array.from(
    new Map(
      seats.map((seat) => [
        seat.categoryKey,
        {
          key: seat.categoryKey,
          name: seat.categoryName,
          nameEn: seat.categoryNameEn,
          colorHex: seat.colorHex,
        },
      ]),
    ).values(),
  )

  if (!categoryKey || !categorySeat) {
    return <p className="mt-4 text-sm text-paper/55">{t('seat.noCategory')}</p>
  }

  const categoryName = lang === 'id' ? categorySeat.categoryName : categorySeat.categoryNameEn
  const sectionLabel = (section: string) =>
    section === 'TRIBL'
      ? t('seat.tribuneLeft')
      : section === 'TRIBR'
        ? t('seat.tribuneRight')
        : section
  const sectionHeading = sections.length > 1 ? sectionLabel(currentSection) : null

  const rowsWithCounts = rows.map((row) => {
    const seatsInRow = sectionSeats.filter((seat) => seat.row === row)
    return {
      row,
      available: seatsInRow.filter((seat) => seat.status === 'available').length,
      total: seatsInRow.length,
    }
  })

  const openMap = () => {
    setDraft(selectedSeat ?? null)
    setMapOpen(true)
  }

  const applyDraft = (seat: Seat) => {
    onSelect(seat)
    setMapOpen(false)
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-paper/50">{t('seat.categoryLabel')}</p>
          <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-paper">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: categorySeat.colorHex }}
            />
            {categoryName}{' '}
            <span className="font-normal text-paper/55">
              · {formatIdr(categorySeat.priceIdr, lang)}
            </span>
          </p>
        </div>
        <SeatLegend />
      </div>

      <div className="relative mt-4">
        <button
          type="button"
          onClick={openMap}
          aria-label={t('seat.openMap')}
          className="focus-ring group block w-full text-left"
        >
          <VenueMap
            categories={seatCategories}
            activeCategoryKey={categoryKey}
            activeSection={currentSection}
            stageLabel={stageLabel}
          />
          <span className="mt-2 flex items-center justify-end gap-1 text-xs font-medium text-paper/60 transition-colors group-hover:text-paper">
            {t('seat.openMap')}
            <ChevronRightIcon className="size-3.5" />
          </span>
        </button>

        <SeatMapSheet
          open={mapOpen}
          seats={seats}
          categoryKey={categoryKey}
          selectedId={draft?.id ?? null}
          onSelect={setDraft}
          onApply={applyDraft}
          onClose={() => setMapOpen(false)}
        />
      </div>

      {sections.length > 1 && (
        <div className="mt-4 flex gap-2">
          {sections.map((section) => (
            <button
              key={section}
              type="button"
              aria-pressed={currentSection === section}
              onClick={() => {
                setActiveSection(section)
                setRowKey(null)
              }}
              className={`focus-ring rounded-sm border px-3 py-2 text-xs font-medium transition-colors ${
                currentSection === section
                  ? 'border-paper/30 bg-paper/10 text-paper'
                  : 'border-paper/15 text-paper/55 hover:text-paper'
              }`}
            >
              {sectionLabel(section)}
            </button>
          ))}
        </div>
      )}

      {!rowKey ? (
        <div ref={rowListRef} className="mt-4">
          <h2 className="text-xs font-medium text-paper/55">{t('seat.chooseRow')}</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {rowsWithCounts.map(({ row, available, total }) => (
              <button
                key={row}
                type="button"
                data-row={row}
                disabled={available === 0}
                onClick={() => setRowKey(row)}
                aria-label={`${t('seat.rowLabel')} ${row}, ${
                  available === 0
                    ? t('cat.soldOut')
                    : `${available} ${t('cat.of')} ${total} ${t('cat.available')}`
                }`}
                className="focus-ring flex items-center justify-between rounded-sm border border-paper/15 px-4 py-3 text-left transition-colors enabled:hover:border-paper/30 enabled:hover:bg-paper/[0.035] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span>
                  <span className="text-sm font-semibold text-paper">
                    {t('seat.rowLabel')} {row}
                  </span>
                  <span className="mt-0.5 block text-xs text-paper/55">
                    {available === 0
                      ? t('cat.soldOut')
                      : `${available} / ${total} ${t('cat.available')}`}
                  </span>
                </span>
                {available > 0 && (
                  <ChevronRightIcon className="size-4 shrink-0 text-paper/35" />
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setRowKey(null)}
              className="focus-ring -my-2 inline-flex items-center gap-1 py-2 text-xs font-medium text-paper/55 transition-colors hover:text-paper"
            >
              <ArrowLeftIcon className="size-3.5" />
              {t('seat.changeRow')}
            </button>
            <h2 className="text-xs font-medium text-paper/55">
              {[sectionHeading, `${t('seat.rowLabel')} ${rowKey}`].filter(Boolean).join(' · ')}
            </h2>
          </div>

          <div
            ref={gridRef}
            role="group"
            aria-label={`${t('seat.rowLabel')} ${rowKey}`}
            className="mt-3 grid grid-cols-5 justify-items-center gap-2 min-[360px]:grid-cols-6 sm:max-w-[512px] sm:grid-cols-10 lg:max-w-[616px] lg:grid-cols-12"
          >
            {rowSeats.map((seat) => {
              const selected = seat.id === selectedId
              const available = seat.status === 'available'
              const statusLabel = t(STATUS_LABELS[seat.status])
              const label = `${t('seat.rowLabel')} ${seat.row}, ${t('seat.numberLabel')} ${
                seat.num
              }, ${categoryName}, ${formatIdr(seat.priceIdr, lang)}, ${statusLabel}`

              return (
                <button
                  key={seat.id}
                  type="button"
                  data-seat-id={seat.id}
                  data-available={available ? 'true' : 'false'}
                  disabled={!available}
                  aria-pressed={selected}
                  aria-label={label}
                  onClick={() => onSelect(seat)}
                  className={`focus-ring grid h-11 w-11 place-items-center rounded-sm border text-sm font-medium tabular-nums transition-colors ${
                    selected
                      ? 'border-accent bg-accent text-ink'
                      : available
                        ? 'border-emerald-400/25 bg-paper/[0.03] text-paper hover:border-emerald-400/50 hover:bg-paper/[0.06]'
                        : seat.status === 'held'
                          ? 'border-amber-300/30 bg-amber-300/10 text-amber-200/80'
                          : 'border-paper/10 text-paper/25 line-through'
                  }`}
                >
                  {seat.num}
                </button>
              )
            })}
          </div>

          <p className="mt-3 text-xs text-paper/55">{t('seat.tapSeat')}</p>
        </div>
      )}
    </div>
  )
}
