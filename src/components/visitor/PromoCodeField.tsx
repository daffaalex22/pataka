'use client'

import { useState } from 'react'
import type { PriceBreakdown } from '@/lib/discounts'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr } from '@/lib/types'

const ERROR_KEYS: Record<string, string> = {
  CODE_NOT_FOUND: 'error.codeNotFound',
  CODE_INACTIVE: 'error.codeInactive',
  CODE_NOT_STARTED: 'error.codeNotStarted',
  CODE_EXPIRED: 'error.codeExpired',
  CODE_CATEGORY: 'error.codeCategory',
  CODE_MIN_ORDER: 'error.codeMinOrder',
  CODE_EXHAUSTED: 'error.codeExhausted',
  ORDER_NOT_EDITABLE: 'error.orderNotEditable',
}

export function PromoCodeField({
  orderCode,
  promoCode,
  promoDiscountIdr,
  disabled = false,
  onChanged,
}: {
  orderCode: string
  promoCode: string | null
  promoDiscountIdr: number
  disabled?: boolean
  onChanged: (breakdown: PriceBreakdown) => void
}) {
  const { lang } = useLang()
  const t = useT()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apply = async () => {
    const code = value.trim()
    if (!code || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const body = (await res.json().catch(() => ({}))) as PriceBreakdown & { error?: string }
      if (res.ok) {
        onChanged(body as PriceBreakdown)
        setValue('')
      } else {
        const key = body.error ? ERROR_KEYS[body.error] : undefined
        setError(key ? t(key as Parameters<typeof t>[0]) : t('error.generic'))
      }
    } catch {
      setError(t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/discount`, { method: 'DELETE' })
      const body = (await res.json().catch(() => ({}))) as PriceBreakdown & { error?: string }
      if (res.ok) {
        onChanged(body as PriceBreakdown)
      } else {
        const key = body.error ? ERROR_KEYS[body.error] : undefined
        setError(key ? t(key as Parameters<typeof t>[0]) : t('error.generic'))
      }
    } catch {
      setError(t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  const locked = disabled || busy

  return (
    <div className="mt-4 space-y-3">
      {promoCode ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3">
          <span className="text-sm font-medium">
            {promoCode} · −{formatIdr(promoDiscountIdr, lang)}
          </span>
          <button
            type="button"
            onClick={remove}
            disabled={locked}
            className="text-xs font-semibold text-emerald-300 transition hover:text-emerald-200 disabled:opacity-50"
          >
            {busy ? t('discount.checking') : t('discount.remove')}
          </button>
        </div>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            apply()
          }}
        >
          <p className="text-xs font-medium text-muted">{t('discount.title')}</p>
          <div className="flex items-stretch gap-2">
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={locked}
              placeholder={t('discount.placeholder')}
              aria-label={t('discount.placeholder')}
              className="w-full min-w-0 rounded-xl border border-line bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-accent/60 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={locked || value.trim() === ''}
              className="shrink-0 rounded-xl border border-line px-4 py-3 text-sm font-semibold text-muted transition hover:border-white/25 hover:text-foreground disabled:opacity-50"
            >
              {busy ? t('discount.checking') : t('discount.apply')}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
