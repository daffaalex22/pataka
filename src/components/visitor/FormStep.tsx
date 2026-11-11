'use client'

import { useState } from 'react'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Seat } from '@/lib/types'

export function FormStep({
  seat,
  submitting,
  error,
  onBack,
  onSubmit,
}: {
  seat: Seat | null
  submitting: boolean
  error: string | null
  onBack: () => void
  onSubmit: (data: { name: string; email: string; phone: string }) => void
}) {
  const { lang } = useLang()
  const t = useT()
  const [name, setName] = useState('Rina Contoh')
  const [email, setEmail] = useState('rina@example.com')
  const [phone, setPhone] = useState('081200000001')

  return (
    <div className="mx-auto w-full max-w-xl">
      <button type="button" onClick={onBack} className="text-xs text-muted transition hover:text-foreground">
        ← {t('common.back')}
      </button>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t('form.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('form.subtitle')}</p>

      {seat && (
        <div className="panel mt-4 flex items-center justify-between rounded-2xl px-4 py-3 text-sm">
          <span className="font-medium">
            {seat.id} · {lang === 'id' ? seat.categoryName : seat.categoryNameEn}
          </span>
          <span className="flex shrink-0 items-baseline gap-2 text-accent">
            {formatIdr(seat.priceIdr, lang)}
            {seat.autoDiscountIdr > 0 && (
              <>
                <span className="text-xs text-muted line-through">{formatIdr(seat.listPriceIdr, lang)}</span>
                <span className="text-[11px] text-emerald-300">
                  {lang === 'id' ? seat.autoDiscountName : seat.autoDiscountNameEn} · −{formatIdr(seat.autoDiscountIdr, lang)}
                </span>
              </>
            )}
          </span>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm text-red-200">
          {error}
        </div>
      )}

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit({ name, email, phone })
        }}
      >
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{t('form.name')}</span>
          <input
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-white/5 px-4 py-3 text-base outline-none transition focus:border-accent/60"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{t('form.email')}</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-white/5 px-4 py-3 text-base outline-none transition focus:border-accent/60"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{t('form.phone')}</span>
          <input
            required
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-white/5 px-4 py-3 text-base outline-none transition focus:border-accent/60"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? t('common.loading') : t('form.submit')}
        </button>
      </form>
    </div>
  )
}
