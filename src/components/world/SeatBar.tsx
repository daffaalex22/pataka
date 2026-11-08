'use client'

import { useCountdown } from '@/components/ui/useCountdown'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Seat } from '@/lib/types'

export function SeatBar({
  seat,
  busy,
  error,
  holdActive,
  holdExpiresAt,
  onPreview,
  onWalkToSeat,
  onHold,
  onResume,
}: {
  seat: Seat | null
  busy: boolean
  error: string | null
  holdActive: boolean
  holdExpiresAt: string | null
  onPreview: () => void
  onWalkToSeat: () => void
  onHold: () => void
  onResume: () => void
}) {
  const { lang } = useLang()
  const t = useT()
  const countdown = useCountdown(holdActive ? holdExpiresAt : null)

  if (!seat && !error) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {error && (
        <div
          role="alert"
          className="pointer-events-auto mx-auto mb-2 max-w-md rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm text-red-200 backdrop-blur"
        >
          {error}
        </div>
      )}

      {seat && (
        <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/55 px-4 py-3 shadow-2xl backdrop-blur">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">{t('seat.yourSeat')}</p>
            <p className="truncate text-sm font-semibold">
              {seat.id} · {lang === 'id' ? seat.categoryName : seat.categoryNameEn}
            </p>
            <p className="text-xs text-white/60">
              {formatIdr(seat.priceIdr, lang)}
              {seat.status !== 'available' && (
                <span className={seat.status === 'held' ? 'ml-2 text-amber-300' : 'ml-2 text-zinc-400'}>
                  · {t(`status.${seat.status}`)}
                </span>
              )}
              {holdActive && (
                <span className="ml-2 text-amber-300">
                  · {t('seat.heldUntil')} {countdown.formatted}
                </span>
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onPreview}
              aria-label={t('seat.preview')}
              title={t('seat.preview')}
              className="grid size-11 place-items-center rounded-full border border-white/15 text-base text-white/75 transition hover:border-accent/50 hover:text-accent"
            >
              👁
            </button>
            <button
              type="button"
              onClick={onWalkToSeat}
              aria-label={t('seat.walkToSeat')}
              title={t('seat.walkToSeat')}
              className="grid size-11 place-items-center rounded-full border border-white/15 text-base text-white/75 transition hover:border-accent/50 hover:text-accent"
            >
              🚶
            </button>
            {holdActive ? (
              <button
                type="button"
                onClick={onResume}
                className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
              >
                {t('seat.resume')} →
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || seat.status !== 'available'}
                onClick={onHold}
                className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? t('common.loading') : t('seat.choose')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
