'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { Joystick } from '@/components/scene/Joystick'
import type { MoveVector } from '@/components/scene/Character'
import { SceneBoundary } from '@/components/scene/SceneBoundary'
import { ArrowLeftIcon, CompassIcon, EyeIcon, RotateIcon } from '@/components/ui/icons'
import { SeatLegend } from '@/components/visitor/SeatLegend'
import { SeatPicker2D } from '@/components/visitor/SeatPicker2D'
import { QualityMenu } from '@/components/scene/QualityMenu'
import { useSceneQuality } from '@/components/scene/useSceneQuality'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Seat } from '@/lib/types'
import { defaultSeatView, hasWebGL } from '@/lib/webgl'

function SeatLoading() {
  const t = useT()
  return <div className="grid h-full place-items-center text-xs text-paper/55">{t('seat.loading3d')}</div>
}

const PlazaScene = dynamic(() => import('@/components/scene/PlazaScene'), {
  ssr: false,
  loading: () => <SeatLoading />,
})

export function SeatStep({
  seats,
  categoryKey,
  selected,
  onSelect,
  onHold,
  holding,
  holdExpiresAt,
  holdSeatId,
  onBack,
  onResume,
  error,
  defaultView,
}: {
  seats: Seat[]
  categoryKey: string | null
  selected: Seat | null
  onSelect: (seat: Seat) => void
  onHold: () => void
  holding: boolean
  holdExpiresAt: string | null
  holdSeatId: string | null
  onBack: () => void
  onResume: () => void
  error: string | null
  defaultView?: '3d' | 'map'
}) {
  const { lang } = useLang()
  const t = useT()
  const [webglAvailable] = useState(() => typeof window !== 'undefined' && hasWebGL())
  const [view, setView] = useState<'3d' | 'map'>(() => defaultView ?? defaultSeatView(webglAvailable))
  const [mode, setMode] = useState<'orbit' | 'walk'>('orbit')
  const [quality, setQuality] = useSceneQuality()
  const [previewSeat, setPreviewSeat] = useState<Seat | null>(null)
  const moveRef = useRef<MoveVector>({ x: 0, y: 0 })
  const headingRef = useRef<HTMLHeadingElement>(null)
  const holdButtonRef = useRef<HTMLButtonElement>(null)
  const selectedId = selected?.id ?? null

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    if (selectedId) holdButtonRef.current?.focus()
  }, [selectedId])

  const selectSeat = (seat: Seat) => {
    setPreviewSeat(null)
    onSelect(seat)
  }

  const categoryName = selected
    ? lang === 'id'
      ? selected.categoryName
      : selected.categoryNameEn
    : null

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="focus-ring -my-2 inline-flex items-center gap-1 py-2 text-xs font-medium text-paper/55 transition-colors hover:text-paper"
          >
            <ArrowLeftIcon className="size-3.5" />
            {t('common.back')}
          </button>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 font-display text-[clamp(2rem,5vw,2.75rem)] uppercase leading-[0.95] tracking-[0.01em] text-paper focus:outline-none"
          >
            {t('seat.title')}
          </h1>
          <p className="mt-1 text-sm text-paper/60">{t('seat.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          {view === '3d' && webglAvailable && (
            <QualityMenu quality={quality} onChange={setQuality} align="left" />
          )}
          <div className="flex rounded-sm border border-paper/15 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setView('map')}
              className={`focus-ring rounded-sm px-3 py-2.5 transition-colors ${
                view === 'map' ? 'bg-accent text-ink' : 'text-paper/55 hover:text-paper'
              }`}
            >
              {t('seat.viewList')}
            </button>
            {webglAvailable && (
              <button
                type="button"
                onClick={() => setView('3d')}
                className={`focus-ring rounded-sm px-3 py-2.5 transition-colors ${
                  view === '3d' ? 'bg-accent text-ink' : 'text-paper/55 hover:text-paper'
                }`}
              >
                {t('seat.view3d')}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {view === 'map' ? (
        <div className="mt-4">
          <SeatPicker2D
            seats={seats}
            categoryKey={categoryKey}
            selectedId={selectedId}
            onSelect={selectSeat}
            stageLabel={t('seat.stage')}
          />
        </div>
      ) : (
        <>
          <div className="relative mt-4 h-[46vh] min-h-[340px] overflow-hidden rounded-md border border-paper/15 bg-[#07060d] sm:h-[56vh]">
            <SceneBoundary
              fallback={
                <div className="grid h-full place-items-center p-6 text-center">
                  <button
                    type="button"
                    onClick={() => setView('map')}
                    className="focus-ring rounded-sm bg-accent px-4 py-2.5 text-xs font-semibold text-ink"
                  >
                    {t('seat.viewMap')}
                  </button>
                </div>
              }
            >
              <PlazaScene
                seats={seats}
                selectedId={selectedId}
                onSelect={selectSeat}
                mode={mode}
                moveRef={moveRef}
                previewSeat={previewSeat}
                quality={quality}
              />
            </SceneBoundary>

            {!previewSeat && (
              <div className="absolute left-3 top-3 flex rounded-sm border border-paper/15 bg-ink/90 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setMode('orbit')}
                  className={`focus-ring inline-flex items-center gap-1 rounded-sm px-3 py-2.5 transition-colors ${
                    mode === 'orbit' ? 'bg-accent text-ink' : 'text-paper/60 hover:text-paper'
                  }`}
                >
                  <RotateIcon className="size-3.5" />
                  {t('seat.orbit')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('walk')}
                  className={`focus-ring inline-flex items-center gap-1 rounded-sm px-3 py-2.5 transition-colors ${
                    mode === 'walk' ? 'bg-accent text-ink' : 'text-paper/60 hover:text-paper'
                  }`}
                >
                  <CompassIcon className="size-3.5" />
                  {t('seat.walk')}
                </button>
              </div>
            )}

            {previewSeat && (
              <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-3">
                <span className="rounded-sm border border-accent/40 bg-ink/90 px-3 py-2 text-xs font-medium text-accent">
                  {t('seat.previewing')} · {t('seat.rowLabel')} {previewSeat.row} ·{' '}
                  {t('seat.numberLabel')} {previewSeat.num}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewSeat(null)}
                  className="focus-ring rounded-sm bg-accent px-3 py-2 text-xs font-semibold text-ink"
                >
                  {t('seat.exitPreview')}
                </button>
              </div>
            )}

            {mode === 'walk' && !previewSeat && <Joystick moveRef={moveRef} />}

            <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-paper/55">
              {mode === 'walk' ? t('seat.walkHint') : t('seat.dragHint')}
            </p>
          </div>
          <SeatLegend className="mt-3" />
        </>
      )}

      <div className="sticky bottom-3 mt-3 pb-[env(safe-area-inset-bottom)]">
        {selected ? (
          <div className="rounded-sm border border-paper/15 bg-ink px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs text-paper/55">{t('seat.yourSeat')}</p>
                <p className="mt-0.5 text-sm font-semibold text-paper">
                  {t('seat.rowLabel')} {selected.row} · {t('seat.numberLabel')} {selected.num}
                </p>
                <p className="mt-0.5 text-xs text-paper/55">
                  {categoryName} · {formatIdr(selected.priceIdr, lang)}
                  {selected.status !== 'available' && (
                    <span className={selected.status === 'held' ? 'text-amber-300' : 'text-paper/40'}>
                      {' '}
                      · {t(`status.${selected.status}`)}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {webglAvailable && (
                  <button
                    type="button"
                    onClick={() => {
                      setView('3d')
                      setPreviewSeat(selected)
                    }}
                    className="focus-ring inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-paper/15 px-3 py-3 text-sm font-medium text-paper/70 transition-colors hover:border-paper/30 hover:text-paper sm:flex-none"
                  >
                    <EyeIcon className="size-3.5" />
                    {t('seat.preview')}
                  </button>
                )}
                {holdExpiresAt && holdSeatId === selected.id ? (
                  <button
                    ref={holdButtonRef}
                    type="button"
                    onClick={onResume}
                    className="focus-ring flex-1 rounded-sm bg-accent px-4 py-3 text-sm font-semibold text-ink transition hover:brightness-110 sm:flex-none"
                  >
                    {t('seat.resume')}
                  </button>
                ) : (
                  <button
                    ref={holdButtonRef}
                    type="button"
                    disabled={holding || selected.status !== 'available'}
                    onClick={onHold}
                    className="focus-ring flex-1 rounded-sm bg-accent px-4 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                  >
                    {holding ? t('common.loading') : t('seat.choose')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : view === '3d' ? (
          <p className="py-3 text-center text-xs text-paper/55">{t('seat.selectFirst')}</p>
        ) : null}
      </div>
    </div>
  )
}
