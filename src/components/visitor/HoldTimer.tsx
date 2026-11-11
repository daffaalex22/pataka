'use client'

import type { Countdown } from '@/components/ui/useCountdown'
import { useT } from '@/lib/i18n'

/**
 * Visible hold countdown. The seconds tick every second visually, but the
 * polite live region only changes at the one-minute mark and at expiry.
 */
export function HoldTimer({ countdown, className = '' }: { countdown: Countdown; className?: string }) {
  const t = useT()
  const finalMinute = !countdown.expired && countdown.remaining <= 60
  const announcement = countdown.expired
    ? t('hold.expired')
    : finalMinute
      ? t('hold.lessThanMinute')
      : ''

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {countdown.expired ? (
        <span className="text-sm font-medium text-red-300">{t('hold.expired')}</span>
      ) : (
        <>
          <span className="text-xs text-paper/55">{t('hold.label')}</span>
          <span
            className={`text-sm font-medium tabular-nums ${finalMinute ? 'text-amber-300' : 'text-paper'}`}
          >
            {countdown.formatted}
          </span>
        </>
      )}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  )
}
