'use client'

import Link from 'next/link'
import { SeatLegend } from '@/components/visitor/SeatLegend'
import { LangToggle } from '@/components/ui/LangToggle'
import { MapIcon, RotateIcon, WalkIcon } from '@/components/ui/icons'
import { useT } from '@/lib/i18n'

export function WorldHud({
  mode,
  onMode,
  mapEnabled,
  mapOpen,
  onToggleMap,
  hint,
  onExit,
}: {
  mode: 'walk' | 'orbit'
  onMode: (mode: 'walk' | 'orbit') => void
  mapEnabled: boolean
  mapOpen: boolean
  onToggleMap: () => void
  hint: string | null
  onExit: () => void
}) {
  const t = useT()

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 text-paper">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-ink/85 via-ink/50 to-transparent"
        />

        <div className="relative flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto flex items-center gap-4">
            <Link
              href="/"
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                event.preventDefault()
                onExit()
              }}
              className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-semibold tracking-[0.22em] transition-colors hover:text-accent"
            >
              PATAKA
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
            </Link>
            <Link
              href="/deck"
              className="focus-ring hidden min-h-11 min-w-11 items-center justify-center text-xs text-paper/60 transition-colors hover:text-paper sm:inline-flex"
            >
              {t('common.deck')}
            </Link>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <Link
              href="/book"
              className="focus-ring inline-flex min-h-11 shrink-0 items-center rounded-sm border border-paper/20 px-3 text-xs font-medium text-paper/85 transition-colors hover:border-paper/40 hover:text-paper"
            >
              {t('splash.direct')}
            </Link>
            <LangToggle />
          </div>
        </div>

        <div className="relative flex justify-end px-4 pb-4">
          <div className="pointer-events-auto flex max-w-full flex-col items-end gap-2">
            <div className="grid max-w-full grid-cols-3 rounded-sm border border-paper/15 bg-ink/85">
              <button
                type="button"
                onClick={() => onMode('orbit')}
                aria-pressed={mode === 'orbit'}
                className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 px-3 text-xs font-medium transition-colors ${
                  mode === 'orbit' ? 'bg-accent text-ink' : 'text-paper/70 hover:text-paper'
                }`}
              >
                <RotateIcon className="size-4 shrink-0" />
                {t('seat.orbit')}
              </button>
              <button
                type="button"
                onClick={() => onMode('walk')}
                aria-pressed={mode === 'walk'}
                className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 border-l border-paper/15 px-3 text-xs font-medium transition-colors ${
                  mode === 'walk' ? 'bg-accent text-ink' : 'text-paper/70 hover:text-paper'
                }`}
              >
                <WalkIcon className="size-4 shrink-0" />
                {t('seat.walk')}
              </button>
              <button
                type="button"
                disabled={!mapEnabled}
                onClick={onToggleMap}
                aria-pressed={mapOpen}
                data-world-map-toggle
                className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 border-l border-paper/15 px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  mapOpen ? 'bg-accent text-ink' : 'text-paper/70 hover:text-paper'
                }`}
              >
                <MapIcon className="size-4 shrink-0" />
                {t('seat.viewMap')}
              </button>
            </div>

            <div className="max-w-full rounded-sm border border-paper/10 bg-ink/70 px-3 py-2">
              <SeatLegend className="justify-end" />
            </div>
          </div>
        </div>
      </div>

      {hint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-52 z-10 flex justify-center px-4">
          <p className="max-w-md rounded-sm border border-paper/10 bg-ink/85 px-3 py-2 text-center text-xs text-paper/80">
            {hint}
          </p>
        </div>
      )}
    </>
  )
}
