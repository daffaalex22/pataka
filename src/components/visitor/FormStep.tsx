'use client'

import { useEffect, useRef, useState } from 'react'
import { useCountdown } from '@/components/ui/useCountdown'
import { ArrowLeftIcon } from '@/components/ui/icons'
import { OrderContext } from '@/components/visitor/OrderContext'
import { useT } from '@/lib/i18n'
import type { Participant } from '@/lib/store'
import type { Seat } from '@/lib/types'

const SAMPLE: Participant = {
  name: 'Rina Contoh',
  email: 'rina@example.com',
  phone: '081200000001',
}

export function FormStep({
  seat,
  holdExpiresAt,
  initialParticipant,
  editing = false,
  submitting,
  error,
  onBack,
  onChooseSeat,
  onSubmit,
}: {
  seat: Seat | null
  holdExpiresAt: string | null
  initialParticipant: Participant | null
  editing?: boolean
  submitting: boolean
  error: string | null
  onBack: () => void
  onChooseSeat?: () => void
  onSubmit: (data: Participant) => void
}) {
  const t = useT()
  const countdown = useCountdown(holdExpiresAt)
  const initial = initialParticipant ?? SAMPLE
  const [name, setName] = useState(initial.name)
  const [email, setEmail] = useState(initial.email)
  const [phone, setPhone] = useState(initial.phone)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const chooseSeat = onChooseSeat ?? onBack

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

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
        {editing ? t('form.editTitle') : t('form.title')}
      </h1>
      <p className="mt-1 text-sm text-paper/60">{t('form.subtitle')}</p>

      <div className="mt-4">
        <OrderContext seat={seat} holdExpiresAt={holdExpiresAt} countdown={countdown} />
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
        <div
          role="alert"
          className="mt-3 border border-amber-300/30 bg-amber-300/[0.07] px-4 py-3"
        >
          <p className="text-sm font-medium text-amber-200">{t('hold.expired')}</p>
          <p className="mt-1 text-sm leading-relaxed text-paper/60">{t('hold.expiredBody')}</p>
          <button
            type="button"
            onClick={chooseSeat}
            className="focus-ring mt-3 inline-flex min-h-11 items-center rounded-sm border border-paper/20 px-4 text-sm font-medium text-paper transition-colors hover:border-paper/35"
          >
            {t('summary.chooseSeat')}
          </button>
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
          <span className="text-sm font-medium text-paper/70">{t('form.name')}</span>
          <input
            required
            minLength={2}
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="focus-ring mt-2 min-h-11 w-full rounded-sm border border-paper/20 bg-ink px-3.5 py-2.5 text-base text-paper transition-colors placeholder:text-paper/55 focus:border-accent/60"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-paper/70">{t('form.email')}</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="focus-ring mt-2 min-h-11 w-full rounded-sm border border-paper/20 bg-ink px-3.5 py-2.5 text-base text-paper transition-colors placeholder:text-paper/55 focus:border-accent/60"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-paper/70">{t('form.phone')}</span>
          <input
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="focus-ring mt-2 min-h-11 w-full rounded-sm border border-paper/20 bg-ink px-3.5 py-2.5 text-base text-paper transition-colors placeholder:text-paper/55 focus:border-accent/60"
          />
        </label>

        <button
          type="submit"
          disabled={submitting || countdown.expired}
          className="focus-ring min-h-12 w-full rounded-sm bg-accent px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? t('common.loading') : editing ? t('form.saveChanges') : t('form.submit')}
        </button>
      </form>
    </div>
  )
}
