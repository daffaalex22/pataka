'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { LangToggle } from '@/components/ui/LangToggle'
import { BookingStepper } from '@/components/visitor/BookingStepper'
import { FormStep } from '@/components/visitor/FormStep'
import { PaymentStep } from '@/components/visitor/PaymentStep'
import { SeatStep } from '@/components/visitor/SeatStep'
import { SummaryStep } from '@/components/visitor/SummaryStep'
import { TicketTierList } from '@/components/visitor/TicketTierList'
import { useLang, useT } from '@/lib/i18n'
import { useBooking, type BookingStep } from '@/lib/store'
import { useBookingFlow } from '@/lib/useBookingFlow'

const STEPS: {
  key: BookingStep
  labelKey: 'flow.step1' | 'flow.step2' | 'flow.step3' | 'flow.step4' | 'flow.step5'
}[] = [
  { key: 'category', labelKey: 'flow.step1' },
  { key: 'seat', labelKey: 'flow.step2' },
  { key: 'form', labelKey: 'flow.step3' },
  { key: 'summary', labelKey: 'flow.step4' },
  { key: 'payment', labelKey: 'flow.step5' },
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
  const activeIndex = Math.max(0, STEPS.findIndex((item) => item.key === visibleStep))
  const localizedSteps = STEPS.map((item) => ({ key: item.key, label: t(item.labelKey) }))

  return (
    <div className="flex min-h-svh flex-col bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 pb-12 sm:px-6">
        <header className="flex items-center justify-between border-b border-paper/10 py-5">
          <Link
            href="/"
            className="focus-ring flex items-center gap-2 text-sm font-semibold tracking-[0.22em] text-paper"
          >
            PATAKA
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          </Link>
          <div className="flex items-center gap-3">
            {data && (
              <span className="hidden max-w-[20rem] truncate text-xs text-paper/55 sm:block">
                {lang === 'id' ? data.event.name : data.event.nameEn}
              </span>
            )}
            <LangToggle />
          </div>
        </header>

        <main className="flex-1">
          <div className="mt-5">
            <BookingStepper steps={localizedSteps} activeIndex={activeIndex} />
          </div>

          <div className="mt-6">
            {visibleStep === 'category' && (
              <section className="max-w-3xl">
                <h1 className="text-balance font-display text-[clamp(2.5rem,6vw,3.5rem)] uppercase leading-[0.9] tracking-[0.01em]">
                  {t('home.ticketsTitle')}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper/60">
                  {t('home.ticketsSub')}
                </p>

                {error && (
                  <div
                    role="alert"
                    className="mt-5 border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
                  >
                    <p>{error}</p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="focus-ring mt-2 text-xs font-medium text-accent underline underline-offset-4"
                    >
                      {t('common.retry')}
                    </button>
                  </div>
                )}

                {data ? (
                  <TicketTierList
                    categories={data.categories}
                    onChoose={(category) => {
                      reset()
                      setCategory(category.key)
                      setError(null)
                      setStep('seat')
                    }}
                  />
                ) : (
                  <div role="status" aria-live="polite" className="mt-6">
                    <span className="sr-only">{t('common.loading')}</span>
                    <div aria-hidden className="border-t border-paper/10">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 border-b border-paper/10 py-4 sm:gap-5 sm:py-5"
                        >
                          <div className="size-14 shrink-0 rounded-sm bg-paper/[0.05] sm:size-[72px]" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-1/3 rounded-sm bg-paper/[0.06]" />
                            <div className="h-3 w-1/2 rounded-sm bg-paper/[0.04]" />
                            <div className="h-3 w-1/4 rounded-sm bg-paper/[0.04]" />
                          </div>
                          <div className="h-4 w-20 rounded-sm bg-paper/[0.06]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
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
                  setCategory(next.categoryKey)
                  setSeat(next)
                }}
                onHold={handleHold}
                holding={busy}
                holdExpiresAt={holdExpiresAt}
                holdSeatId={holdSeatId}
                onBack={() => {
                  reset()
                  setError(null)
                  setStep('category')
                }}
                onResume={() => setStep('form')}
                error={error}
                defaultView="map"
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
        </main>
      </div>
    </div>
  )
}
