'use client'

import { useT } from '@/lib/i18n'
import type { Seat } from '@/lib/types'

/** Bottom panel shown while the camera sits at the chosen seat's eye level. */
export function SeatViewPanel({
  seat,
  busy,
  onBack,
  onContinue,
}: {
  seat: Seat
  busy: boolean
  onBack: () => void
  onContinue: () => void
}) {
  const t = useT()

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto max-w-md rounded-sm border border-paper/15 bg-ink/95 px-4 py-3 text-paper">
        <p className="text-xs text-accent">{t('seatView.title')}</p>
        <p className="mt-1 truncate font-display text-2xl uppercase leading-none tracking-[0.02em] text-paper">
          {t('seat.rowLabel')} {seat.row}
          <span aria-hidden className="px-2 text-paper/35">
            ·
          </span>
          {t('seat.numberLabel')} {seat.num}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center rounded-sm border border-paper/20 px-4 text-sm font-medium text-paper/75 transition-colors hover:border-paper/40 hover:text-paper"
          >
            {t('seatView.back')}
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={busy}
            className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center rounded-sm bg-accent px-4 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t('common.loading') : t('seatView.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
