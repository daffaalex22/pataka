'use client'

import { useCountdown } from '@/components/ui/useCountdown'
import { VenueMapCard } from '@/components/venue/VenueMapCard'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Seat } from '@/lib/types'

export function SummaryStep({
  seat,
  orderCode,
  totalIdr,
  holdExpiresAt,
  onBack,
  onContinue,
}: {
  seat: Seat | null
  orderCode: string
  totalIdr: number
  holdExpiresAt: string | null
  onBack: () => void
  onContinue: () => void
}) {
  const { lang } = useLang()
  const t = useT()
  const countdown = useCountdown(holdExpiresAt)

  return (
    <div className="mx-auto w-full max-w-xl">
      <button type="button" onClick={onBack} className="text-xs text-muted transition hover:text-foreground">
        ← {t('common.back')}
      </button>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t('summary.title')}</h1>

      <div className="panel mt-5 rounded-2xl p-5">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted">{t('summary.orderCode')}</dt>
            <dd className="font-mono font-medium">{orderCode}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted">{t('summary.seat')}</dt>
            <dd className="font-medium">
              {seat ? `${seat.id} · ${lang === 'id' ? seat.categoryName : seat.categoryNameEn}` : '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted">{t('summary.status')}</dt>
            <dd>
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-200">
                {t('summary.statusPending')}
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
            <dt className="text-muted">{t('summary.total')}</dt>
            <dd className="text-lg font-semibold text-accent">
              {totalIdr ? formatIdr(totalIdr, lang) : '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted">{t('summary.hold')}</dt>
            <dd className={countdown.expired ? 'font-medium text-red-300' : 'font-mono font-medium'}>
              {countdown.formatted}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs leading-relaxed text-muted">{t('summary.note')}</p>

        <VenueMapCard variant="compact" className="mt-4" />

        <button
          type="button"
          onClick={onContinue}
          disabled={countdown.expired}
          className="mt-5 w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
        >
          {t('summary.pay')} →
        </button>
      </div>
    </div>
  )
}
