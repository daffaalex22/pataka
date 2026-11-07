'use client'

import { useState } from 'react'
import { useCountdown } from '@/components/ui/useCountdown'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr } from '@/lib/types'

const METHODS = ['ewallet', 'va', 'qrpay'] as const
type Method = (typeof METHODS)[number]

export function PaymentStep({
  totalIdr,
  holdExpiresAt,
  paying,
  error,
  onBack,
  onPay,
}: {
  totalIdr: number
  holdExpiresAt: string | null
  paying: boolean
  error: string | null
  onBack: () => void
  onPay: (method: Method) => void
}) {
  const { lang } = useLang()
  const t = useT()
  const [method, setMethod] = useState<Method>('ewallet')
  const countdown = useCountdown(holdExpiresAt)

  const labels: Record<Method, string> = {
    ewallet: t('pay.ewallet'),
    va: t('pay.va'),
    qrpay: t('pay.qrpay'),
  }
  const icons: Record<Method, string> = { ewallet: '◉', va: '▤', qrpay: '▦' }

  return (
    <div className="mx-auto w-full max-w-xl">
      <button type="button" onClick={onBack} className="text-xs text-muted transition hover:text-foreground">
        ← {t('common.back')}
      </button>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t('pay.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('pay.subtitle')}</p>

      <div className="panel mt-5 rounded-2xl p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">{t('summary.total')}</span>
          <span className="text-2xl font-semibold text-accent">{formatIdr(totalIdr, lang)}</span>
        </div>

        <div className="mt-4 grid gap-2">
          {METHODS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMethod(option)}
              aria-pressed={method === option}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                method === option
                  ? 'border-accent/70 bg-accent/10'
                  : 'border-line bg-white/[0.02] hover:border-white/25'
              }`}
            >
              <span aria-hidden className="text-base text-muted">{icons[option]}</span>
              <span className="font-medium">{labels[option]}</span>
              <span className={`ml-auto size-4 rounded-full border ${method === option ? 'border-accent bg-accent' : 'border-white/25'}`} />
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm text-red-200">
            {error}
          </div>
        )}

        {countdown.expired && (
          <div role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm text-red-200">
            {t('error.holdExpired')}
          </div>
        )}

        <button
          type="button"
          onClick={() => onPay(method)}
          disabled={paying || countdown.expired}
          className="accent-glow mt-5 w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
        >
          {paying ? t('pay.processing') : t('pay.payNow')}
        </button>
        <p className="mt-3 text-center text-[11px] text-muted">{t('pay.simulation')}</p>
      </div>
    </div>
  )
}
