'use client'

import { useEffect, useRef, useState } from 'react'
import { useCountdown } from '@/components/ui/useCountdown'
import { ArrowLeftIcon, BankIcon, QrIcon, WalletIcon } from '@/components/ui/icons'
import { OrderContext } from '@/components/visitor/OrderContext'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Seat } from '@/lib/types'

const METHODS = ['ewallet', 'va', 'qrpay'] as const
type Method = (typeof METHODS)[number]

const METHOD_ICONS = {
  ewallet: WalletIcon,
  va: BankIcon,
  qrpay: QrIcon,
} as const

export function PaymentStep({
  totalIdr,
  holdExpiresAt,
  seat = null,
  contextLabel,
  paying,
  error,
  onBack,
  onPay,
  onChooseSeat,
}: {
  totalIdr: number
  holdExpiresAt: string | null
  seat?: Seat | null
  contextLabel?: string | null
  paying: boolean
  error: string | null
  onBack: () => void
  onPay: (method: Method) => void
  onChooseSeat?: () => void
}) {
  const { lang } = useLang()
  const t = useT()
  const [method, setMethod] = useState<Method>('ewallet')
  const countdown = useCountdown(holdExpiresAt)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const labels: Record<Method, string> = {
    ewallet: t('pay.ewallet'),
    va: t('pay.va'),
    qrpay: t('pay.qrpay'),
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <button
        type="button"
        onClick={onBack}
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
        {t('pay.title')}
      </h1>
      <p className="mt-1 text-sm text-paper/60">{t('pay.subtitle')}</p>

      <div className="mt-4 rounded-sm border border-paper/15 bg-paper/[0.02]">
        <OrderContext
          embedded
          seat={seat}
          holdExpiresAt={holdExpiresAt}
          contextLabel={contextLabel}
          countdown={countdown}
          showPrice={false}
        />

        <div className="border-t border-paper/10 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-paper/55">{t('summary.total')}</span>
            <span className="text-2xl font-semibold tabular-nums text-paper">
              {formatIdr(totalIdr, lang)}
            </span>
          </div>

          <div className="mt-4 grid gap-2">
          {METHODS.map((option) => {
            const selected = method === option
            const Icon = METHOD_ICONS[option]
            return (
              <button
                key={option}
                type="button"
                onClick={() => setMethod(option)}
                aria-pressed={selected}
                className={`focus-ring flex min-h-12 w-full items-center gap-3 rounded-sm border px-3.5 py-3 text-left transition-colors ${
                  selected
                    ? 'border-accent/70 bg-accent/[0.06]'
                    : 'border-paper/15 hover:border-paper/30'
                }`}
              >
                <Icon className="size-5 shrink-0 text-paper/60" />
                <span className="text-sm font-medium text-paper">{labels[option]}</span>
                <span
                  aria-hidden
                  className={`ml-auto grid size-4 shrink-0 place-items-center rounded-full border ${
                    selected ? 'border-accent bg-accent' : 'border-paper/30'
                  }`}
                >
                  {selected && <span className="size-1.5 rounded-full bg-ink" />}
                </span>
              </button>
            )
          })}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-3 border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        {countdown.expired && (
          <div role="alert" className="mt-3 border border-amber-300/30 bg-amber-300/[0.07] px-4 py-3">
            <p className="text-sm font-medium text-amber-200">{t('hold.expired')}</p>
            <p className="mt-1 text-sm leading-relaxed text-paper/60">{t('hold.expiredBody')}</p>
            {onChooseSeat && (
              <button
                type="button"
                onClick={onChooseSeat}
                className="focus-ring mt-3 inline-flex min-h-11 items-center rounded-sm border border-paper/20 px-4 text-sm font-medium text-paper transition-colors hover:border-paper/35"
              >
                {t('summary.chooseSeat')}
              </button>
            )}
          </div>
        )}

          <button
            type="button"
            onClick={() => onPay(method)}
            disabled={paying || countdown.expired}
            className="focus-ring mt-4 min-h-12 w-full rounded-sm bg-accent px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {paying ? t('pay.processing') : t('pay.payNow')}
          </button>
          <p className="mt-3 text-center text-xs text-paper/55">{t('pay.simulation')}</p>
        </div>
      </div>
    </div>
  )
}
