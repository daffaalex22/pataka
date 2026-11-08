'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { MoveVector } from '@/components/scene/Character'
import { Joystick } from '@/components/scene/Joystick'
import { PaymentStep } from '@/components/visitor/PaymentStep'
import { FormStep } from '@/components/visitor/FormStep'
import { SummaryStep } from '@/components/visitor/SummaryStep'
import { SeatBar } from '@/components/world/SeatBar'
import { StepOverlay } from '@/components/world/StepOverlay'
import { WorldHud } from '@/components/world/WorldHud'
import { useT } from '@/lib/i18n'
import { useBooking } from '@/lib/store'
import type { Seat } from '@/lib/types'
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
  const { data, seats, busy, error, loadSeats, setError, handleHold, handleOrder, handlePay } = useBookingFlow()
  const {
    step, seat, holdToken, holdExpiresAt, holdSeatId, orderCode, totalIdr,
    setStep, setCategory, setSeat, setHold,
  } = useBooking((state) => state)

  const [mode, setMode] = useState<'walk' | 'orbit'>('walk')
  const [mapOpen, setMapOpen] = useState(false)
  const [maxDpr] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 1.25 : 1.5,
  )
  const moveRef = useRef<MoveVector>({ x: 0, y: 0 })
  const [previewSeat, setPreviewSeat] = useState<Seat | null>(null)

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
    setError(null)
    setSeat(next)
    setCategory(next.categoryKey)
  }

  const visibleStep = step === 'form' && !holdToken ? 'seat' : step
  const formOpen = visibleStep === 'form'
  const summaryOpen = visibleStep === 'summary' && Boolean(orderCode)
  const paymentOpen = visibleStep === 'payment' && Boolean(orderCode)
  const overlayOpen = formOpen || summaryOpen || paymentOpen

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#07060d]">
      <div className="absolute inset-0">
        <PlazaScene
          seats={seats}
          selectedId={seat?.id ?? null}
          onSelect={selectSeat}
          mode={mode}
          moveRef={moveRef}
          previewSeat={previewSeat}
          maxDpr={maxDpr}
          paused={overlayOpen || mapOpen}
        />
      </div>

      <WorldHud
        mode={mode}
        onMode={setMode}
        mapEnabled={false}
        mapOpen={mapOpen}
        onToggleMap={() => setMapOpen((open) => !open)}
      />

      {mode === 'walk' && !overlayOpen && !mapOpen && <Joystick moveRef={moveRef} />}

      {!overlayOpen && !mapOpen && (
        <SeatBar
          seat={seat}
          busy={busy}
          error={error}
          holdActive={Boolean(holdExpiresAt && holdSeatId && seat && holdSeatId === seat.id)}
          holdExpiresAt={holdExpiresAt}
          onPreview={() => {}}
          onWalkToSeat={() => {}}
          onHold={handleHold}
          onResume={() => setStep('form')}
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
    </div>
  )
}
