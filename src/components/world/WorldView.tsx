'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MoveVector } from '@/components/scene/Character'
import { Joystick } from '@/components/scene/Joystick'
import { PaymentStep } from '@/components/visitor/PaymentStep'
import { SceneBoundary } from '@/components/scene/SceneBoundary'
import { FormStep } from '@/components/visitor/FormStep'
import { SeatMap2D } from '@/components/visitor/SeatMap2D'
import { SummaryStep } from '@/components/visitor/SummaryStep'
import type { Group } from 'three'
import { BoothOverlay } from '@/components/world/BoothOverlay'
import { SeatBar } from '@/components/world/SeatBar'
import { SeatViewPanel } from '@/components/world/SeatViewPanel'
import { StepOverlay } from '@/components/world/StepOverlay'
import { WorldHud } from '@/components/world/WorldHud'
import { useLang, useT } from '@/lib/i18n'
import { useBooking } from '@/lib/store'
import type { Category, Seat } from '@/lib/types'
import { useBookingFlow } from '@/lib/useBookingFlow'

function WorldLoading() {
  const t = useT()
  return <div className="grid h-full place-items-center text-xs text-muted">{t('splash.loading')}</div>
}

const PlazaScene = dynamic(() => import('@/components/scene/PlazaScene'), {
  ssr: false,
  loading: () => <WorldLoading />,
})

