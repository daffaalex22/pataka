'use client'

import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'
import { Joystick } from '@/components/scene/Joystick'
import type { MoveVector } from '@/components/scene/Character'
import { Legend } from '@/components/ui/Legend'
import { SeatMap2D } from '@/components/visitor/SeatMap2D'
import { useLang, useT } from '@/lib/i18n'
import { formatIdr, type Seat } from '@/lib/types'

const PlazaScene = dynamic(() => import('@/components/scene/PlazaScene'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-xs text-muted">Memuat venue 3D…</div>,
})

export function SeatStep({
  seats,
  categoryKey,
  selected,
  onSelect,
  onHold,
  holding,
  holdExpiresAt,
  onBack,
  onResume,
  error,
}: {
  seats: Seat[]
  categoryKey: string | null
  selected: Seat | null
  onSelect: (seat: Seat) => void
  onHold: () => void
  holding: boolean
  holdExpiresAt: string | null
  onBack: () => void
  onResume: () => void
  error: string | null
}) {
  const { lang } = useLang()
  const t = useT()
  const [view, setView] = useState<'3d' | 'map'>('3d')
  const [mode, setMode] = useState<'orbit' | 'walk'>('orbit')
  const [previewSeat, setPreviewSeat] = useState<Seat | null>(null)
  const moveRef = useRef<MoveVector>({ x: 0, y: 0 })

  const selectSeat = (seat: Seat) => {
    setPreviewSeat(null)
    onSelect(seat)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button type="button" onClick={onBack} className="text-xs text-muted transition hover:text-foreground">
            ← {t('common.back')}
          </button>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t('seat.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('seat.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Legend />
          <div className="flex rounded-full border border-line p-0.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setView('3d')}
              className={`rounded-full px-2.5 py-1 transition ${view === '3d' ? 'bg-accent text-black' : 'text-muted'}`}
            >
              {t('seat.view3d')}
            </button>
            <button
              type="button"
              onClick={() => {
                setView('map')
                setPreviewSeat(null)
              }}
              className={`rounded-full px-2.5 py-1 transition ${view === 'map' ? 'bg-accent text-black' : 'text-muted'}`}
            >
              {t('seat.viewMap')}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="relative mt-4 h-[46vh] min-h-[340px] overflow-hidden rounded-2xl border border-line bg-[#07060d] sm:h-[56vh]">
        {view === '3d' ? (
          <>
            <PlazaScene
              seats={seats}
              selectedId={selected?.id ?? null}
              onSelect={selectSeat}
              mode={mode}
              moveRef={moveRef}
              previewSeat={previewSeat}
            />

            {!previewSeat && (
              <div className="absolute left-3 top-3 flex rounded-full border border-white/15 bg-black/40 p-0.5 text-[11px] font-medium backdrop-blur">
                <button
                  type="button"
                  onClick={() => setMode('orbit')}
                  className={`rounded-full px-3 py-1.5 transition ${mode === 'orbit' ? 'bg-accent text-black' : 'text-white/70'}`}
                >
                  ⟲ {t('seat.orbit')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('walk')}
                  className={`rounded-full px-3 py-1.5 transition ${mode === 'walk' ? 'bg-accent text-black' : 'text-white/70'}`}
                >
                  ⌂ {t('seat.walk')}
                </button>
              </div>
            )}

            {previewSeat && (
              <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-3">
                <span className="rounded-full border border-accent/40 bg-black/50 px-3 py-1.5 text-[11px] font-medium text-accent backdrop-blur">
                  {t('seat.previewing')} · {previewSeat.id}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewSeat(null)}
                  className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold text-black"
                >
                  {t('seat.exitPreview')}
                </button>
              </div>
            )}

            {mode === 'walk' && !previewSeat && <Joystick moveRef={moveRef} />}

            <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[10px] text-white/45">
              {mode === 'walk' ? t('seat.walkHint') : t('seat.dragHint')}
            </p>
          </>
        ) : (
          <SeatMap2D
            seats={seats}
            categoryKey={categoryKey}
            selectedId={selected?.id ?? null}
            onSelect={selectSeat}
            stageLabel={t('seat.stage')}
          />
        )}
      </div>

      <div className="sticky bottom-3 mt-3">
        {selected ? (
          <div className="panel flex items-center justify-between gap-3 rounded-2xl border-white/15 px-4 py-3 shadow-2xl">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{t('seat.yourSeat')}</p>
              <p className="truncate text-sm font-semibold">
                {selected.id} · {lang === 'id' ? selected.categoryName : selected.categoryNameEn}
              </p>
              <p className="text-xs text-muted">{formatIdr(selected.priceIdr, lang)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setView('3d')
                  setPreviewSeat(selected)
                }}
                className="rounded-full border border-line px-3 py-2.5 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-accent"
              >
                👁 {t('seat.preview')}
              </button>
              {holdExpiresAt ? (
                <button
                  type="button"
                  onClick={onResume}
                  className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  {t('seat.resume')} →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={holding || selected.status !== 'available'}
                  onClick={onHold}
                  className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {holding ? t('common.loading') : t('seat.choose')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="py-3 text-center text-xs text-muted">{t('seat.selectFirst')}</p>
        )}
      </div>
    </div>
  )
}
