'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { LangToggle } from '@/components/ui/LangToggle'
import { CategoryCards } from '@/components/visitor/CategoryCards'
import { FormStep } from '@/components/visitor/FormStep'
import { PaymentStep } from '@/components/visitor/PaymentStep'
import { SeatStep } from '@/components/visitor/SeatStep'
import { SummaryStep } from '@/components/visitor/SummaryStep'
import { useLang, useT } from '@/lib/i18n'
import { useBooking, type BookingStep } from '@/lib/store'
import { useBookingFlow } from '@/lib/useBookingFlow'

const STEPS: { key: BookingStep; labelKey: 'flow.step1' | 'flow.step2' | 'flow.step3' | 'flow.step4' }[] = [
  { key: 'category', labelKey: 'flow.step1' },
  { key: 'seat', labelKey: 'flow.step2' },
  { key: 'form', labelKey: 'flow.step3' },
  { key: 'summary', labelKey: 'flow.step3' },
  { key: 'payment', labelKey: 'flow.step4' },
]

export default function BookPage() {
  const { lang } = useLang()
  const t = useT()
  const {
    step, categoryKey, seat, holdToken, holdExpiresAt, holdSeatId, orderCode, totalIdr,
    setStep, setCategory, setSeat, setHold, reset,
  } = useBooking((state) => state)

  const { data, seats, busy, error, loadSeats, setError, handleHold, handleOrder, handlePay } = useBookingFlow()

  useEffect(() => {
    loadSeats()
    const timer = window.setInterval(loadSeats, 5000)
    return () => window.clearInterval(timer)
  }, [loadSeats])

  useEffect(() => {
    if (!seat) return
    const live = seats.find((s) => s.id === seat.id)
    if (live && live.status !== seat.status) setSeat(live)
  }, [seats, seat, setSeat])

  useEffect(() => {
    if (step === 'form' && !holdToken) setStep('seat')
    if ((step === 'summary' || step === 'payment') && !orderCode) setStep('seat')
  }, [step, holdToken, orderCode, setStep])

  const visibleStep: BookingStep = step === 'form' && !holdToken ? 'seat' : step
  const uniqueSteps = STEPS.filter((item, index) => STEPS.findIndex((x) => x.labelKey === item.labelKey) === index)
  const currentLabel = STEPS.find((item) => item.key === visibleStep)?.labelKey
  const activeIndex = uniqueSteps.findIndex((item) => item.labelKey === currentLabel)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-10 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-[0.22em]">
          PATAKA
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
        </Link>
        <div className="flex items-center gap-3">
          {data && (
            <span className="hidden text-xs text-muted sm:block">
              {lang === 'id' ? data.event.name : data.event.nameEn}
            </span>
          )}
          <LangToggle />
        </div>
      </header>

      <ol className="mb-6 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]">
        {uniqueSteps.map((item, index) => {
          const done = index < activeIndex
          const active = index === activeIndex
          return (
            <li key={item.labelKey} className="flex flex-1 items-center gap-1.5">
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                  active
                    ? 'border-accent bg-accent text-black'
                    : done
                      ? 'border-accent/50 text-accent'
                      : 'border-line text-muted'
                }`}
              >
                {index + 1}
              </span>
              <span className={active ? 'text-foreground' : 'text-muted'}>{t(item.labelKey)}</span>
              {index < uniqueSteps.length - 1 && <span aria-hidden className="h-px flex-1 bg-line" />}
            </li>
          )
        })}
      </ol>

      {visibleStep === 'category' && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('home.ticketsTitle')}</h1>
          <p className="mt-1 text-sm text-muted">{t('home.ticketsSub')}</p>
          <div className="mt-5">
            {data ? (
              <CategoryCards
                categories={data.categories}
                compact
                onChoose={(category) => {
                  reset()
                  setCategory(category.key)
                  setError(null)
                  setStep('seat')
                }}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="panel h-36 animate-pulse rounded-2xl" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {visibleStep === 'seat' && (
        <SeatStep
          seats={seats}
          categoryKey={categoryKey}
          selected={seat}
          onSelect={(next) => {
            if (holdToken && holdSeatId && next.id !== holdSeatId) {
              fetch(`/api/seats/${encodeURIComponent(holdSeatId)}/release`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ holdToken }),
              }).catch(() => {})
              setHold(null, null, null)
            }
            setError(null)
            setSeat(next)
          }}
          onHold={handleHold}
          holding={busy}
          holdExpiresAt={holdExpiresAt}
          holdSeatId={holdSeatId}
          onBack={() => {
            reset()
            setStep('category')
          }}
          onResume={() => setStep('form')}
          error={error}
        />
      )}

      {visibleStep === 'form' && (
        <FormStep
          seat={seat}
          submitting={busy}
          error={error}
          onBack={() => setStep('seat')}
          onSubmit={handleOrder}
        />
      )}

      {visibleStep === 'summary' && orderCode && (
        <SummaryStep
          seat={seat}
          orderCode={orderCode}
          totalIdr={totalIdr ?? 0}
          holdExpiresAt={holdExpiresAt}
          onBack={() => setStep('form')}
          onContinue={() => {
            setError(null)
            setStep('payment')
          }}
        />
      )}

      {visibleStep === 'payment' && orderCode && (
        <PaymentStep
          totalIdr={totalIdr ?? 0}
          holdExpiresAt={holdExpiresAt}
          paying={busy}
          error={error}
          onBack={() => setStep('summary')}
          onPay={handlePay}
        />
      )}
    </div>
  )
}