export function WorldView() {
  const t = useT()
  const { lang } = useLang()
  const { data, seats, busy, error, loadSeats, setError, handleHold, handleOrder, handlePay } = useBookingFlow({
    eventPollMs: 5000,
  })
  const {
    step, categoryKey, seat, holdToken, holdExpiresAt, holdSeatId, orderCode, totalIdr,
    setStep, setCategory, setSeat, setHold,
  } = useBooking((state) => state)

  const [mode, setMode] = useState<'walk' | 'orbit'>('walk')
  const [mapOpen, setMapOpen] = useState(false)
  const [maxDpr] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 1.25 : 1.5,
  )
  const moveRef = useRef<MoveVector>({ x: 0, y: 0 })
  const characterRef = useRef<Group | null>(null)
  const [previewSeat, setPreviewSeat] = useState<Seat | null>(null)
  const [autoWalkSeat, setAutoWalkSeat] = useState<Seat | null>(null)
  const [boothOpen, setBoothOpen] = useState(false)
  const [highlightCategory, setHighlightCategory] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const hintTimer = useRef<number | null>(null)

  const showHint = useCallback((message: string) => {
    setHint(message)
    if (hintTimer.current) window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setHint(null), 6000)
  }, [])

  useEffect(() => {
    showHint(t('world.hint'))
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!highlightCategory) return
    const timer = window.setTimeout(() => setHighlightCategory(null), 30000)
    return () => window.clearTimeout(timer)
  }, [highlightCategory])

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
    const character = characterRef.current
    if (character) character.visible = !previewSeat
  }, [previewSeat])

  const exitPreview = () => {
    setPreviewSeat(null)
    setAutoWalkSeat(null)
    const character = characterRef.current
    if (character) {
      character.visible = true
      character.position.set(0, 0, 14)
    }
  }

  useEffect(() => {
    if (step === 'form' && !holdToken) setStep('seat')
    if ((step === 'summary' || step === 'payment') && !orderCode) setStep('seat')
  }, [step, holdToken, orderCode, setStep])

  const selectSeat = (next: Seat) => {
    if (holdToken && holdSeatId && next.id !== holdSeatId) {
      fetch(`/api/seats/${encodeURIComponent(holdSeatId)}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdToken }),
      }).catch(() => {})
      setHold(null, null, null)
    }
    setPreviewSeat(null)
    setAutoWalkSeat(null)
    setHighlightCategory(null)
    setError(null)
    setSeat(next)
    setCategory(next.categoryKey)
  }

  const chooseCategory = (category: Category) => {
    setCategory(category.key)
    setBoothOpen(false)
    setHighlightCategory(category.key)
    showHint(t('world.boothHint'))
  }

  const visibleStep = step === 'form' && !holdToken ? 'seat' : step
  const formOpen = visibleStep === 'form'
  const summaryOpen = visibleStep === 'summary' && Boolean(orderCode)
  const paymentOpen = visibleStep === 'payment' && Boolean(orderCode)
  const overlayOpen = formOpen || summaryOpen || paymentOpen

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#07060d]">
      <div className="absolute inset-0">
        <SceneBoundary
          fallback={
            <div className="grid h-full place-items-center p-6 text-center">
              <Link
                href="/book"
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110"
              >
                {t('splash.classic')} →
              </Link>
            </div>
          }
        >
        <PlazaScene
          seats={seats}
          selectedId={seat?.id ?? null}
          onSelect={selectSeat}
          mode={mode}
          moveRef={moveRef}
          previewSeat={previewSeat}
          maxDpr={maxDpr}
          paused={overlayOpen || mapOpen || boothOpen}
          showInteractables={Boolean(data)}
          boardData={data ? { event: data.event, categories: data.categories, lang } : undefined}
          onBoothTap={() => setBoothOpen(true)}
          highlightCategory={highlightCategory}
          characterRef={characterRef}
          autoWalkSeat={autoWalkSeat}
          onAutoWalkArrived={(arrived) => {
            setAutoWalkSeat(null)
            setPreviewSeat(arrived)
          }}
          onAutoWalkCancel={() => setAutoWalkSeat(null)}
        />
        </SceneBoundary>
      </div>

      <WorldHud
        mode={mode}
        onMode={setMode}
        mapEnabled
        mapOpen={mapOpen}
        onToggleMap={() => setMapOpen((open) => !open)}
        hint={hint}
      />

      {mode === 'walk' && !overlayOpen && !mapOpen && !previewSeat && !boothOpen && (
        <Joystick moveRef={moveRef} />
      )}

      {!overlayOpen && !mapOpen && !previewSeat && !boothOpen && (
        <SeatBar
          seat={seat}
          busy={busy}
          error={error}
          holdActive={Boolean(holdExpiresAt && holdSeatId && seat && holdSeatId === seat.id)}
          holdExpiresAt={holdExpiresAt}
          onPreview={() => seat && setPreviewSeat(seat)}
          onWalkToSeat={() => {
            if (!seat) return
            setMode('walk')
            setAutoWalkSeat(seat)
          }}
          onHold={handleHold}
          onResume={() => setStep('form')}
        />
      )}

      {previewSeat && !overlayOpen && !mapOpen && !boothOpen && (
        <SeatViewPanel
          seat={previewSeat}
          busy={busy}
          onBack={exitPreview}
          onContinue={() => {
            const held = Boolean(holdExpiresAt && holdSeatId && holdSeatId === previewSeat.id)
            const available = previewSeat.status === 'available'
            exitPreview()
            if (held) setStep('form')
            else if (available) handleHold()
          }}
        />
      )}

      <p className="pointer-events-none absolute inset-x-0 bottom-2 z-10 text-center text-[10px] text-white/45">
        {mode === 'walk' ? t('seat.walkHint') : t('seat.dragHint')}
      </p>

      <StepOverlay open={formOpen} onBack={() => setStep('seat')}>
        <FormStep
          seat={seat}
          submitting={busy}
          error={error}
          onBack={() => setStep('seat')}
          onSubmit={handleOrder}
        />
      </StepOverlay>

      <StepOverlay open={summaryOpen} onBack={() => setStep('form')}>
        <SummaryStep
          seat={seat}
          orderCode={orderCode ?? ''}
          totalIdr={totalIdr ?? 0}
          holdExpiresAt={holdExpiresAt}
          onBack={() => setStep('form')}
          onContinue={() => {
            setError(null)
            setStep('payment')
          }}
        />
      </StepOverlay>

      <StepOverlay open={paymentOpen} onBack={() => setStep('summary')}>
        <PaymentStep
          totalIdr={totalIdr ?? 0}
          holdExpiresAt={holdExpiresAt}
          paying={busy}
          error={error}
          onBack={() => setStep('summary')}
          onPay={handlePay}
        />
      </StepOverlay>

      {mapOpen && (
        <div className="fixed inset-0 z-20 overflow-y-auto bg-[#07060d]/95 backdrop-blur">
          <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between gap-3 py-2">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{t('seat.title')}</h2>
                <p className="text-xs text-muted">{t('seat.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-white/30 hover:text-foreground"
              >
                ✕ {t('common.back')}
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white/[0.03] p-3">
              <SeatMap2D
                seats={seats}
                categoryKey={categoryKey}
                selectedId={seat?.id ?? null}
                onSelect={(next) => {
                  selectSeat(next)
                  setMapOpen(false)
                }}
                stageLabel={t('seat.stage')}
              />
            </div>
          </div>
        </div>
      )}

      <BoothOverlay
        open={boothOpen}
        categories={data?.categories ?? null}
        onChoose={chooseCategory}
        onClose={() => setBoothOpen(false)}
      />
    </div>
  )
}
