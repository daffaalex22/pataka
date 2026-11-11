'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MoveVector } from '@/components/scene/Character'
import { Joystick } from '@/components/scene/Joystick'
import { PaymentStep } from '@/components/visitor/PaymentStep'
import { SceneBoundary } from '@/components/scene/SceneBoundary'
import { FormStep } from '@/components/visitor/FormStep'
import { SeatLegend } from '@/components/visitor/SeatLegend'
import { SeatMap2D } from '@/components/visitor/SeatMap2D'
import { SummaryStep } from '@/components/visitor/SummaryStep'
import { Dialog } from '@/components/ui/Dialog'
import type { Group } from 'three'
import { BoothOverlay } from '@/components/world/BoothOverlay'
import { BoardDetail } from '@/components/world/BoardDetail'
import { SeatBar } from '@/components/world/SeatBar'
import { SeatViewPanel } from '@/components/world/SeatViewPanel'
import { StepOverlay } from '@/components/world/StepOverlay'
import { WorldHud } from '@/components/world/WorldHud'
import { ChevronRightIcon, XIcon } from '@/components/ui/icons'
import { useLang, useT } from '@/lib/i18n'
import { useBooking } from '@/lib/store'
import type { Category, Seat } from '@/lib/types'
import { useBookingFlow } from '@/lib/useBookingFlow'

function WorldLoading() {
  const t = useT()
  return (
    <div className="grid h-full place-items-center bg-ink p-6 text-center text-sm text-paper/60">
      {t('splash.loading')}
    </div>
  )
}

const PlazaScene = dynamic(() => import('@/components/scene/PlazaScene'), {
  ssr: false,
  loading: () => <WorldLoading />,
})

export function WorldView({ onExit }: { onExit: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const { data, seats, busy, error, loadSeats, setError, handleHold, handleOrder, handlePay } = useBookingFlow({
    eventPollMs: 5000,
  })
  const {
    step, categoryKey, seat, holdToken, holdExpiresAt, holdSeatId, orderCode, totalIdr, participant,
    setStep, setCategory, setSeat, setHold, setOrder,
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
  const [boardDetailOpen, setBoardDetailOpen] = useState(false)
  const [highlightCategory, setHighlightCategory] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(() => `${t('world.hint')} · ${t('world.lookHint')}`)
  const hintTimer = useRef<number | null>(null)

  const showHint = useCallback((message: string) => {
    setHint(message)
    if (hintTimer.current) window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setHint(null), 6000)
  }, [])

  useEffect(() => {
    hintTimer.current = window.setTimeout(() => setHint(null), 6000)
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current)
    }
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
      character.position.set(0, 0, 19)
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

  const chooseSeatAgain = () => {
    setHold(null, null, null)
    setOrder(null, null)
    setSeat(null)
    setError(null)
    loadSeats()
    setStep('seat')
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink">
      <div className="absolute inset-0">
        <SceneBoundary
          fallback={
            <div className="grid h-full place-items-center p-6 text-center">
              <Link
                href="/book"
                className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-sm bg-accent px-5 text-sm font-semibold text-ink transition hover:brightness-110"
              >
                {t('splash.direct')}
                <ChevronRightIcon className="size-4" />
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
          paused={overlayOpen || mapOpen || boothOpen || boardDetailOpen}
          showInteractables={Boolean(data)}
          boardData={data ? { event: data.event, categories: data.categories, lang } : undefined}
          onBoothTap={() => setBoothOpen(true)}
          onBoardTap={() => setBoardDetailOpen(true)}
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
        hint={seat ? null : hint}
        onExit={onExit}
      />

      {mode === 'walk' && !seat && !overlayOpen && !mapOpen && !previewSeat && !boothOpen && !boardDetailOpen && (
        <Joystick moveRef={moveRef} />
      )}

      {!overlayOpen && !mapOpen && !previewSeat && !boothOpen && !boardDetailOpen && (
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

      {previewSeat && !overlayOpen && !mapOpen && !boothOpen && !boardDetailOpen && (
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

      {!seat && !previewSeat && !overlayOpen && !mapOpen && !boothOpen && !boardDetailOpen && (
        <p className="pointer-events-none absolute inset-x-0 bottom-2 z-10 text-center text-xs text-paper/55">
          {mode === 'walk' ? t('seat.walkHint') : t('seat.dragHint')}
        </p>
      )}

      <StepOverlay open={formOpen} onBack={() => setStep('seat')}>
        <FormStep
          seat={seat}
          holdExpiresAt={holdExpiresAt}
          initialParticipant={participant}
          editing={Boolean(orderCode)}
          submitting={busy}
          error={error}
          onBack={() => setStep('seat')}
          onChooseSeat={chooseSeatAgain}
          onSubmit={handleOrder}
        />
      </StepOverlay>

      <StepOverlay open={summaryOpen} onBack={() => setStep('form')}>
        <SummaryStep
          seat={seat}
          participant={participant}
          orderCode={orderCode ?? ''}
          totalIdr={totalIdr ?? 0}
          holdExpiresAt={holdExpiresAt}
          onEdit={() => setStep('form')}
          onChooseSeat={chooseSeatAgain}
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
          seat={seat}
          paying={busy}
          error={error}
          onBack={() => setStep('summary')}
          onChooseSeat={chooseSeatAgain}
          onPay={handlePay}
        />
      </StepOverlay>

      <Dialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        ariaLabel={t('seat.title')}
        plain
        panelClassName="max-w-3xl rounded-none! p-0 sm:rounded-sm!"
      >
        {mapOpen && (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-paper/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h2 className="text-balance font-display text-[clamp(1.5rem,4vw,2rem)] uppercase leading-[0.95] tracking-[0.01em] text-paper">
                  {t('seat.title')}
                </h2>
                <p className="mt-1 text-sm text-paper/60">{t('seat.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                aria-label={t('seat.closeMap')}
                title={t('seat.closeMap')}
                className="focus-ring grid size-11 shrink-0 place-items-center rounded-sm border border-paper/20 text-paper/70 transition-colors hover:border-paper/40 hover:text-paper"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="p-4">
              <SeatLegend />
              <div className="mt-3 border border-paper/10 p-3">
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
          </>
        )}
      </Dialog>

      <BoothOverlay
        open={boothOpen}
        categories={data?.categories ?? null}
        onChoose={chooseCategory}
        onClose={() => setBoothOpen(false)}
      />

      {data && (
        <BoardDetail
          open={boardDetailOpen}
          event={data.event}
          categories={data.categories}
          onClose={() => setBoardDetailOpen(false)}
        />
      )}
    </div>
  )
}
