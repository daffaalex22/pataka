'use client'

import { HoldTimer } from '@/components/visitor/HoldTimer'
import { useCountdown } from '@/components/ui/useCountdown'
import { ChevronRightIcon, EyeIcon, WalkIcon, XIcon } from '@/components/ui/icons'
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
  onClear,
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
  onClear: () => void
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
          className="pointer-events-auto mx-auto mb-2 max-w-md rounded-sm border border-red-400/40 bg-ink/95 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {seat && (
        <div className="pointer-events-auto mx-auto max-w-xl rounded-sm border border-paper/15 bg-ink/95 px-4 py-3 text-paper">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-paper/55">
              {holdActive ? t('seat.yourSeat') : t('seat.selected')}
            </p>
            {!holdActive && (
              <button
                type="button"
                onClick={onClear}
                aria-label={t('seat.clear')}
                title={t('seat.clear')}
                className="focus-ring -my-2 -mr-2 grid size-11 shrink-0 place-items-center text-paper/50 transition-colors hover:text-paper"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>

          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-display text-2xl uppercase leading-none tracking-[0.02em] text-paper">
                {t('seat.rowLabel')} {seat.row}
                <span aria-hidden className="px-2 text-paper/35">
                  ·
                </span>
                {t('seat.numberLabel')} {seat.num}
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-paper/60">
                <span>{lang === 'id' ? seat.categoryName : seat.categoryNameEn}</span>
                <span aria-hidden className="text-paper/25">
                  ·
                </span>
                <span className="font-medium tabular-nums text-paper/85">
                  {formatIdr(seat.priceIdr, lang)}
                </span>
                {seat.status !== 'available' && (
                  <>
                    <span aria-hidden className="text-paper/25">
                      ·
                    </span>
                    <span className={seat.status === 'held' ? 'text-amber-300' : 'text-paper/45'}>
                      {t(`status.${seat.status}`)}
                    </span>
                  </>
                )}
              </p>
              {holdActive && <HoldTimer countdown={countdown} className="mt-1.5" />}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onPreview}
                aria-label={t('seat.preview')}
                title={t('seat.preview')}
                className="focus-ring grid size-11 shrink-0 place-items-center rounded-sm border border-paper/20 text-paper/70 transition-colors hover:border-paper/40 hover:text-paper"
              >
                <EyeIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={onWalkToSeat}
                aria-label={t('seat.walkToSeat')}
                title={t('seat.walkToSeat')}
                className="focus-ring grid size-11 shrink-0 place-items-center rounded-sm border border-paper/20 text-paper/70 transition-colors hover:border-paper/40 hover:text-paper"
              >
                <WalkIcon className="size-4" />
              </button>
              {holdActive ? (
                <button
                  type="button"
                  onClick={onResume}
                  className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-ink transition hover:brightness-110"
                >
                  {t('seat.resume')}
                  <ChevronRightIcon className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || seat.status !== 'available'}
                  onClick={onHold}
                  className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? t('common.loading') : t('seat.choose')}
                  <ChevronRightIcon className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
