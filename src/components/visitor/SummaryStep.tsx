'use client'

import { useEffect, useRef, useState } from 'react'
import { useCountdown } from '@/components/ui/useCountdown'
import { ArrowLeftIcon, CompassIcon } from '@/components/ui/icons'
import { OrderContext } from '@/components/visitor/OrderContext'
import { VenueMapDialog } from '@/components/venue/VenueMapDialog'
import type { PriceBreakdown } from '@/lib/discounts'
import { useLang, useT } from '@/lib/i18n'
import type { Participant } from '@/lib/store'
import { formatIdr, type Seat } from '@/lib/types'

export function SummaryStep({
  seat,
  participant,
  orderCode,
  breakdown,
  holdExpiresAt,
  onEdit,
  onContinue,
  onChooseSeat,
}: {
  seat: Seat | null
  participant: Participant | null
  orderCode: string
  breakdown: PriceBreakdown
  holdExpiresAt: string | null
  onEdit: () => void
  onContinue: () => void
  onChooseSeat: () => void
}) {
  const { lang } = useLang()
  const t = useT()
  const countdown = useCountdown(holdExpiresAt)
  const [mapOpen, setMapOpen] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="mx-auto w-full max-w-xl">
      <button
        type="button"
        onClick={onEdit}
        className="focus-ring -my-2 inline-flex min-h-11 items-center gap-1 py-2 text-xs font-medium text-paper/55 transition-colors hover:text-paper"
      >
        <ArrowLeftIcon className="size-3.5" />
        {t('common.back')}
      </button>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 font-display text-[clamp(2rem,5vw,2.75rem)] uppercase leading-[0.95] tracking-[0.01em] text-paper focus:outline-none"
      >
        {t('summary.title')}
      </h1>

      <div className="mt-5 overflow-hidden rounded-sm border border-paper/15 bg-paper/[0.02]">
        <OrderContext
          embedded
          seat={seat}
          holdExpiresAt={holdExpiresAt}
          countdown={countdown}
          showPrice={false}
        />

        <div className="border-t border-dashed border-paper/15 px-4 pb-4 pt-3 sm:px-5">
          <dl className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-paper/55">{t('summary.orderCode')}</dt>
              <dd className="font-mono text-sm font-medium text-paper">{orderCode}</dd>
            </div>

            <div className="border-t border-paper/10 pt-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <dt className="text-xs text-paper/55">{t('summary.participant')}</dt>
                  <dd className="mt-1">
                    <p className="text-sm font-medium text-paper">{participant?.name ?? '—'}</p>
                    {participant && (
                      <>
                        <p className="mt-0.5 break-all text-sm text-paper/60">{participant.email}</p>
                        <p className="text-sm text-paper/60">{participant.phone}</p>
                      </>
                    )}
                  </dd>
                </div>
                <button
                  type="button"
                  onClick={onEdit}
                  className="focus-ring -my-1 shrink-0 py-1 text-sm font-medium text-accent underline underline-offset-4 transition hover:text-accent/80"
                >
                  {t('summary.edit')}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-paper/10 pt-3">
              <dt className="text-paper/55">{t('summary.status')}</dt>
              <dd className="flex items-center gap-2 text-sm text-amber-200">
                <span aria-hidden className="size-1.5 rounded-full bg-amber-300" />
                {t('summary.statusPending')}
              </dd>
            </div>

            <div className="space-y-2 border-t border-paper/10 pt-3">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-paper/55">{t('discount.listPrice')}</dt>
                <dd className="tabular-nums">{formatIdr(breakdown.listPriceIdr, lang)}</dd>
              </div>
              {breakdown.autoDiscountIdr > 0 && (
                <div className="flex items-center justify-between gap-4 text-emerald-300">
                  <dt>{lang === 'id' ? breakdown.autoDiscountName : breakdown.autoDiscountNameEn}</dt>
                  <dd className="tabular-nums">−{formatIdr(breakdown.autoDiscountIdr, lang)}</dd>
                </div>
              )}
              {(breakdown.autoDiscountIdr > 0 || breakdown.promoDiscountIdr > 0) && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-paper/55">{t('discount.subtotal')}</dt>
                  <dd className="tabular-nums">{formatIdr(breakdown.subtotalIdr, lang)}</dd>
                </div>
              )}
              {breakdown.promoDiscountIdr > 0 && (
                <div className="flex items-center justify-between gap-4 text-emerald-300">
                  <dt>
                    {breakdown.promoCode} · {t('discount.promo')}
                  </dt>
                  <dd className="tabular-nums">−{formatIdr(breakdown.promoDiscountIdr, lang)}</dd>
                </div>
              )}
            </div>

            <div className="flex items-baseline justify-between gap-4 border-t border-paper/10 pt-3">
              <dt className="text-paper/55">{t('summary.total')}</dt>
              <dd className="text-xl font-semibold tabular-nums text-paper">
                {formatIdr(breakdown.totalIdr, lang)}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-xs leading-relaxed text-paper/55">{t('summary.note')}</p>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="focus-ring -my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm font-medium text-paper/70 underline decoration-paper/25 underline-offset-4 transition-colors hover:text-paper"
            >
              <CompassIcon className="size-4" />
              {t('summary.gettingThere')}
            </button>
            <span className="text-xs text-paper/55">{t('venue.subtitle')}</span>
          </div>
        </div>
      </div>

      {countdown.expired && (
        <div role="alert" className="mt-4 border border-amber-300/30 bg-amber-300/[0.07] px-4 py-3">
          <p className="text-sm font-medium text-amber-200">{t('hold.expired')}</p>
          <p className="mt-1 text-sm leading-relaxed text-paper/60">{t('hold.expiredBody')}</p>
          <button
            type="button"
            onClick={onChooseSeat}
            className="focus-ring mt-3 inline-flex min-h-11 items-center rounded-sm border border-paper/20 px-4 text-sm font-medium text-paper transition-colors hover:border-paper/35"
          >
            {t('summary.chooseSeat')}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={countdown.expired}
        className="focus-ring mt-4 min-h-12 w-full rounded-sm bg-accent px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('summary.pay')}
      </button>

      <VenueMapDialog open={mapOpen} onClose={() => setMapOpen(false)} />
    </div>
  )
}
