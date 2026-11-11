'use client'

import { XIcon } from '@/components/ui/icons'
import { Dialog } from '@/components/ui/Dialog'
import { SeatLegend } from '@/components/visitor/SeatLegend'
import { SeatMap2D } from '@/components/visitor/SeatMap2D'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Seat } from '@/lib/types'

export function SeatMapSheet({
  open,
  seats,
  categoryKey,
  selectedId,
  onSelect,
  onApply,
  onClose,
}: {
  open: boolean
  seats: Seat[]
  categoryKey: string | null
  selectedId: string | null
  onSelect: (seat: Seat) => void
  onApply: (seat: Seat) => void
  onClose: () => void
}) {
  const { lang } = useLang()
  const t = useT()
  const draft = seats.find((seat) => seat.id === selectedId) ?? null
  const draftCategory = draft?.categoryKey ?? categoryKey
  const currentCategory = seats.find((seat) => seat.categoryKey === categoryKey) ?? null
  const headerSeat = draft ?? currentCategory
  const headerName = headerSeat
    ? lang === 'id'
      ? headerSeat.categoryName
      : headerSeat.categoryNameEn
    : null
  const draftName = draft
    ? lang === 'id'
      ? draft.categoryName
      : draft.categoryNameEn
    : null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      ariaLabel={t('seat.mapTitle')}
      panelClassName="max-w-3xl"
      plain
    >
      <div className="flex items-start justify-between gap-3 border-b border-paper/15 px-4 py-3">
        <div>
          <h2 className="font-display text-2xl uppercase leading-none tracking-[0.01em] text-paper">
            {t('seat.mapTitle')}
          </h2>
          <p className="mt-1 text-xs text-paper/55">
            {headerSeat
              ? `${headerName} · ${formatIdr(headerSeat.priceIdr, lang)}`
              : t('seat.mapHint')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('seat.closeMap')}
          className="focus-ring grid size-9 shrink-0 place-items-center rounded-sm text-paper/55 transition-colors hover:bg-paper/10 hover:text-paper"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="px-3 pb-3 pt-3">
        <SeatLegend className="mb-2" />
        {open && (
          <SeatMap2D
            seats={seats}
            categoryKey={draftCategory}
            selectedId={selectedId}
            onSelect={onSelect}
            stageLabel={t('seat.stage')}
            showAllCategories
            focusOnMount
          />
        )}
      </div>

      <div className="sticky bottom-0 border-t border-paper/15 bg-ink px-4 py-3">
        {draft ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-paper/55">{t('seat.yourSeat')}</p>
              <p className="mt-0.5 text-sm font-semibold text-paper">
                {t('seat.rowLabel')} {draft.row} · {t('seat.numberLabel')} {draft.num}
              </p>
              <p className="mt-0.5 text-xs text-paper/55">
                {draftName} · {formatIdr(draft.priceIdr, lang)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onApply(draft)}
              className="focus-ring rounded-sm bg-accent px-4 py-3 text-sm font-semibold text-ink transition hover:brightness-110"
            >
              {t('seat.applySeat')}
            </button>
          </div>
        ) : (
          <p className="py-2 text-center text-xs text-paper/55">{t('seat.mapHint')}</p>
        )}
      </div>
    </Dialog>
  )
}
