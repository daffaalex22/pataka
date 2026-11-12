'use client'

import { HoldTimer } from '@/components/visitor/HoldTimer'
import { useCountdown, type Countdown } from '@/components/ui/useCountdown'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Seat } from '@/lib/types'

function TimerWithHook({ expiresAt }: { expiresAt: string | null }) {
  const countdown = useCountdown(expiresAt)
  return <HoldTimer countdown={countdown} />
}

/**
 * The booking context shared by the form, summary, and payment screens.
 * `embedded` drops the outer frame so it can sit at the top of a ticket stub.
 */
export function OrderContext({
  seat,
  holdExpiresAt,
  contextLabel,
  priceIdr,
  showPrice = true,
  embedded = false,
  countdown,
  className = '',
}: {
  seat: Seat | null
  holdExpiresAt: string | null
  contextLabel?: string | null
  priceIdr?: number | null
  showPrice?: boolean
  embedded?: boolean
  countdown?: Countdown
  className?: string
}) {
  const { lang } = useLang()
  const t = useT()

  const seatLabel = seat
    ? `${t('seat.rowLabel')} ${seat.row} · ${t('seat.numberLabel')} ${seat.num}`
    : contextLabel ?? '—'
  const category = seat ? (lang === 'id' ? seat.categoryName : seat.categoryNameEn) : null
  const price = showPrice ? (priceIdr ?? seat?.priceIdr ?? null) : null

  return (
    <div
      className={`${
        embedded
          ? `px-4 pb-3 pt-4 sm:px-5 ${className}`
          : `rounded-sm border border-paper/15 bg-paper/[0.025] px-4 py-3 ${className}`
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-paper/55">{t('seat.yourSeat')}</p>
          <p className="mt-1 text-sm font-semibold text-paper">{seatLabel}</p>
          {category && <p className="mt-0.5 text-sm text-paper/60">{category}</p>}
        </div>
        {price !== null && (
          <p className="shrink-0 text-sm font-semibold tabular-nums text-paper">
            {formatIdr(price, lang)}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-paper/10 pt-2.5">
        {countdown ? (
          <HoldTimer countdown={countdown} />
        ) : (
          <TimerWithHook expiresAt={holdExpiresAt} />
        )}
        {seat && contextLabel && (
          <span className="min-w-0 truncate text-xs text-paper/55">{contextLabel}</span>
        )}
      </div>
    </div>
  )
}
