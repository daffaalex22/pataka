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
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-white/15 bg-black/55 px-4 py-3 shadow-2xl backdrop-blur">
        <p className="text-[11px] uppercase tracking-[0.16em] text-accent">{t('seatView.title')}</p>
        <p className="mt-1 text-sm font-semibold">{seat.id}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-white/75 transition hover:border-white/30 hover:text-white"
          >
            {t('seatView.back')}
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={busy}
            className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t('common.loading') : t('seatView.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
